import { Platform } from 'react-native';
import { buildIcs } from './calendar';
import type { Person, Settings } from './types';

async function deliver(file: File): Promise<void> {
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  const standalone = (navigator as unknown as { standalone?: boolean }).standalone || matchMedia('(display-mode: standalone)').matches;
  if (standalone && nav.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: file.name }); return; } catch { /* annulé : on tente le lien */ }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/** Sauvegarde complète (à garder dans Fichiers / iCloud Drive), restaurable depuis « Importer ». */
export async function exportBackup(people: Person[]): Promise<void> {
  const json = JSON.stringify({ app: 'anniv', version: 1, date: new Date().toISOString(), people }, null, 2);
  await deliver(new File([json], `anniv-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`, { type: 'application/json' }));
}

/** Ouvre le fichier .ics : sur iPhone, Safari propose « Tout ajouter » au Calendrier. */
export async function exportToCalendar(people: Person[], settings: Settings): Promise<'ok' | 'indisponible'> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return 'indisponible';
  const ics = buildIcs(people, settings);
  // Dans l'app installée sur l'écran d'accueil, le partage est plus fiable qu'un téléchargement.
  await deliver(new File([ics], 'anniversaires.ics', { type: 'text/calendar' }));
  return 'ok';
}
