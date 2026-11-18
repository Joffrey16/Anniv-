# Anniv ! 🎂

App mobile (iPhone + Android) pour ne plus oublier les anniversaires de ses proches.

## Ce que fait le prototype

- **À venir** : le prochain anniversaire en grand, puis la liste triée (cette semaine, ce mois-ci, 3 prochains mois, plus tard), avec l'âge, un compte à rebours et une recherche.
- **Ajout rapide** : bouton ＋, nom, mois, jour (année facultative), emoji, famille/ami·e/collègue, idées cadeau, notes.
- **Rappels paramétrables** : rappels « acheter un cadeau » et « souhaiter l'anniversaire », autant qu'on veut, du jour J à J-30, à l'heure choisie. Les rappels cadeau ne concernent que les personnes marquées « Je prévois un cadeau ». Aperçu des prochaines notifications et bouton de test.
- **Import** : contacts du téléphone ayant une date d'anniversaire, fichier `.vcf` (Google Contacts, iCloud, Outlook) ou `.ics` (calendrier d'anniversaires), avec écran de sélection « qui veux-tu ajouter ? » et détection des doublons. Bouton « Demander à mes amis » pour envoyer un message via WhatsApp/Snap/SMS.
- **Souhaiter en un geste** : bouton « Souhaiter » (et notification du jour J) qui ouvre un message pré-écrit, modifiable, à partir d'un modèle paramétrable (`{prenom}`, `{nom}`, `{age}`) dans l'onglet Rappels.
  - SMS et WhatsApp : la conversation de la personne s'ouvre avec le texte déjà collé, il reste à appuyer sur Envoyer (il faut son numéro dans sa fiche ; les numéros en 06… sont considérés français).
  - Messenger, Snapchat, Instagram : ces apps n'acceptent pas de texte pré-rempli venant d'une autre app. Le message est copié et l'app s'ouvre (sur la conversation si l'identifiant m.me / pseudo Snap est renseigné) : appui long, Coller, Envoyer.
  - « Autre… » ouvre le menu de partage du téléphone.
- **Partage** : choisir des anniversaires (cases à cocher) et les envoyer par lien ; la personne qui l'ouvre choisit qui ajouter. La liste est dans la partie `#` du lien, donc jamais envoyée à un serveur. Les idées cadeau et notes ne sont pas partagées.
- Les données restent sur le téléphone (pas de compte, pas de serveur).

## Facebook et Snapchat

Ni l'un ni l'autre ne permet à une app de récupérer les anniversaires des amis :
- Facebook a retiré l'accès aux anniversaires des amis dans l'API Graph v2.0 (fin 2015 pour toutes les apps), et a supprimé l'export de calendrier d'anniversaires (.ics) en 2019.
- Snapchat (Login Kit) ne donne que le nom affiché, le Bitmoji et un identifiant, jamais la liste d'amis.

Les alternatives proposées dans l'app : contacts du téléphone, export Google Contacts en `.vcf`, calendrier `.ics`, ou demander directement aux amis.

## Lancer l'app

```bash
npm install
npx expo start        # puis scanner le QR code avec l'app Expo Go (iPhone/Android)
npx expo start --web  # aperçu dans le navigateur (sans notifications ni contacts)
npm test              # tests de la logique (dates, import .vcf/.ics)
```

Stack : Expo SDK 58 / React Native, TypeScript, expo-notifications (rappels locaux), expo-contacts, expo-document-picker, AsyncStorage.

Note : iOS limite à 64 notifications programmées ; l'app garde les 60 plus proches et reprogramme à chaque ouverture.

## Version web (gratuite, à installer sur l'iPhone)

Publiée automatiquement sur GitHub Pages à chaque envoi sur `main` (voir `.github/workflows/pages.yml`).
Sur iPhone : ouvrir l'adresse dans Safari, bouton Partager › « Sur l'écran d'accueil ».

Différences avec l'app native :
- pas d'accès direct aux contacts : importer un fichier `.vcf` (export de l'app Contacts, de Google Contacts ou d'iCloud) ;
- les rappels passent par le Calendrier du téléphone (bouton « Ajouter au calendrier » dans Rappels, fichier `.ics` avec alertes) ;
- bouton « Sauvegarder » (fichier JSON) car les données restent dans le téléphone.

Construire localement : `EXPO_BASE_URL=/Anniv- npm run build:web` (dossier `dist/`).

## Comptes et sauvegarde en ligne (Firebase)

Si `src/firebaseConfig.ts` contient la configuration d'un projet Firebase, l'app propose de créer un compte (e-mail + mot de passe). Les anniversaires et réglages sont alors stockés dans Firestore (`users/{uid}` et `users/{uid}/people/{id}`) et synchronisés en direct sur tous les appareils. Les anniversaires déjà saisis sur le téléphone sont ajoutés au compte à la première connexion. « Continuer sans compte » garde le fonctionnement 100 % local.

Mise en place : créer un projet Firebase, activer Authentication › E-mail/Mot de passe, créer Firestore (mode production), coller le contenu de `firestore.rules` dans Firestore › Règles, puis la config web dans `src/firebaseConfig.ts`.

Tests locaux avec les émulateurs : `npx firebase-tools emulators:start --only auth,firestore --project demo-anniv`, puis `EXPO_PUBLIC_FIREBASE_EMULATOR=127.0.0.1 npx expo start --web`.
