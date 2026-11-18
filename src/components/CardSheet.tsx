// Carte d'anniversaire en image (version web) : dessinée dans un canvas puis partagée comme une photo.
import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { upcomingAge } from '../dates';
import { ageLabel, firstNameOf, kindOf } from '../insights';
import { colors } from '../theme';
import { Person } from '../types';
import { GradientButton } from './ui';

const THEMES = [
  { id: 'fiesta', label: '🎈 Fiesta', colors: ['#FF6B6B', '#FF8FAB', '#FFB37A'], ink: '#FFFFFF', deco: ['#FFD166', '#FFFFFF', '#7C5CFF', '#2EC4A6'] },
  { id: 'nuit', label: '✨ Étoiles', colors: ['#2B1D5E', '#5B3CC4', '#B57CFF'], ink: '#FFFFFF', deco: ['#FFD166', '#FFFFFF', '#FF8FAB'] },
  { id: 'menthe', label: '🌿 Douceur', colors: ['#E2F8F3', '#BDEFE4', '#FFE8D6'], ink: '#2B1D2E', deco: ['#FF6B6B', '#2EC4A6', '#FFB37A', '#7C5CFF'] },
] as const;

type Props = { person: Person | null; onClose: () => void };

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > max && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

function draw(p: Person, themeIdx: number, message: string): string {
  const W = 1080, H = 1350;
  const theme = THEMES[themeIdx];
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, W, H);
  theme.colors.forEach((col, i) => g.addColorStop(i / (theme.colors.length - 1), col));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Confettis (aléatoire mais stable pour une personne donnée)
  let seed = [...p.id].reduce((a, ch) => a + ch.charCodeAt(0), 7) + themeIdx * 101;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let i = 0; i < 70; i++) {
    ctx.save();
    ctx.globalAlpha = 0.35 + rnd() * 0.5;
    ctx.fillStyle = theme.deco[Math.floor(rnd() * theme.deco.length)];
    const x = rnd() * W, y = rnd() * H, s = 8 + rnd() * 18;
    ctx.translate(x, y); ctx.rotate(rnd() * Math.PI);
    if (themeIdx === 1 && i % 2) { ctx.beginPath(); ctx.arc(0, 0, s / 3, 0, Math.PI * 2); ctx.fill(); } else ctx.fillRect(-s / 2, -s / 4, s, s / 2);
    ctx.restore();
  }

  const font = (w: number, size: number) => `${w} ${size}px -apple-system, "SF Pro Rounded", "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const kind = kindOf(p);
  ctx.font = font(400, 260);
  ctx.fillText(kind === 'fete' ? '💐' : kind === 'couple' ? '💍' : '🎂', W / 2, 330);

  ctx.fillStyle = theme.ink;
  ctx.font = font(800, 76);
  ctx.globalAlpha = 0.92;
  ctx.fillText(kind === 'fete' ? 'Bonne fête' : 'Joyeux anniversaire', W / 2, 590);
  ctx.globalAlpha = 1;

  ctx.font = font(900, 150);
  const name = kind === 'couple' ? p.name : firstNameOf(p.name);
  const nameLines = wrap(ctx, name, W - 140).slice(0, 2);
  nameLines.forEach((l, i) => ctx.fillText(l, W / 2, 740 + i * 150));
  let y = 740 + nameLines.length * 150;

  const al = ageLabel(p, upcomingAge(p));
  if (al) {
    ctx.font = font(900, 64);
    const label = `${al} !`;
    const tw = ctx.measureText(label).width + 80;
    ctx.save();
    ctx.globalAlpha = theme.ink === '#FFFFFF' ? 0.22 : 0.9;
    ctx.fillStyle = theme.ink === '#FFFFFF' ? '#FFFFFF' : '#FFFFFF';
    const r = 50, bx = W / 2 - tw / 2, by = y - 10;
    ctx.beginPath(); ctx.roundRect(bx, by, tw, 100, r); ctx.fill();
    ctx.restore();
    ctx.fillStyle = theme.ink;
    ctx.fillText(label, W / 2, by + 52);
    y += 140;
  }

  if (message.trim()) {
    ctx.font = font(600, 50);
    ctx.globalAlpha = 0.95;
    wrap(ctx, message.trim(), W - 200).slice(0, 4).forEach((l, i) => ctx.fillText(l, W / 2, y + 40 + i * 66));
    ctx.globalAlpha = 1;
  }
  return c.toDataURL('image/png');
}

export default function CardSheet({ person, onClose }: Props) {
  const [theme, setTheme] = useState(0);
  const [message, setMessage] = useState('Passe une merveilleuse journée ✨');
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (person && typeof document !== 'undefined') setUrl(draw(person, theme, message));
  }, [person, theme, message]);

  if (!person) return null;

  const share = async () => {
    if (!url) return;
    const blob = await (await fetch(url)).blob();
    const file = new File([blob], `carte-${firstNameOf(person.name).toLowerCase()}.png`, { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return; } catch { return; }
    }
    const a = document.createElement('a');
    a.href = url; a.download = file.name; a.click();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grab} />
        <Text style={styles.title}>🖼️ Carte pour {firstNameOf(person.name)}</Text>
        {url && <Image source={{ uri: url }} style={styles.preview} resizeMode="contain" />}
        <View style={styles.themes}>
          {THEMES.map((t, i) => (
            <Pressable key={t.id} onPress={() => setTheme(i)} style={[styles.theme, theme === i && styles.themeOn]}>
              <Text style={styles.themeTxt}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput value={message} onChangeText={setMessage} placeholder="Ton petit mot (facultatif)" placeholderTextColor={colors.muted} style={styles.input} maxLength={120} />
        <View style={{ marginTop: 12 }}>
          <GradientButton label="Envoyer la carte" icon="📤" onPress={share} />
        </View>
        <Text style={styles.hint}>La carte s'envoie comme une photo : WhatsApp, Messages, Snap, Insta…</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(43,29,46,0.35)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 32 },
  grab: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 19, fontWeight: '900', color: colors.ink, marginBottom: 10 },
  preview: { width: '100%', height: 300, borderRadius: 18 },
  themes: { flexDirection: 'row', gap: 8, marginTop: 12 },
  theme: { flex: 1, paddingVertical: 9, borderRadius: 12, borderWidth: 2, borderColor: colors.line, backgroundColor: '#fff', alignItems: 'center' },
  themeOn: { borderColor: colors.coral },
  themeTxt: { fontWeight: '800', color: colors.ink, fontSize: 13 },
  input: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: colors.ink, marginTop: 12 },
  hint: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 10 },
});
