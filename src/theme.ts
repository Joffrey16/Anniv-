export const colors = {
  bg: '#FFF8F2',
  card: '#FFFFFF',
  ink: '#2B1D2E',
  muted: '#8A7A8C',
  line: '#F1E4DA',
  coral: '#FF6B6B',
  pink: '#FF8FAB',
  peach: '#FFB37A',
  violet: '#7C5CFF',
  mint: '#2EC4A6',
  sunny: '#FFD166',
  soft: '#FFF0E8',
};

export const gradients = {
  hero: ['#FF6B6B', '#FF8FAB', '#FFB37A'] as const,
  violet: ['#7C5CFF', '#B57CFF'] as const,
  mint: ['#2EC4A6', '#7BDFF2'] as const,
};

export const relationMeta = {
  famille: { label: 'Famille', color: '#FF6B6B', bg: '#FFE8E8' },
  ami: { label: 'Ami·e', color: '#7C5CFF', bg: '#EEE9FF' },
  collegue: { label: 'Collègue', color: '#2EC4A6', bg: '#E2F8F3' },
  autre: { label: 'Autre', color: '#E59A3A', bg: '#FFF1DE' },
} as const;

export const EMOJIS = ['🎂', '🥳', '🎈', '🌸', '🦄', '⚽️', '🎸', '🐶', '🍕', '🌈', '👑', '💜'];

export const shadow = {
  shadowColor: '#7A3B2E',
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
};
