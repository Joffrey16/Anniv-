import type { FirebaseApp } from 'firebase/app';
import { browserLocalPersistence, indexedDBLocalPersistence, initializeAuth } from 'firebase/auth';

export const createAuth = (app: FirebaseApp) => initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
