import type { FirebaseApp } from 'firebase/app';
import { browserLocalPersistence, browserPopupRedirectResolver, indexedDBLocalPersistence, initializeAuth } from 'firebase/auth';

export const createAuth = (app: FirebaseApp) => initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  popupRedirectResolver: browserPopupRedirectResolver, // nécessaire pour « Continuer avec Google »
});
