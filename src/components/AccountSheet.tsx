import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { GhostButton, GradientButton } from './ui';

type Props = { visible: boolean; email: string | null; cloudEnabled: boolean; onClose: () => void; onLogout: () => void; onLogin: () => void };

export default function AccountSheet({ visible, email, cloudEnabled, onClose, onLogout, onLogin }: Props) {
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
  warn: { color: '#9A5B10', fontWeight: '600', marginTop: 10, lineHeight: 20 },
});
