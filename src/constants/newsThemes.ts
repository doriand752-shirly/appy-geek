import type { CustomNewsTheme } from '../types/settings';

export type NewsTheme = {
  id: string;
  label: string;
  /** Classement par titre (insensible aux accents). */
  keywords: string[];
  /** Illustration si aucun article du thème n’a d’image. */
  fallbackImageUrl?: string;
};

/**
 * Thèmes rationalisés : une entrée = une famille cohérente (plus de doublons type iPhone/Apple ou Free/Orange/SFR séparés).
 * La sélection affichée sur l’accueil est gérée dans les paramètres (`selectedThemeIds`).
 */
export const NEWS_THEMES: NewsTheme[] = [
  {
    id: 'apple',
    label: 'Apple',
    keywords: [
      'apple',
      'iphone',
      'ipad',
      'ipod',
      'macbook',
      'imac',
      'mac mini',
      'mac studio',
      'airpods',
      'ios ',
      'ios.',
      'vision pro',
      'apple watch',
      'watch series',
      'airtag',
    ],
    fallbackImageUrl: 'https://cdn.simpleicons.org/apple/ffffff',
  },
  {
    id: 'samsung',
    label: 'Samsung',
    keywords: ['samsung', 'galaxy s', 'galaxy z', 'galaxy a', 'galaxy tab', 'galaxy watch', 'one ui'],
    fallbackImageUrl: 'https://cdn.simpleicons.org/samsung/ffffff',
  },
  {
    id: 'google',
    label: 'Google & Pixel',
    keywords: [
      'google',
      'pixel ',
      'chromebook',
      'chrome os',
      'gemini ',
      'deepmind',
      'youtube premium',
      'wear os',
      'google ',
    ],
    fallbackImageUrl: 'https://cdn.simpleicons.org/google/ffffff',
  },
  {
    id: 'microsoft',
    label: 'Microsoft',
    keywords: ['microsoft', 'windows ', 'xbox', 'surface ', ' azure', 'bing ', 'copilot', 'office 365'],
    fallbackImageUrl: 'https://cdn.simpleicons.org/microsoft/ffffff',
  },
  {
    id: 'meta',
    label: 'Meta',
    keywords: ['meta ', 'facebook ', 'instagram ', 'whatsapp ', 'quest ', 'oculus', 'threads'],
    fallbackImageUrl: 'https://cdn.simpleicons.org/meta/ffffff',
  },
  {
    id: 'telecom',
    label: 'Télécoms & box',
    keywords: [
      'free mobile',
      'freebox',
      'iliad',
      'xavier niel',
      'orange ',
      'sfr ',
      'bouygues',
      'altice',
      'forfait mobile',
      'forfait ',
      ' opérateur',
      'mvno',
      'e-sim',
      'esim',
      '5g ',
      ' réseau mobile',
      'box internet',
      'fibre ',
    ],
    fallbackImageUrl: 'https://cdn.simpleicons.org/orange/ffffff',
  },
  {
    id: 'social',
    label: 'Réseaux sociaux',
    keywords: [
      'facebook',
      'instagram',
      'tiktok',
      'twitter',
      ' réseaux sociaux',
      'snapchat',
      'linkedin',
      'threads',
      ' bluesky',
      'mastodon',
      'youtube',
      'whatsapp',
      'discord ',
    ],
    fallbackImageUrl: 'https://cdn.simpleicons.org/x/ffffff',
  },
  {
    id: 'gaming',
    label: 'Jeux & consoles',
    keywords: [
      'jeux vidéo',
      'jeu vidéo',
      'steam ',
      'epic games',
      'playstation',
      ' ps5 ',
      ' ps4 ',
      ' xbox ',
      ' nintendo ',
      'switch ',
      'mario ',
      'zelda ',
      'pokemon ',
      'sony interactive',
      'esport',
      'roguelike',
    ],
    fallbackImageUrl: 'https://cdn.simpleicons.org/steam/ffffff',
  },
  {
    id: 'mobile_other',
    label: 'Autres marques mobile',
    keywords: [
      'xiaomi',
      'redmi',
      'poco ',
      'huawei',
      'honor ',
      'oppo ',
      'vivo ',
      'realme',
      'nothing phone',
      'oneplus',
      'hyperos',
      'miui',
      'harmonyos',
    ],
    fallbackImageUrl: 'https://cdn.simpleicons.org/xiaomi/ffffff',
  },
  {
    id: 'ai',
    label: 'Intelligence artificielle',
    keywords: [
      'intelligence artificielle',
      ' intelligence artificielle',
      'chatgpt',
      ' openai',
      ' ia ',
      ' ia,',
      ' ia.',
      'deep learning',
      'machine learning',
      ' llm ',
      'gemini ',
      'claude ',
      'mistral ',
      'midjourney',
    ],
    fallbackImageUrl: 'https://cdn.simpleicons.org/openai/ffffff',
  },
  {
    id: 'cyber',
    label: 'Cybersécurité',
    keywords: [
      'cybersécurité',
      'cybersec',
      'ransomware',
      'malware',
      'pirate',
      'anssi',
      'cnil',
      'fuite de données',
      'data breach',
    ],
    fallbackImageUrl: 'https://cdn.simpleicons.org/wireshark/ffffff',
  },
  {
    id: 'crypto',
    label: 'Crypto & blockchain',
    keywords: ['bitcoin', 'ethereum', 'crypto', 'blockchain', 'nft ', 'coinbase', ' binance'],
    fallbackImageUrl: 'https://cdn.simpleicons.org/bitcoin/ffffff',
  },
  {
    id: 'components',
    label: 'CPU & GPU',
    keywords: ['nvidia', 'geforce', 'rtx ', 'cuda ', 'intel ', 'core ultra', 'xeon', 'amd ', 'ryzen', 'radeon'],
    fallbackImageUrl: 'https://cdn.simpleicons.org/nvidia/ffffff',
  },
  {
    id: 'amazon',
    label: 'Amazon',
    keywords: ['amazon ', 'aws ', 'kindle ', 'alexa '],
    fallbackImageUrl: 'https://cdn.simpleicons.org/amazon/ffffff',
  },
  {
    id: 'tesla',
    label: 'Tesla & mobilité',
    keywords: ['tesla ', 'cybertruck', ' model s', ' model 3', ' model y', ' model x', ' elon musk'],
    fallbackImageUrl: 'https://cdn.simpleicons.org/tesla/ffffff',
  },
];

export const NEWS_THEME_BY_ID: Record<string, NewsTheme> = Object.fromEntries(
  NEWS_THEMES.map((t) => [t.id, t]),
);

/** Identifiants valides connus (pour persistance / filtres). */
export const ALL_THEME_IDS: string[] = NEWS_THEMES.map((t) => t.id);

/** Grille d’accueil : thèmes intégrés + thèmes perso (même forme pour les tuiles). */
export function newsThemesWithCustom(custom: CustomNewsTheme[]): NewsTheme[] {
  return [
    ...NEWS_THEMES,
    ...custom.map((c) => ({
      id: c.id,
      label: c.label,
      keywords: [] as string[],
    })),
  ];
}
