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
import { DEFAULT_SETTINGS, loadPeople, loadSettings, savePeople, saveSettings } from './src/storage';
import { ensurePermission, notificationsSupported, rescheduleAll } from './src/notifications';
import { colors, gradients, shadow } from './src/theme';
import { Person, Settings } from './src/types';

type Tab = 'home' | 'import' | 'reminders';

export default function App() {
  const [people, setPeople] = useState<Person[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>('home');
  const [editing, setEditing] = useState<Person | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [permission, setPermission] = useState(false);

  useEffect(() => {
    (async () => {
      const [p, s] = await Promise.all([loadPeople(), loadSettings()]);
      setPeople(p);
      setSettings(s);
      setLoaded(true);
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
      const id = r.notification.request.content.data?.personId;
      const p = people.find((x) => x.id === id);
      if (p) { setEditing(p); setEditorOpen(true); }
    });
    return () => sub.remove();
  }, [people]);

  const openNew = () => { setEditing(null); setEditorOpen(true); };
  const openPerson = (p: Person) => { setEditing(p); setEditorOpen(true); };
  const save = (p: Person) => {
    setPeople((prev) => (prev.some((x) => x.id === p.id) ? prev.map((x) => (x.id === p.id ? p : x)) : [...prev, p]));
    setEditorOpen(false);
  };
  const remove = (id: string) => { setPeople((prev) => prev.filter((x) => x.id !== id)); setEditorOpen(false); };
  const importMany = useCallback((list: Person[]) => setPeople((prev) => [...prev, ...list]), []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top']}>
        <StatusBar style="dark" />
        <View style={{ flex: 1 }}>
          {tab === 'home' && <HomeScreen people={people} onOpen={openPerson} onAdd={openNew} onImport={() => setTab('import')} />}
          {tab === 'import' && <ImportScreen people={people} onImport={importMany} />}
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

        <PersonEditor visible={editorOpen} initial={editing} onClose={() => setEditorOpen(false)} onSave={save} onDelete={remove} />
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
