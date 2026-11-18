import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDayMonth } from '../dates';
import { pickAndParseFile, readPhoneContacts, toCandidates } from '../importers';
import { colors, gradients } from '../theme';
import { ImportCandidate, Person } from '../types';
import { Card, GradientButton, SectionTitle } from '../components/ui';
import { newId } from '../storage';

type Props = { people: Person[]; onImport: (p: Person[]) => void };

export default function ImportScreen({ people, onImport }: Props) {
  const [candidates, setCandidates] = useState<ImportCandidate[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [source, setSource] = useState<'contacts' | 'fichier'>('contacts');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const show = (list: ImportCandidate[], src: 'contacts' | 'fichier') => {
    setSource(src);
    setCandidates(list);
    setSelected(new Set(list.filter((c) => !c.alreadyThere).map((c) => c.key)));
    setMsg(list.length ? null : 'Aucune date d\'anniversaire trouvée 😕');
  };

  const fromContacts = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await readPhoneContacts();
      if (res === 'refuse') setMsg('Accès aux contacts refusé. Tu peux l\'autoriser dans les réglages du téléphone.');
      else if (res === 'indisponible') setMsg('L\'import des contacts marche sur iPhone et Android (pas dans l\'aperçu web).');
      else show(toCandidates(res, people), 'contacts');
    } finally { setBusy(false); }
  };

  const fromFile = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await pickAndParseFile();
      if (res) show(toCandidates(res, people), 'fichier');
    } catch {
      setMsg('Impossible de lire ce fichier. Il faut un .vcf (contacts) ou un .ics (calendrier).');
    } finally { setBusy(false); }
  };

  const toggle = (k: string) => {
    const s = new Set(selected);
    s.has(k) ? s.delete(k) : s.add(k);
    setSelected(s);
  };

  const confirm = () => {
    if (!candidates) return;
    const added: Person[] = candidates.filter((c) => selected.has(c.key)).map((c) => ({
      id: newId(), name: c.name, day: c.day, month: c.month, year: c.year,
      relation: 'ami', emoji: '🎂', giftNeeded: false, source,
    }));
    onImport(added);
    setMsg(`${added.length} anniversaire${added.length > 1 ? 's' : ''} ajouté${added.length > 1 ? 's' : ''} 🎉`);
    setCandidates(null);
  };

  const invite = () => Share.share({
    message: "Coucou ! J'utilise Anniv ! pour ne plus jamais oublier un anniversaire 🎂 C'est quand le tien ? (jour + mois, l'année si tu veux 😉)",
  });

  if (candidates && candidates.length) {
    const allOn = selected.size === candidates.length;
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.pickHead}>
          <Pressable onPress={() => setCandidates(null)}><Text style={styles.back}>‹ Retour</Text></Pressable>
          <Text style={styles.pickTitle}>Qui veux-tu ajouter ?</Text>
          <Pressable onPress={() => setSelected(allOn ? new Set() : new Set(candidates.map((c) => c.key)))}>
            <Text style={styles.back}>{allOn ? 'Aucun' : 'Tous'}</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 200 }}>
          <Text style={styles.hint}>{candidates.length} personne{candidates.length > 1 ? 's' : ''} trouvée{candidates.length > 1 ? 's' : ''} avec une date d'anniversaire.</Text>
          {candidates.map((c) => {
            const on = selected.has(c.key);
            return (
              <Pressable key={c.key} onPress={() => toggle(c.key)} style={[styles.cand, on && { borderColor: colors.coral }]}>
                <View style={[styles.check, on && { backgroundColor: colors.coral, borderColor: colors.coral }]}>{on && <Text style={{ color: '#fff', fontWeight: '900' }}>✓</Text>}</View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.candName}>{c.name}</Text>
                  <Text style={styles.candSub}>{formatDayMonth(c.day, c.month)}{c.year ? ` ${c.year}` : ''}{c.alreadyThere ? ' · déjà dans ta liste' : ''}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.footer}>
          <GradientButton label={`Ajouter ${selected.size} personne${selected.size > 1 ? 's' : ''}`} onPress={confirm} disabled={!selected.size} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }}>
      <Text style={styles.title}>Importer</Text>
      <Text style={styles.sub}>Récupère les anniversaires que tu as déjà quelque part, puis choisis qui ajouter.</Text>
      {busy && <ActivityIndicator color={colors.coral} style={{ marginTop: 16 }} />}
      {msg && <View style={styles.msg}><Text style={styles.msgTxt}>{msg}</Text></View>}

      <Source gradient={gradients.hero} icon="📱" title="Contacts du téléphone" desc="Les contacts qui ont une date d'anniversaire (y compris ceux synchronisés depuis Google ou iCloud)." onPress={fromContacts} />
      <Source gradient={gradients.violet} icon="📄" title="Fichier .vcf ou .ics" desc="Export de Google Contacts, iCloud, Outlook, ou un calendrier d'anniversaires." onPress={fromFile} />
      <Source gradient={gradients.mint} icon="💌" title="Demander à mes amis" desc="Envoie un petit message (WhatsApp, Snap, SMS…) pour leur demander leur date." onPress={invite} />

      <SectionTitle>Et Facebook / Snapchat ?</SectionTitle>
      <Card>
        <Text style={styles.fbTitle}>Pas possible directement 😔</Text>
        <Text style={styles.fbTxt}>
          Facebook ne donne plus les anniversaires des amis aux applications depuis 2015, et a supprimé son export de calendrier d'anniversaires en 2019.
          Snapchat ne partage que ton nom et ton Bitmoji, jamais la liste de tes amis ni leurs dates.
        </Text>
        <Text style={[styles.fbTxt, { marginTop: 8 }]}>
          Astuce : sur Facebook, la page « Anniversaires » (facebook.com/events/birthdays) liste les dates à venir. Tu peux les saisir ici en 10 secondes chacune, ou envoyer le message « Demander à mes amis » sur Snap.
        </Text>
      </Card>
    </ScrollView>
  );
}

function Source({ gradient, icon, title, desc, onPress }: { gradient: readonly [string, string, ...string[]]; icon: string; title: string; desc: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.source, pressed && { transform: [{ scale: 0.98 }] }]}>
      <LinearGradient colors={gradient} style={styles.sourceIcon}><Text style={{ fontSize: 26 }}>{icon}</Text></LinearGradient>
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={styles.sourceTitle}>{title}</Text>
        <Text style={styles.sourceDesc}>{desc}</Text>
      </View>
      <Text style={styles.chev}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 32, fontWeight: '900', color: colors.ink, letterSpacing: -1, marginTop: 12 },
  sub: { fontSize: 15, color: colors.muted, marginTop: 4, marginBottom: 14, lineHeight: 21 },
  msg: { backgroundColor: colors.soft, borderRadius: 14, padding: 12, marginBottom: 6 },
  msgTxt: { color: colors.ink, fontWeight: '600' },
  source: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 22, padding: 14, marginTop: 12 },
  sourceIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sourceTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  sourceDesc: { fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 18 },
  chev: { fontSize: 28, color: colors.line, marginLeft: 8 },
  fbTitle: { fontWeight: '900', fontSize: 16, color: colors.ink, marginBottom: 6 },
  fbTxt: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  pickHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  back: { color: colors.coral, fontWeight: '800', fontSize: 16 },
  pickTitle: { fontWeight: '900', fontSize: 17, color: colors.ink },
  hint: { color: colors.muted, marginBottom: 12 },
  cand: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 8, borderWidth: 2, borderColor: 'transparent' },
  check: { width: 26, height: 26, borderRadius: 9, borderWidth: 2, borderColor: colors.line, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  candName: { fontWeight: '800', color: colors.ink, fontSize: 15 },
  candSub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  footer: { position: 'absolute', left: 20, right: 20, bottom: 100 },
});
