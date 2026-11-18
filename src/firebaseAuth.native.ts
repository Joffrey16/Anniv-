import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FirebaseApp } from 'firebase/app';
import { initializeAuth } from 'firebase/auth';
// Présent dans la version React Native de Firebase, mais absent des types publics.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReactNativePersistence } = require('@firebase/auth') as { getReactNativePersistence: (s: unknown) => import('firebase/auth').Persistence };

export const createAuth = (app: FirebaseApp) => initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
