// Configuration Firebase du projet (publique par nature : la sécurité vient des règles Firestore, voir firestore.rules).
// Mettre à null pour utiliser l'app sans compte (données uniquement sur le téléphone).
export const firebaseConfig: Record<string, string> | null = {
  apiKey: 'AIzaSyA-Kjq7DLZLpkZv76ULN6-0smkuTnTJEr4',
  authDomain: 'anniv-c04d7.firebaseapp.com',
  projectId: 'anniv-c04d7',
  storageBucket: 'anniv-c04d7.firebasestorage.app',
  messagingSenderId: '737421802329',
  appId: '1:737421802329:web:54883ccd174120e5fb2a48',
};
