import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, relationMeta, shadow } from '../theme';
import { Relation } from '../types';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function GradientButton({ label, onPress, icon, disabled, colorsOverride }: { label: string; onPress: () => void; icon?: string; disabled?: boolean; colorsOverride?: readonly [string, string, ...string[]] }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [{ opacity: disabled ? 0.4 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      <LinearGradient colors={colorsOverride ?? gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gbtn}>
        <Text style={styles.gbtnText}>{icon ? `${icon}  ` : ''}{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function GhostButton({ label, onPress, color = colors.coral }: { label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.ghost, { borderColor: color, opacity: pressed ? 0.6 : 1 }]}>
      <Text style={[styles.ghostText, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress, color = colors.coral }: { label: string; active?: boolean; onPress?: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}>
      <Text style={[styles.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function RelationTag({ relation }: { relation: Relation }) {
  const m = relationMeta[relation];
  return (
    <View style={[styles.tag, { backgroundColor: m.bg }]}>
      <Text style={[styles.tagText, { color: m.color }]}>{m.label}</Text>
    </View>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={[styles.toggle, value && { backgroundColor: colors.mint }]}>
      <View style={[styles.knob, value && { transform: [{ translateX: 20 }] }]} />
    </Pressable>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 22, padding: 16, ...shadow },
  gbtn: { paddingVertical: 15, paddingHorizontal: 22, borderRadius: 18, alignItems: 'center' },
  gbtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  ghost: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 16, borderWidth: 1.5, alignItems: 'center' },
  ghostText: { fontWeight: '700', fontSize: 15 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderColor: colors.line, backgroundColor: '#fff', marginRight: 8, marginBottom: 8 },
  chipText: { color: colors.ink, fontWeight: '600' },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  tagText: { fontSize: 11, fontWeight: '700' },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: '#E5D9D0', padding: 3 },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  section: { fontSize: 13, fontWeight: '800', color: colors.muted, letterSpacing: 1, textTransform: 'uppercase', marginTop: 22, marginBottom: 10 },
});
