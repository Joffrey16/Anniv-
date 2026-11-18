import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { addPassword, authErrorMessage } from '../cloud';
import { colors } from '../theme';
import { GhostButton, GradientButton } from './ui';

type Props = { visible: boolean; email: string | null; cloudEnabled: boolean; hasPassword: boolean; onClose: () => void; onLogout: () => void; onLogin: () => void };

export default function AccountSheet({ visible, email, cloudEnabled, hasPassword, onClose, onLogout, onLogin }: Props) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [done, setDone] = useState(false);
  const savePassword = async () => {
    setBusy(true); setMsg(null);
    try {
      await addPassword(pw);
      setDone(true); setPw('');
      setMsg({ ok: true, text: `C'est fait ✅ Tu peux maintenant te connecter avec ${email} et ce mot de passe, y compris dans l'app installée sur iPhone.` });
    } catch (e) {
      setMsg({ ok: false, text: authErrorMessage(e) });
    } finally { setBusy(false); }
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grab} />
        <Text style={styles.title}>👤 Mon compte</Text>
        {email ? (
          <>
            <Text style={styles.email}>{email}</Text>
            <Text style={styles.ok}>☁️ Tes anniversaires sont sauvegardés en ligne et synchronisés sur tous tes appareils.</Text>
            {!hasPassword && !done && (
              <View style={styles.pwBox}>
                <Text style={styles.pwTitle}>🔑 Créer un mot de passe</Text>
                <Text style={styles.pwTxt}>Ton compte utilise Google. Ajoute un mot de passe pour te connecter aussi avec ton e-mail (indispensable dans l'app installée sur iPhone).</Text>
                <TextInput value={pw} onChangeText={setPw} placeholder="6 caractères minimum" placeholderTextColor={colors.muted} secureTextEntry
                  autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" style={styles.input} />
                <GradientButton label={busy ? 'Enregistrement…' : 'Enregistrer le mot de passe'} onPress={savePassword} disabled={busy || pw.length < 6} />
              </View>
            )}
            {msg && <Text style={[styles.msg, { color: msg.ok ? '#13705E' : '#B4232C' }]}>{msg.text}</Text>}
            <View style={{ marginTop: 18 }}><GhostButton label="Se déconnecter" onPress={onLogout} /></View>
          </>
        ) : (
          <>
            <Text style={styles.warn}>⚠️ Sans compte, tes anniversaires sont seulement sur ce téléphone : tu les perds si tu supprimes l'app ou changes de téléphone.</Text>
            {cloudEnabled && <View style={{ marginTop: 18 }}><GradientButton label="Créer un compte ou se connecter" onPress={onLogin} /></View>}
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(43,29,46,0.35)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40 },
  grab: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 14 },
  title: { fontSize: 20, fontWeight: '900', color: colors.ink },
  email: { fontSize: 16, fontWeight: '700', color: colors.ink, marginTop: 10 },
  ok: { color: '#13705E', fontWeight: '600', marginTop: 10, lineHeight: 20 },
  pwBox: { backgroundColor: '#fff', borderRadius: 18, padding: 14, marginTop: 16 },
  pwTitle: { fontSize: 16, fontWeight: '900', color: colors.ink },
  pwTxt: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 4 },
  input: { backgroundColor: colors.bg, borderRadius: 14, padding: 12, fontSize: 16, color: colors.ink, marginVertical: 10 },
  msg: { fontWeight: '600', marginTop: 12, lineHeight: 20 },
  warn: { color: '#9A5B10', fontWeight: '600', marginTop: 10, lineHeight: 20 },
});
