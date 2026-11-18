import { Platform } from 'react-native';

export const isWeb = Platform.OS === 'web';
const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
/** iPhone/iPad, en natif ou dans Safari. */
export const isIOS = Platform.OS === 'ios' || (isWeb && /iPhone|iPad|iPod|Macintosh.*Mobile/.test(ua));
export const isStandaloneWeb = isWeb && typeof window !== 'undefined' &&
  (Boolean((navigator as unknown as { standalone?: boolean }).standalone) || window.matchMedia?.('(display-mode: standalone)').matches);
