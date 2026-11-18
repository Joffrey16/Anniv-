import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { countdownLabel, daysUntil, formatDayMonth, sortByUpcoming, upcomingAge } from '../dates';
import { colors, gradients, shadow } from '../theme';
import { Person } from '../types';
import { Card, GhostButton, GradientButton, RelationTag, SectionTitle } from '../components/ui';
import { isIOS, isStandaloneWeb, isWeb } from '../platform';

type Props = {
  people: Person[]; onOpen: (p: Person) => void; onAdd: () => void; onImport: () => void; onWish: (p: Person) => void;
  onAccount?: () => void; account?: 'cloud' | 'local'; showAccount?: boolean;
};

export default function HomeScreen({ people, onOpen, onAdd, onImport, onWish, onAccount, account, showAccount }: Props) {
  const [q, setQ] = useState('');
  const [hideInstall, setHideInstall] = useState(false);
  const sorted = useMemo(() => sortByUpcoming(people), [people]);
  const filtered = q ? sorted.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())) : sorted;
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
          <View style={styles.search}>
            <Text style={{ fontSize: 16 }}>🔎</Text>
            <TextInput value={q} onChangeText={setQ} placeholder="Rechercher quelqu'un…" placeholderTextColor={colors.muted} style={styles.searchInput} />
          </View>
          {groups.map((g) => (
            <View key={g.title}>
              <SectionTitle>{g.title}</SectionTitle>
              {g.items.map((p) => <Row key={p.id} person={p} onPress={() => onOpen(p)} onWish={() => onWish(p)} />)}
            </View>
          ))}
          {filtered.length === 0 && <Text style={styles.none}>Personne ne s'appelle comme ça 🤔</Text>}
        </View>
      )}
    </ScrollView>
  );
}

function Hero({ person, onPress, onWish }: { person: Person; onPress: () => void; onWish: () => void }) {
  const d = daysUntil(person);
  const age = upcomingAge(person);
  return (
    <Pressable onPress={onPress} style={{ marginHorizontal: 20 }}>
      <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={styles.heroKicker}>{d === 0 ? "🎉 C'EST AUJOURD'HUI" : 'PROCHAIN ANNIVERSAIRE'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
          <View style={styles.heroEmoji}><Text style={{ fontSize: 34 }}>{person.emoji}</Text></View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.heroName} numberOfLines={1}>{person.name}</Text>
            <Text style={styles.heroSub}>{formatDayMonth(person.day, person.month)}{age ? ` · ${age} ans` : ''}</Text>
          </View>
          <View style={styles.heroCount}>
            <Text style={styles.heroDays}>{d === 0 ? '🎂' : d}</Text>
            {d > 0 && <Text style={styles.heroDaysLbl}>{d === 1 ? 'jour' : 'jours'}</Text>}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          {person.giftNeeded && (
            <View style={[styles.heroGift, { flex: 1 }]}>
              <Text style={styles.heroGiftTxt} numberOfLines={1}>🎁 {person.giftIdeas ? person.giftIdeas : 'Cadeau à prévoir'}</Text>
            </View>
          )}
          <Pressable onPress={onWish} style={({ pressed }) => [styles.heroWish, !person.giftNeeded && { flex: 1 }, pressed && { opacity: 0.8 }]}>
            <Text style={styles.heroWishTxt}>🎉 Souhaiter</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function Row({ person, onPress, onWish }: { person: Person; onPress: () => void; onWish: () => void }) {
  const d = daysUntil(person);
  const age = upcomingAge(person);
  const soon = d <= 3;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { transform: [{ scale: 0.98 }] }]}>
      <View style={styles.dateBox}>
        <Text style={styles.dateDay}>{person.day}</Text>
        <Text style={styles.dateMonth}>{['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'][person.month - 1]}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.rowName} numberOfLines={1}>{person.emoji} {person.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
          <RelationTag relation={person.relation} />
          {age ? <Text style={styles.rowAge}>{age} ans</Text> : null}
          {person.giftNeeded ? <Text style={{ fontSize: 12 }}>🎁</Text> : null}
        </View>
      </View>
      {d <= 1 && (
        <Pressable onPress={onWish} hitSlop={8} style={styles.wishBtn}><Text style={{ fontSize: 18 }}>💬</Text></Pressable>
      )}
      <View style={[styles.pill, soon && { backgroundColor: colors.coral }]}>
        <Text style={[styles.pillText, soon && { color: '#fff' }]}>{countdownLabel(d)}</Text>
      </View>
    </Pressable>
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
  wishBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#EEE9FF', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  pill: { backgroundColor: colors.soft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  pillText: { fontSize: 12, fontWeight: '800', color: colors.coral },
  none: { textAlign: 'center', color: colors.muted, marginTop: 30 },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: colors.ink, marginTop: 10, textAlign: 'center' },
  emptyTxt: { fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 21 },
});
