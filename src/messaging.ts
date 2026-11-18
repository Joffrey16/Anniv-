import { Linking, Share } from 'react-native';
import { isIOS, isWeb } from './platform';
import * as Clipboard from 'expo-clipboard';
import { smsUrl, snapUrls, whatsappUrl } from './message';

export type Channel = 'sms' | 'whatsapp' | 'messenger' | 'snapchat' | 'instagram' | 'autre';

async function tryOpen(urls: string[]): Promise<boolean> {
  if (isWeb) {
    // Navigateur : impossible de savoir si l'app est installée, on ouvre le premier lien.
    const u = urls[0];
    if (u.startsWith('http')) window.open(u, '_blank');
    else window.location.href = u;
    return true;
  }
  for (const u of urls) {
    try {
      await Linking.openURL(u);
      return true;
    } catch {
      // app absente : on essaie le lien suivant
    }
  }
  return false;
}

/**
 * Ouvre la conversation avec le texte déjà écrit quand l'app le permet (SMS, WhatsApp).
 * Pour Messenger, Snapchat et Instagram, aucune app ne permet de pré-remplir un message :
 * on copie le texte et on ouvre l'app, il suffit de « coller » puis d'envoyer.
 * Retourne 'prerempli', 'copie' ou 'echec'.
 */
export async function sendWish(channel: Channel, text: string, phone?: string, handle?: string): Promise<'prerempli' | 'copie' | 'echec'> {
  switch (channel) {
    case 'sms':
      return (await tryOpen([smsUrl(phone, text, isIOS ? 'ios' : 'android')])) ? 'prerempli' : 'echec';
    case 'whatsapp':
      return (await tryOpen([whatsappUrl(phone, text)])) ? 'prerempli' : 'echec';
    case 'messenger':
      await Clipboard.setStringAsync(text);
      return (await tryOpen(handle ? [`https://m.me/${handle}`] : ['fb-messenger://', 'https://www.messenger.com/'])) ? 'copie' : 'echec';
    case 'snapchat':
      await Clipboard.setStringAsync(text);
      return (await tryOpen(snapUrls(handle))) ? 'copie' : 'echec';
    case 'instagram':
      await Clipboard.setStringAsync(text);
      return (await tryOpen(handle ? [`https://ig.me/m/${handle}`] : ['instagram://direct-inbox', 'https://www.instagram.com/direct/inbox/'])) ? 'copie' : 'echec';
    case 'autre':
      if (isWeb) {
        if (navigator.share) await navigator.share({ text }).catch(() => undefined);
        else { await Clipboard.setStringAsync(text); return 'copie'; }
        return 'prerempli';
      }
      await Share.share({ message: text });
      return 'prerempli';
  }
}
