import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { DEFAULT_WISH_TEMPLATE } from '../message';
import { exportToCalendar } from '../webCalendar';
import { isIOS } from '../platform';
import { GradientButton } from '../components/ui';
import { gradients } from '../theme';
import { notificationsSupported, sendTestNotification } from '../notifications';
import { planReminders } from '../reminderPlan';
import { disablePush, enablePush, pushConfigured, PushStatus, pushStatus, testPush } from '../push';
import { colors } from '../theme';
import { Person, ReminderKind, ReminderRule, Settings } from '../types';
import { Card, Chip, GhostButton, SectionTitle, Toggle } from '../components/ui';
import { newId } from '../storage';

type Props = { people: Person[]; settings: Settings; onChange: (s: Settings) => void; permission: boolean; onAskPermission: () => void; uid: string | null; cloud: boolean };

const pad = (n: number) => String(n).padStart(2, '0');
const DAYS_OPTIONS = [0, 1, 2, 3, 7, 14, 30];
const dayLabel = (d: number) => (d === 0 ? 'Le jour J' : d === 1 ? 'La veille' : `J-${d}`);

export default function RemindersScreen({ people, settings, onChange, permission, onAskPermission, uid, cloud }: Props) {
  const upcoming = useMemo(() => planReminders(people, settings).slice(0, 5), [people, settings]);

  const update = (id: string, patch: Partial<ReminderRule>) =>
    onChange({ ...settings, reminders: settings.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const remove = (id: string) => onChange({ ...settings, reminders: settings.reminders.filter((r) => r.id !== id) });
  const add = (kind: ReminderKind) =>
    onChange({ ...settings, reminders: [...settings.reminders, { id: newId(), kind, daysBefore: kind === 'cadeau' ? 14 : 0, hour: kind === 'cadeau' ? 18 : 9, minute: 0, enabled: true }] });

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }}>
      <Text style={styles.title}>Rappels</Text>
      <Text style={styles.sub}>Choisis quand tu veux être prévenu, pour acheter un cadeau ou pour souhaiter l'anniversaire.</Text>

      {notificationsSupported && !permission && (
        <Pressable onPress={onAskPermission} style={styles.warn}>
          <Text style={styles.warnTxt}>🔕 Les notifications sont désactivées. Touche ici pour les activer.</Text>
        </Pressable>
      )}
      {pushConfigured && <PushCard uid={uid} cloud={cloud} />}
      {!notificationsSupported && (
        <Card style={{ marginTop: 16 }}>
          <Text style={styles.calTitle}>{pushConfigured ? '📅 Ou dans ton calendrier' : '📅 Recevoir les rappels'}</Text>
          <Text style={styles.calTxt}>
            Règle tes rappels ci-dessous, puis ajoute-les au calendrier de ton téléphone : c'est lui qui t'enverra les alertes, même si l'app est fermée.
          </Text>
          <View style={{ marginTop: 12 }}>
            <GradientButton label="Ajouter au calendrier" icon="📅" colorsOverride={gradients.violet} disabled={people.length === 0} onPress={() => exportToCalendar(people, settings)} />
          </View>
          <Text style={styles.calHint}>
            {isIOS
              ? "Sur iPhone : touche « Tout ajouter » et choisis un calendrier « Anniversaires » (crée-le dans l'app Calendrier). Après des changements, supprime ce calendrier puis ajoute-le à nouveau."
              : "Ouvre le fichier téléchargé avec ton agenda (Google Agenda, Outlook…). Après des changements, refais l'export."}
          </Text>
        </Card>
      )}

      {(['cadeau', 'souhaiter'] as ReminderKind[]).map((kind) => (
        <View key={kind}>
          <SectionTitle>{kind === 'cadeau' ? '🎁 Acheter un cadeau' : '🎂 Souhaiter l\'anniversaire'}</SectionTitle>
          {kind === 'cadeau' && <Text style={styles.note}>Seulement pour les personnes où « Je prévois un cadeau » est activé.</Text>}
          {settings.reminders.filter((r) => r.kind === kind).map((r) => (
            <Card key={r.id} style={{ marginBottom: 10, opacity: r.enabled ? 1 : 0.6 }}>
              <View style={styles.ruleHead}>
                <Text style={styles.ruleTitle}>{dayLabel(r.daysBefore)} à {pad(r.hour)}h{pad(r.minute)}</Text>
                <Toggle value={r.enabled} onChange={(v) => update(r.id, { enabled: v })} />
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
                {DAYS_OPTIONS.map((d) => <Chip key={d} label={dayLabel(d)} active={r.daysBefore === d} onPress={() => update(r.id, { daysBefore: d })} color={kind === 'cadeau' ? colors.violet : colors.coral} />)}
              </View>
              <View style={styles.timeRow}>
                <Text style={styles.timeLbl}>Heure</Text>
                <Stepper value={`${pad(r.hour)}h${pad(r.minute)}`}
                  onMinus={() => { const t = (r.hour * 60 + r.minute - 30 + 1440) % 1440; update(r.id, { hour: Math.floor(t / 60), minute: t % 60 }); }}
                  onPlus={() => { const t = (r.hour * 60 + r.minute + 30) % 1440; update(r.id, { hour: Math.floor(t / 60), minute: t % 60 }); }} />
                <Pressable onPress={() => remove(r.id)} style={{ marginLeft: "auto" }}><Text style={styles.del}>Supprimer</Text></Pressable>
              </View>
            </Card>
          ))}
          <Pressable onPress={() => add(kind)} style={styles.addRule}><Text style={styles.addRuleTxt}>＋ Ajouter un rappel</Text></Pressable>
        </View>
      ))}

      <SectionTitle>✍️ Mon message d'anniversaire</SectionTitle>
      <Card>
        <TextInput value={settings.wishTemplate} onChangeText={(t) => onChange({ ...settings, wishTemplate: t })} multiline style={styles.tpl} />
        <Text style={styles.note}>Touche pour insérer :</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {[['{prenom}', 'Prénom'], ['{nom}', 'Nom complet'], ['{age}', 'Âge']].map(([tag, lbl]) => (
            <Chip key={tag} label={`+ ${lbl}`} onPress={() => onChange({ ...settings, wishTemplate: `${settings.wishTemplate} ${tag}`.trim() })} color={colors.violet} />
          ))}
          <Chip label="↺ Par défaut" onPress={() => onChange({ ...settings, wishTemplate: DEFAULT_WISH_TEMPLATE })} />
        </View>
        <Text style={styles.note}>Le bouton « Souhaiter » ouvre ce message, prêt à envoyer par SMS, WhatsApp, Messenger…</Text>
      </Card>

      <SectionTitle>{notificationsSupported ? 'Prochaines notifications' : 'Prochains rappels'}</SectionTitle>
      <Card>
        {upcoming.length === 0 && <Text style={styles.note}>Rien de prévu pour l'instant.</Text>}
        {upcoming.map((n, i) => (
          <View key={i} style={[styles.upRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
            <Text style={styles.upDate}>{new Date(n.at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · {pad(new Date(n.at).getHours())}h{pad(new Date(n.at).getMinutes())}</Text>
            <Text style={styles.upTitle}>{n.title}</Text>
          </View>
        ))}
      </Card>
      {notificationsSupported && <View style={{ marginTop: 16 }}><GhostButton label="🔔  Envoyer une notification de test" onPress={sendTestNotification} color={colors.violet} /></View>}
    </ScrollView>
  );
}

function PushCard({ uid, cloud }: { uid: string | null; cloud: boolean }) {
  const [status, setStatus] = useState<PushStatus | 'loading'>('loading');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => { pushStatus().then(setStatus).catch(() => setStatus('unsupported')); }, []);

  const fail = (e: unknown) => setMsg(`Impossible pour l'instant (${e instanceof Error ? e.message : String(e)}). Réessaie dans un moment.`);
  const enable = () => {
    if (!uid) return;
    setBusy(true); setMsg('');
    // enablePush demande l'autorisation tout de suite : Safari l'exige pendant l'appui.
    enablePush(uid).then((st) => {
      setStatus(st);
      if (st === 'on') setMsg('C\'est activé ! Touche « Tester » pour vérifier.');
    }).catch(fail).finally(() => setBusy(false));
  };
  const disable = () => {
    if (!uid) return;
    setBusy(true); setMsg('');
    disablePush(uid).then(() => setStatus('off')).catch(fail).finally(() => setBusy(false));
  };
  const test = () => {
    if (!uid) return;
    setMsg('');
    testPush(uid).then(() => setMsg('Une notification vient de s\'afficher. Une 2e va arriver du serveur de rappels d\'ici 15 minutes : si tu la reçois, tout fonctionne 🎉')).catch(fail);
  };

  let body: React.ReactNode = null;
  if (!uid) {
    body = <Text style={styles.calTxt}>{cloud ? 'Connecte-toi à ton compte (bouton 👤 sur l\'accueil) pour recevoir les rappels en notification.' : 'Les notifications ont besoin d\'un compte.'}</Text>;
  } else if (status === 'needs-install') {
    body = <Text style={styles.calTxt}>Sur iPhone, les notifications marchent quand l'app est sur l'écran d'accueil : dans Safari, touche Partager ⬆️ puis « Sur l'écran d'accueil », et ouvre Anniv ! depuis son icône.</Text>;
  } else if (status === 'unsupported') {
    body = <Text style={styles.calTxt}>Ce navigateur ne gère pas les notifications. Utilise l'ajout au calendrier ci-dessous.</Text>;
  } else if (status === 'denied') {
    body = <Text style={styles.calTxt}>Les notifications sont bloquées pour Anniv !. {isIOS ? 'Sur iPhone : Réglages › Notifications › Anniv ! › Autoriser les notifications.' : 'Autorise-les dans les réglages du navigateur pour ce site.'}</Text>;
  } else if (status === 'on') {
    body = (
      <>
        <Text style={styles.pushOn}>✅ Activées sur cet appareil</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
          <View style={{ flex: 1 }}><GhostButton label="🔔  Tester" onPress={test} color={colors.violet} /></View>
          <Pressable onPress={disable} disabled={busy} style={{ marginLeft: 16 }}><Text style={styles.del}>Désactiver</Text></Pressable>
        </View>
      </>
    );
  } else if (status === 'off') {
    body = (
      <View style={{ marginTop: 12 }}>
        <GradientButton label={busy ? 'Activation…' : 'Activer les notifications'} icon="🔔" disabled={busy} onPress={enable} />
      </View>
    );
  }
  return (
    <Card style={{ marginTop: 16 }}>
      <Text style={styles.calTitle}>🔔 Notifications sur ce téléphone</Text>
      <Text style={styles.calTxt}>Les rappels réglés plus bas arrivent en notification à l'heure choisie (à quelques minutes près), même app fermée.</Text>
      {body}
      {msg ? <Text style={styles.calHint}>{msg}</Text> : null}
    </Card>
  );
}

function Stepper({ value, onMinus, onPlus }: { value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onMinus} style={styles.stepBtn}><Text style={styles.stepTxt}>−</Text></Pressable>
      <Text style={styles.stepVal}>{value}</Text>
      <Pressable onPress={onPlus} style={styles.stepBtn}><Text style={styles.stepTxt}>+</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 32, fontWeight: '900', color: colors.ink, letterSpacing: -1, marginTop: 12 },
  sub: { fontSize: 15, color: colors.muted, marginTop: 4, lineHeight: 21 },
  warn: { backgroundColor: '#FFF1DE', borderRadius: 14, padding: 12, marginTop: 14 },
  warnTxt: { color: '#9A5B10', fontWeight: '700' },
  note: { color: colors.muted, fontSize: 13, marginBottom: 10 },
  ruleHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ruleTitle: { fontSize: 18, fontWeight: '900', color: colors.ink },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  timeLbl: { color: colors.muted, fontWeight: '700', marginRight: 10 },
  del: { color: colors.muted, fontWeight: "600" },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.soft, borderRadius: 14 },
  stepBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  stepTxt: { fontSize: 18, fontWeight: '900', color: colors.coral },
  stepVal: { fontWeight: '800', color: colors.ink, minWidth: 54, textAlign: 'center' },
  addRule: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line, borderRadius: 18, padding: 14, alignItems: 'center' },
  addRuleTxt: { color: colors.muted, fontWeight: '800' },
  tpl: { backgroundColor: colors.bg, borderRadius: 14, padding: 12, fontSize: 15, color: colors.ink, minHeight: 80, textAlignVertical: 'top', marginBottom: 10 },
  calTitle: { fontSize: 17, fontWeight: '900', color: colors.ink },
  calTxt: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 6 },
  calHint: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 10 },
  upRow: { paddingVertical: 10 },
  pushOn: { color: colors.mint, fontWeight: '900', fontSize: 15, marginTop: 10 },
  upDate: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  upTitle: { color: colors.ink, fontWeight: '700', marginTop: 2 },
});
