import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { notificationsSupported, planReminders, sendTestNotification } from '../notifications';
import { colors } from '../theme';
import { Person, ReminderKind, ReminderRule, Settings } from '../types';
import { Card, Chip, GhostButton, SectionTitle, Toggle } from '../components/ui';
import { newId } from '../storage';

type Props = { people: Person[]; settings: Settings; onChange: (s: Settings) => void; permission: boolean; onAskPermission: () => void };

const pad = (n: number) => String(n).padStart(2, '0');
const DAYS_OPTIONS = [0, 1, 2, 3, 7, 14, 30];
const dayLabel = (d: number) => (d === 0 ? 'Le jour J' : d === 1 ? 'La veille' : `J-${d}`);

export default function RemindersScreen({ people, settings, onChange, permission, onAskPermission }: Props) {
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
      {!notificationsSupported && (
        <View style={styles.warn}><Text style={styles.warnTxt}>ℹ️ Aperçu web : les notifications ne partent que sur iPhone et Android.</Text></View>
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

      <SectionTitle>Prochaines notifications</SectionTitle>
      <Card>
        {upcoming.length === 0 && <Text style={styles.note}>Rien de prévu pour l'instant.</Text>}
        {upcoming.map((n, i) => (
          <View key={i} style={[styles.upRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
            <Text style={styles.upDate}>{n.date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · {pad(n.date.getHours())}h{pad(n.date.getMinutes())}</Text>
            <Text style={styles.upTitle}>{n.title}</Text>
          </View>
        ))}
      </Card>
      {notificationsSupported && <View style={{ marginTop: 16 }}><GhostButton label="🔔  Envoyer une notification de test" onPress={sendTestNotification} color={colors.violet} /></View>}
    </ScrollView>
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
  upRow: { paddingVertical: 10 },
  upDate: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  upTitle: { color: colors.ink, fontWeight: '700', marginTop: 2 },
});
