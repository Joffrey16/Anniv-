import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { buildMessage } from '../message';
import { Channel, sendWish } from '../messaging';
import { upcomingAge } from '../dates';
import { colors } from '../theme';
import { Person } from '../types';

type Props = { person: Person | null; template: string; onClose: () => void; onUsed: (p: Person, channel: Channel) => void };

const CHANNELS: { id: Channel; label: string; icon: string; color: string; prefill: boolean }[] = [
  { id: 'sms', label: 'SMS', icon: '💬', color: '#34C759', prefill: true },
  { id: 'whatsapp', label: 'WhatsApp', icon: '🟢', color: '#25D366', prefill: true },
  { id: 'messenger', label: 'Messenger', icon: '🔵', color: '#0084FF', prefill: false },
  { id: 'snapchat', label: 'Snapchat', icon: '👻', color: '#E6C800', prefill: false },
  { id: 'instagram', label: 'Instagram', icon: '📸', color: '#E1306C', prefill: false },
  { id: 'autre', label: 'Autre…', icon: '↗️', color: colors.violet, prefill: true },
];

export default function WishSheet({ person, template, onClose, onUsed }: Props) {
  const [text, setText] = useState('');
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (person) {
      setText(buildMessage(template, person, upcomingAge(person)));
      setInfo(null);
    }
  }, [person, template]);

  if (!person) return null;

  const go = async (c: Channel) => {
    const handle = c === 'messenger' ? person.messenger : c === 'snapchat' ? person.snapchat : undefined;
    const res = await sendWish(c, text, person.phone, handle);
    if (res === 'echec') {
      setInfo("Impossible d'ouvrir cette app. Est-elle installée ?");
      return;
    }
    onUsed(person, c);
    if (res === 'copie') {
      setInfo(c === 'snapchat' && person.snapchat
        ? 'Message copié ✅ Sur son profil Snap, touche « Chat », puis appui long, « Coller » et envoie. Si Snap affiche une erreur, son nom d\'utilisateur est sûrement faux (corrige-le dans sa fiche).'
        : 'Message copié ✅ Dans la conversation, fais un appui long puis « Coller », et envoie !');
    }
    else onClose();
  };

  const sorted = person.preferredChannel
    ? [...CHANNELS].sort((a, b) => (a.id === person.preferredChannel ? -1 : b.id === person.preferredChannel ? 1 : 0))
    : CHANNELS;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.grab} />
          <Text style={styles.title}>🎉 Souhaiter à {person.name}</Text>
          <TextInput value={text} onChangeText={setText} multiline style={styles.input} />
          {!person.phone && <Text style={styles.hint}>Astuce : ajoute son numéro dans sa fiche pour ouvrir directement sa conversation SMS ou WhatsApp.</Text>}
          {info && <View style={styles.info}><Text style={styles.infoTxt}>{info}</Text></View>}
          <View style={styles.grid}>
            {sorted.map((c) => (
              <Pressable key={c.id} onPress={() => go(c.id)} style={({ pressed }) => [styles.btn, { borderColor: c.color }, pressed && { opacity: 0.7 }]}>
                <Text style={{ fontSize: 22 }}>{c.icon}</Text>
                <Text style={styles.btnLbl}>{c.label}</Text>
                <Text style={styles.btnSub}>{c.prefill ? (c.id === 'autre' ? 'choisir une app' : 'texte pré-rempli') : 'copier-coller'}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(43,29,46,0.35)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 36 },
  grab: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 14 },
  title: { fontSize: 20, fontWeight: '900', color: colors.ink, marginBottom: 12 },
  input: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1.5, borderColor: colors.line, padding: 14, fontSize: 15, color: colors.ink, minHeight: 96, textAlignVertical: 'top' },
  hint: { color: colors.muted, fontSize: 13, marginTop: 8 },
  info: { backgroundColor: '#E2F8F3', borderRadius: 14, padding: 12, marginTop: 10 },
  infoTxt: { color: '#13705E', fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  btn: { width: '31%', backgroundColor: '#fff', borderRadius: 18, borderWidth: 2, paddingVertical: 12, alignItems: 'center' },
  btnLbl: { fontWeight: '800', color: colors.ink, marginTop: 4 },
  btnSub: { fontSize: 10, color: colors.muted, fontWeight: '600', marginTop: 1 },
});
