import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDayMonth } from '../dates';
import { pickAndParseFile, readPhoneContacts, toCandidates } from '../importers';
import { colors, gradients } from '../theme';
import { ImportCandidate, Person } from '../types';
import { Card, GradientButton, SectionTitle } from '../components/ui';
import { newId } from '../storage';
import { isIOS, isStandaloneWeb, isWeb } from '../platform';
import { exportBackup } from '../webCalendar';
import { decodeShare, shareCodeFromUrl, WEB_APP_URL } from '../share';
import { sharePeopleLink } from '../shareActions';
import { sortByUpcoming } from '../dates';
import * as Clipboard from 'expo-clipboard';

type Props = {
  people: Person[];
  onImport: (p: Person[], phones: { name: string; phone: string }[]) => void;
  onRestore: (p: Person[]) => void;
  incoming?: { from?: string; list: ImportCandidate[]; link: string } | null;
  onIncomingDone?: () => void;
};

export default function ImportScreen({ people, onImport, onRestore, incoming, onIncomingDone }: Props) {
  const [candidates, setCandidates] = useState<ImportCandidate[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [source, setSource] = useState<'contacts' | 'fichier' | 'partage'>('contacts');
  const [sharing, setSharing] = useState(false);
  const [sharedFrom, setSharedFrom] = useState<string | undefined>();
  const [sharedLink, setSharedLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const show = (list: ImportCandidate[], src: 'contacts' | 'fichier' | 'partage') => {
    setSource(src);
    setCandidates(list);
    setSelected(new Set(list.filter((c) => !c.alreadyThere).map((c) => c.key)));
    setMsg(list.length ? null : 'Aucune date d\'anniversaire trouvée 😕');
  };

  // Lien de partage reçu : on affiche directement l'écran de sélection.
  useEffect(() => {
    if (incoming) {
      setSharedFrom(incoming.from);
      setSharedLink(incoming.link);
      show(incoming.list, 'partage');
      onIncomingDone?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming]);

  const startShare = () => {
    setSharing(true);
    setSelected(new Set(people.map((p) => p.id)));
  };

  const sendShare = async () => {
    const chosen = people.filter((p) => selected.has(p.id));
    setSharing(false);
    if ((await sharePeopleLink(chosen)) === 'copie') setMsg('Lien copié ✅ Colle-le dans un message.');
  };

  const shareApp = async () => {
    const url = isWeb ? window.location.href.split('#')[0] : WEB_APP_URL;
    const message = `🎂 Je te conseille Anniv !, une app gratuite pour ne plus oublier aucun anniversaire.\nSur iPhone : ouvre ce lien dans Safari, bouton Partager › « Sur l'écran d'accueil ».\n${url}`;
    try {
      if (isWeb) {
        if (navigator.share) { await navigator.share({ text: message }); return; }
        await Clipboard.setStringAsync(message);
        setMsg('Message copié ✅ Colle-le dans une conversation.');
        return;
      }
      await Share.share({ message });
    } catch { /* annulé */ }
  };

  const fromPastedLink = async () => {
    setMsg(null);
    let text = '';
    try { text = await Clipboard.getStringAsync(); } catch { /* accès refusé */ }
    const code = shareCodeFromUrl(text);
    const shared = code ? decodeShare(code) : null;
    if (!shared) {
      setMsg('Aucun lien de partage trouvé. Fais un appui long sur le lien reçu › « Copier », puis touche à nouveau ici.');
      return;
    }
    setSharedFrom(shared.from);
    setSharedLink(null);
    show(toCandidates(shared.people, people), 'partage');
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
      if (res && 'backup' in res) {
        const known = new Set(people.map((p) => p.id));
        const fresh = res.backup.filter((p) => !known.has(p.id));
        onRestore(fresh);
        setMsg(`Sauvegarde restaurée : ${fresh.length} anniversaire${fresh.length > 1 ? 's' : ''} ajouté${fresh.length > 1 ? 's' : ''} 🎉`);
      } else if (res) show(toCandidates(res, people), 'fichier');
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
      id: newId(), name: c.name, day: c.day, month: c.month, year: c.year, phone: c.phone,
      relation: c.relation ?? 'ami', emoji: c.emoji ?? '🎂', giftNeeded: false, source,
    }));
    const phones = candidates.filter((c) => c.alreadyThere && c.phone).map((c) => ({ name: c.name, phone: c.phone! }));
    onImport(added, phones);
    setMsg(`${added.length} anniversaire${added.length > 1 ? 's' : ''} ajouté${added.length > 1 ? 's' : ''} 🎉`);
    setCandidates(null);
    setSharedFrom(undefined);
  };

  const invite = () => Share.share({
    message: "Coucou ! J'utilise Anniv ! pour ne plus jamais oublier un anniversaire 🎂 C'est quand le tien ? (jour + mois, l'année si tu veux 😉)",
  });

  if (sharing) {
    const list = sortByUpcoming(people);
    const allOn = selected.size === list.length;
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.pickHead}>
          <Pressable onPress={() => setSharing(false)}><Text style={styles.back}>‹ Retour</Text></Pressable>
          <Text style={styles.pickTitle}>Qui veux-tu partager ?</Text>
          <Pressable onPress={() => setSelected(allOn ? new Set() : new Set(list.map((p) => p.id)))}>
            <Text style={styles.back}>{allOn ? 'Aucun' : 'Tous'}</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 200 }}>
          <Text style={styles.hint}>La personne recevra un lien et choisira qui ajouter dans son app. Les idées cadeau et les notes ne sont pas partagées.</Text>
          {list.map((p) => {
            const on = selected.has(p.id);
            return (
              <Pressable key={p.id} onPress={() => toggle(p.id)} style={[styles.cand, on && { borderColor: colors.violet }]}>
                <View style={[styles.check, on && { backgroundColor: colors.violet, borderColor: colors.violet }]}>{on && <Text style={{ color: '#fff', fontWeight: '900' }}>✓</Text>}</View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.candName}>{p.emoji} {p.name}</Text>
                  <Text style={styles.candSub}>{formatDayMonth(p.day, p.month)}{p.year ? ` ${p.year}` : ''}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.footer}>
          <GradientButton label={`Envoyer le lien (${selected.size})`} icon="💌" colorsOverride={gradients.violet} onPress={sendShare} disabled={!selected.size} />
        </View>
      </View>
    );
  }

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
          {source === 'partage' && sharedLink && isWeb && isIOS && !isStandaloneWeb && (
            <View style={styles.safariTip}>
              <Text style={styles.safariTxt}>
                📲 Tu as déjà installé Anniv ! sur ton écran d'accueil ? Le lien s'est ouvert dans Safari, qui garde une liste à part. Copie le lien, ouvre l'app depuis l'icône, puis Importer › « Coller un lien reçu ».
              </Text>
              <Pressable onPress={async () => { await Clipboard.setStringAsync(sharedLink); setMsg('Lien copié ✅'); }} style={styles.safariBtn}>
                <Text style={styles.safariBtnTxt}>Copier le lien</Text>
              </Pressable>
            </View>
          )}
          {msg && source === 'partage' && <View style={styles.msg}><Text style={styles.msgTxt}>{msg}</Text></View>}
          <Text style={styles.hint}>
            {source === 'partage'
              ? `${sharedFrom ? `${sharedFrom} te partage` : 'On te partage'} ${candidates.length} anniversaire${candidates.length > 1 ? 's' : ''} 💌`
              : `${candidates.length} personne${candidates.length > 1 ? 's' : ''} trouvée${candidates.length > 1 ? 's' : ''} avec une date d'anniversaire.`}
          </Text>
          {candidates.map((c) => {
            const on = selected.has(c.key);
            return (
              <Pressable key={c.key} onPress={() => toggle(c.key)} style={[styles.cand, on && { borderColor: colors.coral }]}>
                <View style={[styles.check, on && { backgroundColor: colors.coral, borderColor: colors.coral }]}>{on && <Text style={{ color: '#fff', fontWeight: '900' }}>✓</Text>}</View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.candName}>{c.emoji ? `${c.emoji} ` : ''}{c.name}</Text>
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

      {!isWeb && <Source gradient={gradients.hero} icon="📱" title="Contacts du téléphone" desc="Les contacts qui ont une date d'anniversaire (y compris ceux synchronisés depuis Google ou iCloud)." onPress={fromContacts} />}
      <Source gradient={isWeb ? gradients.hero : gradients.violet} icon="📄" title={isWeb ? 'Mes contacts (fichier .vcf)' : 'Fichier .vcf ou .ics'} desc="Export de Google Contacts, iCloud, Outlook, ou un calendrier d'anniversaires (.ics)." onPress={fromFile} />
      {isWeb && (
        <Card style={{ marginTop: 12 }}>
          <Text style={styles.fbTitle}>📱 Récupérer les contacts de l'iPhone</Text>
          <Text style={styles.fbTxt}>
            {isIOS
              ? "Dans l'app Contacts, ouvre « Listes », fais un appui long sur « Tous les contacts » puis « Exporter » et enregistre dans Fichiers. Reviens ici, touche « Mes contacts » et choisis ce fichier."
              : "Exporte tes contacts en .vcf (contacts.google.com › Exporter › vCard, ou iCloud.com), puis touche « Mes contacts »."}
          </Text>
        </Card>
      )}
      <Source gradient={gradients.mint} icon="💌" title="Demander à mes amis" desc="Envoie un petit message (WhatsApp, Snap, SMS…) pour leur demander leur date." onPress={invite} />

      <SectionTitle>👫 Partager avec un proche</SectionTitle>
      <Source gradient={gradients.violet} icon="🔗" title="Envoyer des anniversaires" desc="Choisis des personnes de ta liste et envoie-les par lien (à ta copine, ta famille…). Elle choisira qui ajouter dans son app." onPress={() => (people.length ? startShare() : setMsg('Ajoute d\'abord des anniversaires à ta liste 😉'))} />
      <Source gradient={gradients.mint} icon="📲" title="Faire découvrir l'app" desc="Envoie le lien de l'app à ta famille ou tes amis : chacun l'installe gratuitement et a sa propre liste." onPress={shareApp} />
      <Source gradient={gradients.hero} icon="📋" title="Coller un lien reçu" desc="On t'a envoyé un lien de partage ? Copie-le, puis touche ici pour choisir qui ajouter." onPress={fromPastedLink} />

      {isWeb && (
        <>
          <SectionTitle>💾 Sauvegarde</SectionTitle>
          <Card>
            <Text style={styles.fbTxt}>Tes anniversaires restent uniquement sur ce téléphone. Fais une sauvegarde de temps en temps : touche le bouton, puis « Enregistrer dans Fichiers » (dans iCloud Drive, elle sera à l'abri même si tu changes de téléphone). Rien n'est envoyé sur internet. Pour la restaurer, touche « Mes contacts » et choisis le fichier.</Text>
            <View style={{ marginTop: 12 }}>
              <GradientButton label="Sauvegarder mes anniversaires" icon="💾" colorsOverride={gradients.mint} disabled={!people.length} onPress={() => exportBackup(people)} />
            </View>
          </Card>
        </>
      )}

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
  safariTip: { backgroundColor: '#EEE9FF', borderRadius: 16, padding: 12, marginBottom: 12 },
  safariTxt: { color: '#4B32C3', fontWeight: '600', lineHeight: 19 },
  safariBtn: { alignSelf: 'flex-start', backgroundColor: colors.violet, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, marginTop: 10 },
  safariBtnTxt: { color: '#fff', fontWeight: '800' },
  footer: { position: 'absolute', left: 20, right: 20, bottom: 100 },
});
