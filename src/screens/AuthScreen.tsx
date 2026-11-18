import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { authErrorMessage, resetPassword, signIn } from '../cloud';
import { colors, gradients, shadow } from '../theme';
import { GradientButton } from '../components/ui';

type Props = { onSkip: () => void; localCount: number };

export default function AuthScreen({ onSkip, localCount }: Props) {
  const [mode, setMode] = useState<'create' | 'login'>('create');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true); setError(null); setInfo(null);
    try {
      await signIn(email, password, mode === 'create');
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    setError(null); setInfo(null);
    if (!email.trim()) { setError("Indique d'abord ton e-mail ci-dessus."); return; }
    try {
      await resetPassword(email);
      setInfo('E-mail envoyé 📩 Suis le lien reçu pour choisir un nouveau mot de passe.');
    } catch (e) {
      setError(authErrorMessage(e));
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Text style={{ fontSize: 64 }}>🎂</Text>
          <Text style={styles.title}>Anniv !</Text>
          <Text style={styles.sub}>Ne plus jamais oublier un anniversaire</Text>
        </LinearGradient>

        <View style={styles.card}>
          <View style={styles.tabs}>
            {(['create', 'login'] as const).map((m) => (
              <Pressable key={m} onPress={() => { setMode(m); setError(null); setInfo(null); }} style={[styles.tab, mode === m && styles.tabOn]}>
                <Text style={[styles.tabTxt, mode === m && { color: colors.ink }]}>{m === 'create' ? 'Créer un compte' : 'Se connecter'}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>E-mail</Text>
          <TextInput value={email} onChangeText={setEmail} placeholder="toi@exemple.fr" placeholderTextColor={colors.muted}
            autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" style={styles.input} />
          <Text style={styles.label}>Mot de passe</Text>
          <TextInput value={password} onChangeText={setPassword} placeholder={mode === 'create' ? '6 caractères minimum' : 'Ton mot de passe'} placeholderTextColor={colors.muted}
            secureTextEntry autoCapitalize="none" autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
            textContentType={mode === 'create' ? 'newPassword' : 'password'} style={styles.input} onSubmitEditing={submit} />

          {error && <Text style={styles.error}>{error}</Text>}
          {info && <Text style={styles.info}>{info}</Text>}

          <View style={{ marginTop: 16 }}>
            {busy ? <ActivityIndicator color={colors.coral} style={{ padding: 14 }} /> : (
              <GradientButton label={mode === 'create' ? 'Créer mon compte' : 'Me connecter'} onPress={submit} disabled={!email || !password} />
            )}
          </View>
          {mode === 'login' && (
            <Pressable onPress={forgot} style={{ marginTop: 14, alignSelf: 'center' }}>
              <Text style={styles.link}>Mot de passe oublié ?</Text>
            </Pressable>
          )}
          <Text style={styles.note}>
            ☁️ Tes anniversaires sont sauvegardés en ligne et retrouvés sur tous tes appareils. Personne d'autre ne peut les voir.
            {localCount === 1 ? "\nL'anniversaire déjà saisi sur ce téléphone sera ajouté à ton compte." : localCount > 1 ? `\nLes ${localCount} anniversaires déjà saisis sur ce téléphone seront ajoutés à ton compte.` : ''}
          </Text>
        </View>

        <Pressable onPress={onSkip} style={{ alignSelf: 'center', padding: 18 }}>
          <Text style={styles.skip}>Continuer sans compte</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: 48, paddingBottom: 64, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  title: { color: '#fff', fontSize: 40, fontWeight: '900', letterSpacing: -1, marginTop: 4 },
  sub: { color: 'rgba(255,255,255,0.92)', fontSize: 16, fontWeight: '600', marginTop: 4 },
  card: { backgroundColor: '#fff', marginHorizontal: 20, marginTop: -36, borderRadius: 26, padding: 20, ...shadow },
  tabs: { flexDirection: 'row', backgroundColor: colors.soft, borderRadius: 14, padding: 4, marginBottom: 6 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  tabOn: { backgroundColor: '#fff', ...shadow, shadowOpacity: 0.06 },
  tabTxt: { fontWeight: '800', color: colors.muted },
  label: { fontWeight: '800', color: colors.ink, marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: colors.bg, borderRadius: 14, borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.ink },
  error: { color: colors.coral, fontWeight: '700', marginTop: 12 },
  info: { color: '#13705E', fontWeight: '700', marginTop: 12 },
  link: { color: colors.violet, fontWeight: '800' },
  note: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 16, textAlign: 'center' },
  skip: { color: colors.muted, fontWeight: '700', textDecorationLine: 'underline' },
});
