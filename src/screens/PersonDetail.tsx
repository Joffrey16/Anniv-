import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { countdownLabel, daysUntil, formatDayMonth, upcomingAge } from '../dates';
import { ageLabel, currentYearKey, eventTitle, ideasOf, isMilestone, KIND_META, kindOf, trackFor, weekdayLabel, zodiac } from '../insights';
import { colors, gradients, relationMeta, shadow } from '../theme';
import { GiftGiven, Person } from '../types';
import { Card, RelationTag, SectionTitle } from '../components/ui';
import { newId } from '../storage';
import { isWeb } from '../platform';

type Props = {
  person: Person | null;
  onClose: () => void;
  onChange: (p: Person) => void;
  onEdit: (p: Person) => void;
  onWish: (p: Person) => void;
  onCard: (p: Person) => void;
  onShare: (p: Person) => void;
};

const euro = (n: number) => `${n % 1 ? n.toFixed(2).replace('.', ',') : n} €`;

export default function PersonDetail(props: Props) {
  return (
    <Modal visible={!!props.person} animationType="slide" presentationStyle="pageSheet" onRequestClose={props.onClose}>
      {props.person && <Detail {...props} person={props.person} />}
    </Modal>
  );
}

function Detail({ person: p, onClose, onChange, onEdit, onWish, onCard, onShare }: Props & { person: Person }) {
  const [newIdea, setNewIdea] = useState('');
  const [giftText, setGiftText] = useState('');
  const [giftPrice, setGiftPrice] = useState('');

  const d = daysUntil(p);
  const age = upcomingAge(p);
  const al = ageLabel(p, age);
  const kind = kindOf(p);
  const yearKey = currentYearKey(p);
  const track = trackFor(p);
  const ideas = ideasOf(p);
  const gifts = [...(p.gifts ?? [])].sort((a, b) => b.year - a.year);
  const spent = gifts.reduce((s, g) => s + (g.price ?? 0), 0);

  const setTrack = (patch: { wished?: boolean; bought?: boolean }) =>
    onChange({ ...p, track: { ...(p.track ?? {}), [yearKey]: { ...track, ...patch } } });

  const saveIdeas = (list: typeof ideas, extra: Partial<Person> = {}) => onChange({ ...p, ideas: list, giftIdeas: undefined, ...extra });

  const addIdea = () => {
    const t = newIdea.trim();
    if (!t) return;
    saveIdeas([...ideas, { id: newId(), text: t }]);
    setNewIdea('');
  };

  // Cocher une idée = « offert cette année » : elle part dans l'historique et le cadeau est marqué acheté.
  const toggleIdea = (id: string) => {
    const idea = ideas.find((i) => i.id === id)!;
    const done = !idea.done;
    const list = ideas.map((i) => (i.id === id ? { ...i, done } : i));
    const giftId = `idea-${id}`;
    const others = (p.gifts ?? []).filter((g) => g.id !== giftId);
    const nextGifts: GiftGiven[] = done ? [...others, { id: giftId, year: Number(yearKey), text: idea.text }] : others;
    saveIdeas(list, { gifts: nextGifts, track: { ...(p.track ?? {}), [yearKey]: { ...track, bought: done ? true : track.bought } } });
  };

  const removeIdea = (id: string) => saveIdeas(ideas.filter((i) => i.id !== id));

  const addGift = () => {
    const t = giftText.trim();
    if (!t) return;
    const price = parseFloat(giftPrice.replace(',', '.'));
    onChange({ ...p, gifts: [...(p.gifts ?? []), { id: newId(), year: Number(yearKey), text: t, price: isNaN(price) ? undefined : price }] });
    setGiftText('');
    setGiftPrice('');
  };

  const removeGift = (id: string) => onChange({ ...p, gifts: (p.gifts ?? []).filter((g) => g.id !== id) });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.top}>
          <Pressable onPress={onClose} hitSlop={10}><Text style={styles.topBtn}>‹ Retour</Text></Pressable>
          <Pressable onPress={() => onEdit(p)} hitSlop={10}><Text style={[styles.topBtn, { color: colors.coral }]}>Modifier</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <LinearGradient colors={kind === 'couple' ? gradients.violet : kind === 'fete' ? gradients.mint : gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.emoji}><Text style={{ fontSize: 40 }}>{p.emoji}</Text></View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.kind}>{KIND_META[kind].emoji} {kind === 'autre' && p.label ? p.label : KIND_META[kind].label}</Text>
                <Text style={styles.name}>{p.name}</Text>
                <Text style={styles.date}>{formatDayMonth(p.day, p.month)} · {weekdayLabel(p)}</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statBig}>{d === 0 ? '🎉' : d}</Text>
                <Text style={styles.statLbl}>{d === 0 ? "c'est aujourd'hui" : d === 1 ? 'jour' : 'jours'}</Text>
              </View>
              {al ? (
                <View style={styles.stat}>
                  <Text style={styles.statBig}>{age}</Text>
                  <Text style={styles.statLbl}>{al.replace(/^\d+\s*/, '')}</Text>
                </View>
              ) : null}
              {kind === 'anniversaire' && (
                <View style={styles.stat}>
                  <Text style={styles.statBig}>{zodiac(p.day, p.month).emoji}</Text>
                  <Text style={styles.statLbl}>{zodiac(p.day, p.month).name}</Text>
                </View>
              )}
            </View>
            {isMilestone(age) && <Text style={styles.milestone}>✨ {al} : un anniversaire important, marque le coup !</Text>}
          </LinearGradient>

          <View style={styles.actions}>
            <Action icon="🎉" label="Souhaiter" onPress={() => onWish(p)} />
            {isWeb && <Action icon="🖼️" label="Carte" onPress={() => onCard(p)} />}
            <Action icon="🔗" label="Partager" onPress={() => onShare(p)} />
          </View>

          <SectionTitle>Cette année ({yearKey})</SectionTitle>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Check label="Souhaité" icon="🎂" on={!!track.wished} onPress={() => setTrack({ wished: !track.wished })} />
            <Check label="Cadeau acheté" icon="🎁" on={!!track.bought} onPress={() => setTrack({ bought: !track.bought })} />
          </View>

          <SectionTitle>💡 Idées cadeau</SectionTitle>
          <Card>
            {ideas.length === 0 && <Text style={styles.muted}>Note ici les idées qui te passent par la tête, même des mois avant.</Text>}
            {ideas.map((i) => (
              <View key={i.id} style={styles.ideaRow}>
                <Pressable testID={`idea-${i.id}`} onPress={() => toggleIdea(i.id)} style={[styles.box, i.done && styles.boxOn]} hitSlop={6}>
                  {i.done && <Text style={styles.boxTick}>✓</Text>}
                </Pressable>
                <Text style={[styles.ideaTxt, i.done && styles.ideaDone]}>{i.text}{i.done ? '  · offert' : ''}</Text>
                <Pressable onPress={() => removeIdea(i.id)} hitSlop={8}><Text style={styles.del}>✕</Text></Pressable>
              </View>
            ))}
            <View style={styles.addRow}>
              <TextInput value={newIdea} onChangeText={setNewIdea} onSubmitEditing={addIdea} placeholder="Ajouter une idée…" placeholderTextColor={colors.muted} style={styles.addInput} returnKeyType="done" />
              <Pressable onPress={addIdea} style={styles.addBtn}><Text style={styles.addBtnTxt}>＋</Text></Pressable>
            </View>
            {ideas.length > 0 && <Text style={styles.hint}>Coche une idée quand tu l'as offerte : elle rejoint l'historique.</Text>}
          </Card>

          <SectionTitle>🎁 Cadeaux offerts</SectionTitle>
          <Card>
            {gifts.length === 0 && <Text style={styles.muted}>Garde une trace de ce que tu as offert, pour ne jamais offrir deux fois la même chose.</Text>}
            {gifts.map((g) => (
              <View key={g.id} style={styles.giftRow}>
                <Text style={styles.giftYear}>{g.year}</Text>
                <Text style={styles.giftTxt}>{g.text}</Text>
                {g.price != null && <Text style={styles.giftPrice}>{euro(g.price)}</Text>}
                <Pressable onPress={() => removeGift(g.id)} hitSlop={8}><Text style={styles.del}>✕</Text></Pressable>
              </View>
            ))}
            <View style={styles.addRow}>
              <TextInput value={giftText} onChangeText={setGiftText} placeholder={`Cadeau ${yearKey}`} placeholderTextColor={colors.muted} style={styles.addInput} />
              <TextInput value={giftPrice} onChangeText={setGiftPrice} placeholder="Prix" placeholderTextColor={colors.muted} keyboardType="decimal-pad" style={[styles.addInput, { flex: 0, width: 70, marginLeft: 8 }]} />
              <Pressable onPress={addGift} style={styles.addBtn}><Text style={styles.addBtnTxt}>＋</Text></Pressable>
            </View>
            {spent > 0 && <Text style={styles.hint}>Total offert : {euro(spent)}</Text>}
          </Card>

          {(p.notes || p.phone) && (
            <>
              <SectionTitle>📝 Infos</SectionTitle>
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <RelationTag relation={p.relation} />
                  {p.year ? <Text style={styles.muted}>Depuis {p.year}</Text> : null}
                </View>
                {p.phone ? <Text style={styles.info}>📱 {p.phone}</Text> : null}
                {p.notes ? <Text style={styles.info}>{p.notes}</Text> : null}
              </Card>
            </>
          )}
          <Text style={styles.footer}>{eventTitle(p)} · {countdownLabel(d)} · {relationMeta[p.relation].label}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Action({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, pressed && { transform: [{ scale: 0.96 }] }]}>
      <Text style={{ fontSize: 24 }}>{icon}</Text>
      <Text style={styles.actionLbl}>{label}</Text>
    </Pressable>
  );
}

function Check({ label, icon, on, onPress }: { label: string; icon: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.check, on && styles.checkOn]}>
      <Text style={{ fontSize: 20 }}>{on ? '✅' : icon}</Text>
      <Text style={[styles.checkLbl, on && { color: '#13705E' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  topBtn: { fontSize: 16, fontWeight: '800', color: colors.muted },
  hero: { borderRadius: 28, padding: 20, ...shadow, shadowOpacity: 0.2 },
  emoji: { width: 72, height: 72, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  kind: { color: 'rgba(255,255,255,0.9)', fontWeight: '800', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  name: { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 2 },
  date: { color: 'rgba(255,255,255,0.92)', fontSize: 15, fontWeight: '600', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  stat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 16, paddingVertical: 10, alignItems: 'center' },
  statBig: { color: '#fff', fontSize: 24, fontWeight: '900' },
  statLbl: { color: 'rgba(255,255,255,0.92)', fontSize: 12, fontWeight: '700', marginTop: 2 },
  milestone: { color: '#fff', fontWeight: '800', marginTop: 14, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 10, overflow: 'hidden' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  action: { flex: 1, backgroundColor: '#fff', borderRadius: 18, paddingVertical: 12, alignItems: 'center', ...shadow, shadowOpacity: 0.05 },
  actionLbl: { fontWeight: '800', color: colors.ink, marginTop: 4, fontSize: 13 },
  check: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 14, borderWidth: 2, borderColor: colors.line },
  checkOn: { borderColor: colors.mint, backgroundColor: '#E2F8F3' },
  checkLbl: { fontWeight: '800', color: colors.ink },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 10 },
  ideaRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  box: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  boxOn: { backgroundColor: colors.mint, borderColor: colors.mint },
  boxTick: { color: '#fff', fontWeight: '900', fontSize: 13 },
  ideaTxt: { flex: 1, color: colors.ink, fontSize: 15, fontWeight: '600' },
  ideaDone: { color: colors.muted, textDecorationLine: 'line-through' },
  del: { color: colors.muted, fontSize: 14, paddingHorizontal: 6 },
  addRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  addInput: { flex: 1, minWidth: 0, backgroundColor: colors.bg, borderRadius: 12, borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.ink },
  addBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  addBtnTxt: { color: '#fff', fontSize: 22, fontWeight: '900' },
  giftRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 10 },
  giftYear: { fontWeight: '900', color: colors.violet, width: 44 },
  giftTxt: { flex: 1, color: colors.ink, fontWeight: '600' },
  giftPrice: { color: colors.muted, fontWeight: '700' },
  info: { color: colors.ink, marginTop: 8, lineHeight: 20 },
  footer: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 24 },
});
