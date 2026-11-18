import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { countdownLabel, daysUntil, formatDayMonth, MONTHS, sortByUpcoming, upcomingAge } from '../dates';
import { ageLabel, giftBudget, isMilestone, kindOf, KIND_META, openIdeasText, perMonth, trackFor } from '../insights';
import { colors, gradients, shadow } from '../theme';
import { Person } from '../types';
import { Card, GhostButton, GradientButton, RelationTag, SectionTitle } from '../components/ui';
import { isIOS, isStandaloneWeb, isWeb } from '../platform';

type Props = {
  people: Person[]; onOpen: (p: Person) => void; onAdd: () => void; onImport: () => void; onWish: (p: Person) => void;
  onAccount?: () => void; account?: 'cloud' | 'local'; showAccount?: boolean;
};

type Filter = 'tous' | 'famille' | 'ami' | 'collegue' | 'cadeau' | 'fetes';
const FILTERS: { id: Filter; label: string; test: (p: Person) => boolean }[] = [
  { id: 'tous', label: 'Tous', test: () => true },
  { id: 'famille', label: '👨‍👩‍👧 Famille', test: (p) => p.relation === 'famille' },
  { id: 'ami', label: '💜 Amis', test: (p) => p.relation === 'ami' },
  { id: 'collegue', label: '💼 Collègues', test: (p) => p.relation === 'collegue' },
  { id: 'cadeau', label: '🎁 Cadeau à trouver', test: (p) => p.giftNeeded && !trackFor(p).bought },
  { id: 'fetes', label: '🌸💍 Fêtes & couples', test: (p) => kindOf(p) !== 'anniversaire' },
];

export default function HomeScreen({ people, onOpen, onAdd, onImport, onWish, onAccount, account, showAccount }: Props) {
  const [q, setQ] = useState('');
  const [hideInstall, setHideInstall] = useState(false);
  const [filter, setFilter] = useState<Filter>('tous');
  const [view, setView] = useState<'liste' | 'annee'>('liste');
  const sorted = useMemo(() => sortByUpcoming(people), [people]);
  const filtered = sorted.filter((p) => (!q || p.name.toLowerCase().includes(q.toLowerCase())) && FILTERS.find((f) => f.id === filter)!.test(p));
  const next = sorted[0];

  const groups = useMemo(() => {
    const g: { title: string; items: Person[] }[] = [
      { title: 'Cette semaine', items: [] },
      { title: 'Ce mois-ci', items: [] },
      { title: 'Les 3 prochains mois', items: [] },
      { title: 'Plus tard', items: [] },
    ];
    for (const p of filtered) {
      const d = daysUntil(p);
      (d < 7 ? g[0] : d < 31 ? g[1] : d < 92 ? g[2] : g[3]).items.push(p);
    }
    return g.filter((x) => x.items.length);
  }, [filtered]);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { flexDirection: 'row', alignItems: 'flex-end' }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>Coucou 👋</Text>
          <Text style={styles.title}>Anniv !</Text>
        </View>
        {showAccount && (
          <Pressable onPress={onAccount} style={[styles.account, account === 'local' && { backgroundColor: '#FFF1DE' }]} accessibilityLabel="Mon compte">
            <Text style={{ fontSize: 20 }}>{account === 'cloud' ? '👤' : '⚠️'}</Text>
            <Text style={styles.accountTxt}>{account === 'cloud' ? 'Compte' : 'Pas de compte'}</Text>
          </Pressable>
        )}
      </View>

      {isWeb && isIOS && !isStandaloneWeb && !hideInstall && (
        <Pressable onPress={() => setHideInstall(true)} style={styles.install}>
          <Text style={styles.installTxt}>📲 Installe l'app : touche le bouton Partager <Text style={{ fontWeight: '900' }}>⬆︎</Text> puis « Sur l'écran d'accueil ».</Text>
          <Text style={styles.installX}>✕</Text>
        </Pressable>
      )}
      {next ? <Hero person={next} onPress={() => onOpen(next)} onWish={() => onWish(next)} /> : <Empty onAdd={onAdd} onImport={onImport} />}

      {people.length > 0 && (
        <View style={{ paddingHorizontal: 20 }}>
          <View style={styles.viewToggle}>
            {(['liste', 'annee'] as const).map((v) => (
              <Pressable key={v} onPress={() => setView(v)} style={[styles.viewBtn, view === v && styles.viewBtnOn]}>
                <Text style={[styles.viewTxt, view === v && { color: colors.ink }]}>{v === 'liste' ? '📋 À venir' : '🗓️ Mon année'}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.search}>
            <Text style={{ fontSize: 16 }}>🔎</Text>
            <TextInput value={q} onChangeText={setQ} placeholder="Rechercher quelqu'un…" placeholderTextColor={colors.muted} style={styles.searchInput} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12, marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            {FILTERS.map((f) => (
              <Pressable key={f.id} onPress={() => setFilter(f.id)} style={[styles.filter, filter === f.id && styles.filterOn]}>
                <Text style={[styles.filterTxt, filter === f.id && { color: '#fff' }]}>{f.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {view === 'liste' ? groups.map((g) => (
            <View key={g.title}>
              <SectionTitle>{g.title}</SectionTitle>
              {g.items.map((p) => <Row key={p.id} person={p} onPress={() => onOpen(p)} onWish={() => onWish(p)} />)}
            </View>
          )) : <YearView people={filtered} onOpen={onOpen} />}
          {filter === 'tous' && !q && <Stats people={people} />}
          {filtered.length === 0 && <Text style={styles.none}>Personne ne s'appelle comme ça 🤔</Text>}
        </View>
      )}
    </ScrollView>
  );
}

function Hero({ person, onPress, onWish }: { person: Person; onPress: () => void; onWish: () => void }) {
  const d = daysUntil(person);
  const age = upcomingAge(person);
  const al = ageLabel(person, age);
  const track = trackFor(person);
  const ideas = openIdeasText(person);
  const kindLbl = kindOf(person) === 'fete' ? 'PROCHAINE FÊTE' : kindOf(person) === 'couple' ? 'PROCHAIN ANNIVERSAIRE DE COUPLE' : 'PROCHAIN ANNIVERSAIRE';
  return (
    <Pressable onPress={onPress} style={{ marginHorizontal: 20 }}>
      <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={styles.heroKicker}>{d === 0 ? "🎉 C'EST AUJOURD'HUI" : kindLbl}{isMilestone(age) ? ' · ✨ ÂGE ROND' : ''}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
          <View style={styles.heroEmoji}><Text style={{ fontSize: 34 }}>{person.emoji}</Text></View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.heroName} numberOfLines={1}>{person.name}</Text>
            <Text style={styles.heroSub}>{formatDayMonth(person.day, person.month)}{al ? ` · ${al}` : ''}</Text>
          </View>
          <View style={styles.heroCount}>
            <Text style={styles.heroDays}>{d === 0 ? '🎂' : d}</Text>
            {d > 0 && <Text style={styles.heroDaysLbl}>{d === 1 ? 'jour' : 'jours'}</Text>}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          {person.giftNeeded && (
            <View style={[styles.heroGift, { flex: 1 }]}>
              <Text style={styles.heroGiftTxt} numberOfLines={1}>{track.bought ? '✅ Cadeau acheté' : `🎁 ${ideas || 'Cadeau à trouver'}`}</Text>
            </View>
          )}
          <Pressable onPress={onWish} style={({ pressed }) => [styles.heroWish, !person.giftNeeded && { flex: 1 }, pressed && { opacity: 0.8 }]}>
            <Text style={styles.heroWishTxt}>{track.wished ? '✅ Souhaité' : '🎉 Souhaiter'}</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function Row({ person, onPress, onWish }: { person: Person; onPress: () => void; onWish: () => void }) {
  const d = daysUntil(person);
  const age = upcomingAge(person);
  const al = ageLabel(person, age);
  const soon = d <= 3;
  const track = trackFor(person);
  const k = kindOf(person);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { transform: [{ scale: 0.98 }] }]}>
      <View style={styles.dateBox}>
        <Text style={styles.dateDay}>{person.day}</Text>
        <Text style={styles.dateMonth}>{['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'][person.month - 1]}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.rowName} numberOfLines={1}>{person.emoji} {person.name}{k !== 'anniversaire' ? ` ${KIND_META[k].emoji}` : ''}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
          <RelationTag relation={person.relation} />
          {al ? <Text style={[styles.rowAge, isMilestone(age) && styles.milestone]}>{isMilestone(age) ? '✨ ' : ''}{al}</Text> : null}
          {person.giftNeeded ? <Text style={{ fontSize: 12 }}>{track.bought ? '✅🎁' : '🎁'}</Text> : null}
          {track.wished ? <Text style={{ fontSize: 12 }}>✅🎂</Text> : null}
        </View>
      </View>
      {d <= 1 && !track.wished && (
        <Pressable onPress={onWish} hitSlop={8} style={styles.wishBtn}><Text style={{ fontSize: 18 }}>💬</Text></Pressable>
      )}
      <View style={[styles.pill, soon && { backgroundColor: colors.coral }]}>
        <Text style={[styles.pillText, soon && { color: '#fff' }]}>{countdownLabel(d)}</Text>
      </View>
    </Pressable>
  );
}

function YearView({ people, onOpen }: { people: Person[]; onOpen: (p: Person) => void }) {
  const now = new Date().getMonth();
  const months = Array.from({ length: 12 }, (_, i) => (now + i) % 12);
  return (
    <View style={{ marginTop: 8 }}>
      {months.map((m) => {
        const list = people.filter((p) => p.month === m + 1).sort((a, b) => a.day - b.day);
        return (
          <View key={m} style={styles.monthCard}>
            <View style={styles.monthHead}>
              <Text style={styles.monthName}>{MONTHS[m]}</Text>
              <Text style={styles.monthCount}>{list.length ? `${list.length} 🎉` : '—'}</Text>
            </View>
            {list.map((p) => (
              <Pressable key={p.id} onPress={() => onOpen(p)} style={styles.monthRow}>
                <Text style={styles.monthDay}>{p.day}</Text>
                <Text style={styles.monthPerson} numberOfLines={1}>{p.emoji} {p.name}{kindOf(p) !== 'anniversaire' ? ` ${KIND_META[kindOf(p)].emoji}` : ''}</Text>
                {trackFor(p).wished ? <Text>✅</Text> : null}
              </Pressable>
            ))}
          </View>
        );
      })}
    </View>
  );
}

function Stats({ people }: { people: Person[] }) {
  if (people.length < 2) return null;
  const counts = perMonth(people);
  const max = Math.max(...counts);
  const busiest = counts.indexOf(max);
  const year = new Date().getFullYear();
  const budget = giftBudget(people, year);
  const milestones = people.filter((p) => isMilestone(upcomingAge(p)) && daysUntil(p) < 366).length;
  const wished = people.filter((p) => trackFor(p).wished).length;
  return (
    <>
      <SectionTitle>📊 Ton année</SectionTitle>
      <Card>
        <View style={styles.bars}>
          {counts.map((c, i) => (
            <View key={i} style={styles.barCol}>
              <View style={[styles.bar, { height: 6 + (max ? (c / max) * 54 : 0) }, i === busiest && { backgroundColor: colors.coral }]} />
              <Text style={styles.barLbl}>{MONTHS[i][0].toUpperCase()}</Text>
            </View>
          ))}
        </View>
        <View style={styles.statGrid}>
          <StatBox big={String(people.length)} label="dans ta liste" />
          <StatBox big={MONTHS[busiest]} label={`mois le + chargé (${max})`} />
          <StatBox big={String(milestones)} label="âges ronds cette année" />
          <StatBox big={budget.count ? `${Math.round(budget.total)} €` : String(wished)} label={budget.count ? `${budget.count} cadeau${budget.count > 1 ? 'x' : ''} en ${year}` : 'déjà souhaités'} />
        </View>
      </Card>
    </>
  );
}

function StatBox({ big, label }: { big: string; label: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statBig} numberOfLines={1}>{big}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

function Empty({ onAdd, onImport }: { onAdd: () => void; onImport: () => void }) {
  return (
    <Card style={{ marginHorizontal: 20, alignItems: 'center', paddingVertical: 32 }}>
      <Text style={{ fontSize: 56 }}>🎈</Text>
      <Text style={styles.emptyTitle}>Aucun anniversaire pour l'instant</Text>
      <Text style={styles.emptyTxt}>Ajoute tes proches un par un, ou importe-les depuis ton téléphone en quelques secondes.</Text>
      <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 18 }}>
        <GradientButton label="Ajouter quelqu'un" icon="＋" onPress={onAdd} />
        <GhostButton label="📲  Importer mes contacts" onPress={onImport} color={colors.violet} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  hello: { fontSize: 16, color: colors.muted, fontWeight: '600' },
  title: { fontSize: 36, fontWeight: '900', color: colors.ink, letterSpacing: -1 },
  account: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 10, marginBottom: 6, ...shadow, shadowOpacity: 0.06 },
  accountTxt: { fontSize: 10, fontWeight: '800', color: colors.muted, marginTop: 1 },
  install: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 14, backgroundColor: '#EEE9FF', borderRadius: 16, padding: 12 },
  installTxt: { flex: 1, color: '#4B32C3', fontWeight: '700', lineHeight: 19 },
  installX: { color: '#4B32C3', fontWeight: '900', marginLeft: 8 },
  hero: { borderRadius: 28, padding: 20, ...shadow, shadowOpacity: 0.25, shadowColor: '#FF6B6B' },
  heroKicker: { color: 'rgba(255,255,255,0.9)', fontWeight: '800', fontSize: 12, letterSpacing: 1.5 },
  heroEmoji: { width: 64, height: 64, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  heroName: { color: '#fff', fontSize: 24, fontWeight: '900' },
  heroSub: { color: 'rgba(255,255,255,0.92)', fontSize: 15, fontWeight: '600', marginTop: 2 },
  heroCount: { backgroundColor: '#fff', borderRadius: 18, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', minWidth: 62 },
  heroDays: { fontSize: 26, fontWeight: '900', color: colors.coral },
  heroDaysLbl: { fontSize: 11, fontWeight: '700', color: colors.muted, marginTop: -2 },
  heroWish: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center' },
  heroWishTxt: { color: colors.coral, fontWeight: '900' },
  heroGift: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 14, padding: 10 },
  heroGiftTxt: { color: '#fff', fontWeight: '700' },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, marginTop: 18, borderWidth: 1.5, borderColor: colors.line },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 12, paddingHorizontal: 10, fontSize: 15, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 12, marginBottom: 10, ...shadow, shadowOpacity: 0.05 },
  dateBox: { width: 52, height: 56, borderRadius: 16, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontSize: 22, fontWeight: '900', color: colors.coral, lineHeight: 24 },
  dateMonth: { fontSize: 10, fontWeight: '800', color: colors.muted, letterSpacing: 1 },
  rowName: { fontSize: 16, fontWeight: '800', color: colors.ink },
  rowAge: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  viewToggle: { flexDirection: 'row', backgroundColor: colors.soft, borderRadius: 14, padding: 4, marginTop: 18 },
  viewBtn: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center' },
  viewBtnOn: { backgroundColor: '#fff', ...shadow, shadowOpacity: 0.06 },
  viewTxt: { fontWeight: '800', color: colors.muted },
  filter: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.line },
  filterOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterTxt: { fontWeight: '700', color: colors.ink, fontSize: 13 },
  milestone: { color: '#B7791F', fontWeight: '800' },
  monthCard: { backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 10 },
  monthHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  monthName: { fontSize: 16, fontWeight: '900', color: colors.ink, textTransform: 'capitalize' },
  monthCount: { color: colors.muted, fontWeight: '700' },
  monthRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 },
  monthDay: { width: 28, fontWeight: '900', color: colors.coral, fontSize: 15 },
  monthPerson: { flex: 1, color: colors.ink, fontWeight: '600' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 78 },
  barCol: { alignItems: 'center', flex: 1 },
  bar: { width: 14, borderRadius: 7, backgroundColor: '#FFD0C2' },
  barLbl: { fontSize: 10, color: colors.muted, fontWeight: '700', marginTop: 4 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 8 },
  statBox: { width: '48%', backgroundColor: colors.bg, borderRadius: 14, padding: 10 },
  statBig: { fontSize: 18, fontWeight: '900', color: colors.ink, textTransform: 'capitalize' },
  statLbl: { fontSize: 12, color: colors.muted, fontWeight: '600', marginTop: 2 },
  wishBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#EEE9FF', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  pill: { backgroundColor: colors.soft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  pillText: { fontSize: 12, fontWeight: '800', color: colors.coral },
  none: { textAlign: 'center', color: colors.muted, marginTop: 30 },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: colors.ink, marginTop: 10, textAlign: 'center' },
  emptyTxt: { fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 21 },
});
