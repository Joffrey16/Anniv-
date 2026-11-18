import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { isWeb } from './platform';
import { buildShareLink, WEB_APP_URL } from './share';
import type { Person } from './types';

/** Envoie un lien de partage. Retourne 'copie' si le lien a seulement été copié (navigateur sans menu Partager). */
export async function sharePeopleLink(chosen: Person[]): Promise<'ok' | 'copie' | 'annule'> {
  const appUrl = isWeb ? window.location.href.split('#')[0] : WEB_APP_URL;
  const link = buildShareLink(chosen, appUrl);
  const what = chosen.length === 1 ? `l'anniversaire de ${chosen[0].name}` : `${chosen.length} anniversaires`;
  const message = `🎂 Je te partage ${what} pour l'app Anniv ! Ouvre ce lien et choisis qui ajouter :\n${link}`;
  try {
    if (isWeb) {
      if (navigator.share) { await navigator.share({ text: message }); return 'ok'; }
      await Clipboard.setStringAsync(message);
      return 'copie';
    }
    await Share.share({ message });
    return 'ok';
  } catch {
    return 'annule';
  }
}
