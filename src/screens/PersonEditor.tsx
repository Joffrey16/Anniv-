import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { daysInMonth, MONTHS_SHORT } from '../dates';
import { colors, EMOJIS, relationMeta } from '../theme';
import { Person, Relation } from '../types';
import { Chip, GhostButton, GradientButton, SectionTitle, Toggle } from '../components/ui';
import { newId } from '../storage';

type Props = { visible: boolean; initial?: Person | null; onClose: () => void; onSave: (p: Person) => void; onDelete: (id: string) => void };

export default function PersonEditor(props: Props) {
  // On remonte le formulaire à chaque ouverture pour repartir des bonnes valeurs.
  return (
    <Modal visible={props.visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={props.onClose}>
      {props.visible && <Form key={props.initial?.id ?? 'new'} {...props} />}
    </Modal>
  );
}

function Form({ initial, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [day, setDay] = useState<number | null>(initial?.day ?? null);
  const [month, setMonth] = useState<number | null>(initial?.month ?? null);
  const [year, setYear] = useState(initial?.year ? String(initial.year) : '');
  const [relation, setRelation] = useState<Relation>(initial?.relation ?? 'ami');
  const [emoji, setEmoji] = useState(initial?.emoji ?? '🎂');
  const [giftNeeded, setGiftNeeded] = useState(initial?.giftNeeded ?? true);
  const [giftIdeas, setGiftIdeas] = useState(initial?.giftIdeas ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const maxDay = month ? daysInMonth(month) : 31;
  const yearNum = year ? parseInt(year, 10) : undefined;
  const yearOk = !year || (yearNum! > 1900 && yearNum! <= new Date().getFullYear());
  const valid = name.trim().length > 0 && day && month && day <= maxDay && yearOk;

  const save = () => {
    if (!valid) return;
    onSave({
      id: initial?.id ?? newId(),
      name: name.trim(), day: day!, month: month!, year: yearNum,
      relation, emoji, giftNeeded, giftIdeas: giftIdeas.trim() || undefined, notes: notes.trim() || undefined,
      source: initial?.source ?? 'manuel',
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.top}>
          <Pressable onPress={onClose}><Text style={styles.cancel}>Annuler</Text></Pressable>
          <Text style={styles.topTitle}>{initial ? 'Modifier' : 'Nouvel anniversaire'}</Text>
          <Pressable onPress={save} disabled={!valid}><Text style={[styles.ok, !valid && { opacity: 0.3 }]}>OK</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <View style={styles.nameRow}>
            <View style={styles.bigEmoji}><Text style={{ fontSize: 36 }}>{emoji}</Text></View>
            <TextInput value={name} onChangeText={setName} placeholder="Prénom Nom" placeholderTextColor={colors.muted} style={styles.nameInput} autoFocus={!initial} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            {EMOJIS.map((e) => (
              <Pressable key={e} onPress={() => setEmoji(e)} style={[styles.emojiBtn, e === emoji && styles.emojiActive]}>
                <Text style={{ fontSize: 22 }}>{e}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <SectionTitle>Mois</SectionTitle>
          <View style={styles.grid}>
            {MONTHS_SHORT.map((m, i) => (
              <Pressable key={m} onPress={() => setMonth(i + 1)} style={[styles.monthCell, month === i + 1 && styles.cellActive]}>
                <Text style={[styles.cellTxt, month === i + 1 && { color: '#fff' }]}>{m}</Text>
              </Pressable>
            ))}
          </View>

          <SectionTitle>Jour</SectionTitle>
          <View style={styles.grid}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
              const disabled = d > maxDay;
              return (
                <Pressable key={d} disabled={disabled} onPress={() => setDay(d)} style={[styles.dayCell, day === d && styles.cellActive, disabled && { opacity: 0.2 }]}>
                  <Text style={[styles.cellTxt, day === d && { color: '#fff' }]}>{d}</Text>
                </Pressable>
              );
            })}
          </View>

          <SectionTitle>Année de naissance (facultatif)</SectionTitle>
          <TextInput value={year} onChangeText={(t) => setYear(t.replace(/\D/g, '').slice(0, 4))} placeholder="ex. 1994 — pour afficher l'âge" placeholderTextColor={colors.muted} keyboardType="number-pad" style={[styles.input, !yearOk && { borderColor: colors.coral }]} />

          <SectionTitle>C'est qui ?</SectionTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {(Object.keys(relationMeta) as Relation[]).map((r) => (
              <Chip key={r} label={relationMeta[r].label} active={relation === r} color={relationMeta[r].color} onPress={() => setRelation(r)} />
            ))}
          </View>

          <SectionTitle>Cadeau</SectionTitle>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>🎁 Je prévois un cadeau</Text>
              <Text style={styles.switchSub}>Active les rappels « acheter un cadeau » pour cette personne</Text>
            </View>
            <Toggle value={giftNeeded} onChange={setGiftNeeded} />
          </View>
          {giftNeeded && (
            <TextInput value={giftIdeas} onChangeText={setGiftIdeas} placeholder="Idées cadeau (livre, resto, vinyle…)" placeholderTextColor={colors.muted} style={[styles.input, { marginTop: 10 }]} />
          )}

          <SectionTitle>Notes</SectionTitle>
          <TextInput value={notes} onChangeText={setNotes} placeholder="Ses goûts, sa pointure…" placeholderTextColor={colors.muted} multiline style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]} />

          <View style={{ marginTop: 26, gap: 10 }}>
            <GradientButton label={initial ? 'Enregistrer' : 'Ajouter'} onPress={save} disabled={!valid} />
            {initial && <GhostButton label="Supprimer" onPress={() => onDelete(initial.id)} />}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  cancel: { color: colors.muted, fontSize: 16, fontWeight: '600' },
  topTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  ok: { color: colors.coral, fontSize: 16, fontWeight: '900' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  bigEmoji: { width: 64, height: 64, borderRadius: 22, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  nameInput: { flex: 1, minWidth: 0, width: 0, marginLeft: 14, fontSize: 24, fontWeight: '800', color: colors.ink, paddingVertical: 10 },
  emojiBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 6, backgroundColor: '#fff' },
  emojiActive: { backgroundColor: colors.soft, borderWidth: 2, borderColor: colors.coral },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthCell: { width: '23%', paddingVertical: 11, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', borderWidth: 1.5, borderColor: colors.line },
  dayCell: { width: '12%', aspectRatio: 1, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.line },
  cellActive: { backgroundColor: colors.coral, borderColor: colors.coral },
  cellTxt: { fontWeight: '700', color: colors.ink },
  input: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.ink },
  switchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 14, gap: 12 },
  switchTitle: { fontWeight: '800', color: colors.ink, fontSize: 15 },
  switchSub: { color: colors.muted, fontSize: 13, marginTop: 2 },
});
