import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import HomeScreen from './src/screens/HomeScreen';
import ImportScreen from './src/screens/ImportScreen';
import RemindersScreen from './src/screens/RemindersScreen';
import PersonEditor from './src/screens/PersonEditor';
import WishSheet from './src/components/WishSheet';
import CardSheet from './src/components/CardSheet';
import PersonDetail from './src/screens/PersonDetail';
import { sharePeopleLink } from './src/shareActions';
import { currentYearKey, trackFor } from './src/insights';
import { DEFAULT_SETTINGS, loadPeople, loadSettings, savePeople, saveSettings } from './src/storage';
import { ensurePermission, notificationsSupported, rescheduleAll } from './src/notifications';
import { colors, gradients, shadow } from './src/theme';
import { ImportCandidate, Person, Settings } from './src/types';
import { decodeShare, shareCodeFromUrl } from './src/share';
import { toCandidates } from './src/importers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthScreen from './src/screens/AuthScreen';
import AccountSheet from './src/components/AccountSheet';
import { cloudEnabled } from './src/cloud';
import { useCloudSync } from './src/useCloudSync';

const LOCAL_MODE_KEY = 'anniv.localmode';

type Tab = 'home' | 'import' | 'reminders';

export default function App() {
  const [people, setPeople] = useState<Person[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>('home');
  const [editing, setEditing] = useState<Person | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [cardFor, setCardFor] = useState<Person | null>(null);
  const [permission, setPermission] = useState(false);
  const [wishFor, setWishFor] = useState<Person | null>(null);
  const [incoming, setIncoming] = useState<{ from?: string; list: ImportCandidate[]; link: string } | null>(null);
  const [localMode, setLocalMode] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { user, logout } = useCloudSync({ loaded, people, settings, setPeople, setSettings });

  useEffect(() => {
    (async () => {
      const [p, s, lm] = await Promise.all([loadPeople(), loadSettings(), AsyncStorage.getItem(LOCAL_MODE_KEY).catch(() => null)]);
      setLocalMode(lm === '1');
      setPeople(p);
      setSettings(s);
      setLoaded(true);
      // Lien de partage ouvert (version web) : #partage=…
      if (typeof window !== 'undefined' && window.location?.hash) {
        const code = shareCodeFromUrl(window.location.href);
        const shared = code ? decodeShare(code) : null;
        if (shared) {
          setIncoming({ from: shared.from, list: toCandidates(shared.people, p), link: window.location.href });
          setTab('import');
        }
        if (code) window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      if (notificationsSupported) setPermission(await ensurePermission());
    })();
  }, []);

  // Sauvegarde + reprogrammation des rappels à chaque changement.
  useEffect(() => {
    if (!loaded) return;
    savePeople(people);
    saveSettings(settings);
    rescheduleAll(people, settings);
  }, [people, settings, loaded, permission]);

  // Au retour dans l'app, on reprogramme (fenêtre glissante des 60 prochains rappels).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active' && loaded) rescheduleAll(people, settings);
    });
    return () => sub.remove();
  }, [people, settings, loaded]);

  // Toucher une notification ouvre la fiche de la personne.
  useEffect(() => {
    if (!notificationsSupported) return;
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const { personId, kind } = (r.notification.request.content.data ?? {}) as { personId?: string; kind?: string };
      const p = people.find((x) => x.id === personId);
      if (!p) return;
      if (kind === 'souhaiter') setWishFor(p);
      else setDetailId(p.id);
    });
    return () => sub.remove();
  }, [people]);

  const openNew = () => { setEditing(null); setEditorOpen(true); };
  const openPerson = (p: Person) => setDetailId(p.id);
  const detailPerson = detailId ? people.find((x) => x.id === detailId) ?? null : null;
  const updatePerson = (p: Person) => setPeople((prev) => prev.map((x) => (x.id === p.id ? p : x)));
  const editFromDetail = (p: Person) => { setDetailId(null); setTimeout(() => { setEditing(p); setEditorOpen(true); }, 350); };
  const markWished = (p: Person, channel: Person['preferredChannel']) => setPeople((prev) => prev.map((x) => {
    if (x.id !== p.id) return x;
    const key = currentYearKey(x);
    return { ...x, preferredChannel: channel, track: { ...(x.track ?? {}), [key]: { ...trackFor(x), wished: true } } };
  }));
  const save = (p: Person) => {
    const existing = people.some((x) => x.id === p.id);
    setPeople((prev) => (prev.some((x) => x.id === p.id) ? prev.map((x) => (x.id === p.id ? p : x)) : [...prev, p]));
    setEditorOpen(false);
    if (existing) setTimeout(() => setDetailId(p.id), 350); // retour à la fiche après modification
  };
  const remove = (id: string) => { setPeople((prev) => prev.filter((x) => x.id !== id)); setEditorOpen(false); };
  const importMany = useCallback((list: Person[], phones: { name: string; phone: string }[]) => setPeople((prev) => {
    // Complète le numéro des personnes déjà présentes qui n'en avaient pas.
    const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const byName = new Map(phones.map((x) => [norm(x.name), x.phone]));
    const updated = prev.map((p) => (!p.phone && byName.has(norm(p.name)) ? { ...p, phone: byName.get(norm(p.name)) } : p));
    return [...updated, ...list];
  }), []);
  const skipAccount = () => { setLocalMode(true); AsyncStorage.setItem(LOCAL_MODE_KEY, '1'); };
  const askLogin = () => { setAccountOpen(false); setLocalMode(false); AsyncStorage.removeItem(LOCAL_MODE_KEY); };
  const doLogout = async () => {
    setAccountOpen(false);
    await logout();
    // Le téléphone est vidé : les anniversaires restent dans le compte.
    setPeople([]);
    setSettings(DEFAULT_SETTINGS);
    setTab('home');
  };
  const wish = (p: Person) => { setEditorOpen(false); setTimeout(() => setWishFor(p), 350); };

  if (cloudEnabled && (user === undefined || !loaded)) {
    return <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}><Text style={{ fontSize: 56 }}>🎂</Text></View>;
  }
  if (cloudEnabled && user === null && !localMode) {
    return (
      <SafeAreaProvider>
        <View style={styles.root}><StatusBar style="light" /><AuthScreen onSkip={skipAccount} localCount={people.length} /></View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top']}>
        <StatusBar style="dark" />
        <View style={{ flex: 1 }}>
          {tab === 'home' && <HomeScreen people={people} onOpen={openPerson} onAdd={openNew} onImport={() => setTab('import')} onWish={setWishFor} onAccount={() => setAccountOpen(true)} account={user ? 'cloud' : 'local'} showAccount={cloudEnabled} />}
          {tab === 'import' && <ImportScreen people={people} onImport={importMany} onRestore={(list) => setPeople((prev) => [...prev, ...list])} incoming={incoming} onIncomingDone={() => setIncoming(null)} />}
          {tab === 'reminders' && (
            <RemindersScreen people={people} settings={settings} onChange={setSettings} permission={permission}
              onAskPermission={async () => setPermission(await ensurePermission())} />
          )}
        </View>

        <View style={styles.tabbar}>
          <TabBtn icon="🎂" label="À venir" active={tab === 'home'} onPress={() => setTab('home')} />
          <TabBtn icon="📲" label="Importer" active={tab === 'import'} onPress={() => setTab('import')} />
          <Pressable onPress={openNew} style={({ pressed }) => [styles.fabWrap, pressed && { transform: [{ scale: 0.94 }] }]}>
            <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fab}>
              <Text style={styles.fabTxt}>＋</Text>
            </LinearGradient>
          </Pressable>
          <TabBtn icon="🔔" label="Rappels" active={tab === 'reminders'} onPress={() => setTab('reminders')} />
        </View>

        <PersonDetail person={detailPerson} onClose={() => setDetailId(null)} onChange={updatePerson} onEdit={editFromDetail}
          onWish={setWishFor} onCard={setCardFor} onShare={(p) => { sharePeopleLink([p]); }} />
        <PersonEditor visible={editorOpen} initial={editing} onClose={() => setEditorOpen(false)} onSave={save} onDelete={remove} onWish={wish} />
        <AccountSheet visible={accountOpen} email={user?.email ?? null} cloudEnabled={cloudEnabled} onClose={() => setAccountOpen(false)} onLogout={doLogout} onLogin={askLogin} />
        <WishSheet person={wishFor} template={settings.wishTemplate} onClose={() => setWishFor(null)}
          onUsed={markWished} />
        {cardFor && <CardSheet person={cardFor} onClose={() => setCardFor(null)} />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function TabBtn({ icon, label, active, onPress }: { icon: string; label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.tab}>
      <Text style={{ fontSize: 22, opacity: active ? 1 : 0.45 }}>{icon}</Text>
      <Text style={[styles.tabLbl, active && { color: colors.coral }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  tabbar: { position: 'absolute', left: 16, right: 16, bottom: 24, height: 70, borderRadius: 26, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', ...shadow, shadowOpacity: 0.12 },
  tab: { alignItems: 'center', flex: 1 },
  tabLbl: { fontSize: 11, fontWeight: '800', color: colors.muted, marginTop: 2 },
  fabWrap: { marginTop: -34 },
  fab: { width: 62, height: 62, borderRadius: 22, alignItems: 'center', justifyContent: 'center', ...shadow, shadowColor: '#FF6B6B', shadowOpacity: 0.4 },
  fabTxt: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: -2 },
});
