import type { AppLocale } from '../i18n/types';

import type { GeekTopic, SuggestedFeed } from './suggestedFeeds';
import { GEEK_TOPICS as FR_GEEK_TOPICS, DEFAULT_SUBSCRIPTIONS as FR_DEFAULTS } from './suggestedFeeds';

const EN_TOPICS: GeekTopic[] = [
  {
    id: 'tech',
    title: 'Tech & digital',
    description: 'Hardware, software, mobile and digital culture.',
    feeds: [
      { title: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
      { title: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
      { title: 'Engadget', url: 'https://www.engadget.com/rss.xml' },
      { title: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
      { title: 'Wired', url: 'https://www.wired.com/feed/rss' },
      { title: 'Gizmodo', url: 'https://gizmodo.com/rss' },
      { title: 'The Register', url: 'https://www.theregister.com/headlines.atom' },
      { title: '9to5Mac', url: 'https://9to5mac.com/feed/' },
      { title: 'Android Authority', url: 'https://www.androidauthority.com/feed/' },
      { title: 'Tom’s Hardware', url: 'https://www.tomshardware.com/feeds/all' },
      { title: 'AnandTech', url: 'https://www.anandtech.com/rss/' },
      { title: 'Hacker News (best)', url: 'https://hnrss.org/best' },
      { title: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/' },
      { title: 'VentureBeat', url: 'https://venturebeat.com/feed/' },
      { title: 'The Next Web', url: 'https://thenextweb.com/feed/' },
      { title: 'MacRumors', url: 'https://feeds.macrumors.com/MacRumors-All' },
      { title: 'How-To Geek', url: 'https://www.howtogeek.com/feed/' },
      { title: 'Lifehacker', url: 'https://lifehacker.com/rss' },
    ],
  },
  {
    id: 'games',
    title: 'Video games',
    description: 'Gaming news and reviews.',
    feeds: [
      { title: 'Kotaku', url: 'https://kotaku.com/rss' },
      { title: 'Polygon', url: 'https://www.polygon.com/rss/index.xml' },
      { title: 'Eurogamer', url: 'https://www.eurogamer.net/feed' },
      { title: 'Rock Paper Shotgun', url: 'https://www.rockpapershotgun.com/feed' },
      { title: 'IGN', url: 'https://feeds.feedburner.com/ign/all' },
      { title: 'PC Gamer', url: 'https://www.pcgamer.com/rss/' },
    ],
  },
  {
    id: 'pop',
    title: 'Pop culture',
    description: 'Geek, movies and series.',
    feeds: [
      { title: 'io9', url: 'https://io9.com/rss' },
      { title: 'The A.V. Club', url: 'https://www.avclub.com/rss' },
      { title: 'Screen Rant', url: 'https://screenrant.com/feed/' },
    ],
  },
  {
    id: 'science',
    title: 'Science',
    description: 'Science news and research.',
    feeds: [
      { title: 'Ars Technica (science)', url: 'https://feeds.arstechnica.com/arstechnica/science' },
      { title: 'NASA', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss' },
      { title: 'Science Daily', url: 'https://www.sciencedaily.com/rss/all.xml' },
    ],
  },
];

const ES_TOPICS: GeekTopic[] = [
  {
    id: 'tech',
    title: 'Tecnología',
    description: 'Hardware, software, móvil y cultura digital.',
    feeds: [
      { title: 'Xataka', url: 'https://www.xataka.com/index.xml' },
      { title: 'Genbeta', url: 'https://www.genbeta.com/index.xml' },
      { title: 'Hipertextual', url: 'https://hipertextual.com/feed' },
      { title: 'Applesfera', url: 'https://www.applesfera.com/index.xml' },
      { title: 'Xataka Android', url: 'https://www.xatakandroid.com/index.xml' },
      { title: 'Xataka Móvil', url: 'https://www.xatakamovil.com/index.xml' },
      { title: 'Engadget ES', url: 'https://es.engadget.com/rss.xml' },
      { title: 'ADSLZone', url: 'https://www.adslzone.net/feed/' },
      { title: 'MuyComputer', url: 'https://www.muycomputer.com/feed/' },
    ],
  },
  {
    id: 'games',
    title: 'Videojuegos',
    description: 'Actualidad de juegos.',
    feeds: [
      { title: 'Vida Extra', url: 'https://www.vidaextra.com/index.xml' },
      { title: '3DJuegos', url: 'https://www.3djuegos.com/rss.xml' },
      { title: 'Eurogamer ES', url: 'https://www.eurogamer.es/feed' },
    ],
  },
  {
    id: 'pop',
    title: 'Cultura pop',
    description: 'Cine, series y geek.',
    feeds: [
      { title: 'Espinof', url: 'https://www.espinof.com/index.xml' },
      { title: 'Sensacine', url: 'https://www.sensacine.com/rss/noticias.xml' },
    ],
  },
  {
    id: 'science',
    title: 'Ciencia',
    description: 'Ciencia y divulgación.',
    feeds: [
      { title: 'Muy Interesante', url: 'https://www.muyinteresante.es/feed' },
      { title: 'National Geographic ES', url: 'https://www.nationalgeographic.es/rss' },
    ],
  },
];

const IT_TOPICS: GeekTopic[] = [
  {
    id: 'tech',
    title: 'Tech',
    description: 'Hardware, software, mobile e cultura digitale.',
    feeds: [
      { title: 'HDblog', url: 'https://www.hdblog.it/rss.xml' },
      { title: 'Tom’s Hardware IT', url: 'https://www.tomshw.it/feed' },
      { title: 'DDay.it', url: 'https://www.dday.it/rss' },
      { title: 'Hardware Upgrade', url: 'https://www.hwupgrade.it/rss.xml' },
      { title: 'Punto Informatico', url: 'https://www.punto-informatico.it/feed/site' },
      { title: 'SmartWorld', url: 'https://www.smartworld.it/feed/' },
      { title: 'Macitynet', url: 'https://www.macitynet.it/feed/' },
    ],
  },
  {
    id: 'games',
    title: 'Videogiochi',
    description: 'Notizie sui giochi.',
    feeds: [
      { title: 'Multiplayer.it', url: 'https://multiplayer.it/rss.xml' },
      { title: 'Everyeye', url: 'https://www.everyeye.it/rss.xml' },
      { title: 'SpazioGames', url: 'https://www.spaziogames.it/feed' },
    ],
  },
  {
    id: 'pop',
    title: 'Pop culture',
    description: 'Cinema, serie e geek.',
    feeds: [
      { title: 'ComingSoon.it', url: 'https://www.comingsoon.it/rss.xml' },
      { title: 'Movieplayer', url: 'https://movieplayer.it/rss.xml' },
    ],
  },
  {
    id: 'science',
    title: 'Scienza',
    description: 'Scienza e divulgazione.',
    feeds: [
      { title: 'Focus.it', url: 'https://www.focus.it/rss' },
      { title: 'Wired IT', url: 'https://www.wired.it/feed/rss' },
    ],
  },
];

const PT_TOPICS: GeekTopic[] = [
  {
    id: 'tech',
    title: 'Tecnologia',
    description: 'Hardware, software, mobile e cultura digital.',
    feeds: [
      { title: 'Pplware', url: 'https://pplware.sapo.pt/feed/' },
      { title: 'SAPO Tek', url: 'https://tek.sapo.pt/rss' },
      { title: '4gnews', url: 'https://4gnews.pt/feed/' },
      { title: 'TechTudo', url: 'https://www.techtudo.com.br/rss.xml' },
      { title: 'Canaltech', url: 'https://canaltech.com.br/rss/' },
      { title: 'IT Insight', url: 'https://www.itinsight.pt/feed/' },
    ],
  },
  {
    id: 'games',
    title: 'Videojogos',
    description: 'Notícias de gaming.',
    feeds: [
      { title: 'Observador Jogos', url: 'https://observador.pt/rss/jogos/' },
      { title: 'Eurogamer PT', url: 'https://www.eurogamer.pt/feed' },
    ],
  },
  {
    id: 'pop',
    title: 'Cultura pop',
    description: 'Cinema, séries e geek.',
    feeds: [
      { title: 'SAPO Mag', url: 'https://mag.sapo.pt/rss' },
    ],
  },
  {
    id: 'science',
    title: 'Ciência',
    description: 'Ciência e divulgação.',
    feeds: [
      { title: 'Ciência Hoje', url: 'https://www.cienciahoje.pt/rss' },
    ],
  },
];

const DEFAULTS_BY_LOCALE: Record<AppLocale, SuggestedFeed[]> = {
  fr: FR_DEFAULTS,
  en: [
    { title: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
    { title: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
    { title: 'Engadget', url: 'https://www.engadget.com/rss.xml' },
    { title: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
    { title: 'Kotaku', url: 'https://kotaku.com/rss' },
  ],
  es: [
    { title: 'Xataka', url: 'https://www.xataka.com/index.xml' },
    { title: 'Genbeta', url: 'https://www.genbeta.com/index.xml' },
    { title: 'Hipertextual', url: 'https://hipertextual.com/feed' },
    { title: 'Vida Extra', url: 'https://www.vidaextra.com/index.xml' },
    { title: 'Applesfera', url: 'https://www.applesfera.com/index.xml' },
  ],
  it: [
    { title: 'HDblog', url: 'https://www.hdblog.it/rss.xml' },
    { title: 'Tom’s Hardware IT', url: 'https://www.tomshw.it/feed' },
    { title: 'DDay.it', url: 'https://www.dday.it/rss' },
    { title: 'Multiplayer.it', url: 'https://multiplayer.it/rss.xml' },
    { title: 'SmartWorld', url: 'https://www.smartworld.it/feed/' },
  ],
  pt: [
    { title: 'Pplware', url: 'https://pplware.sapo.pt/feed/' },
    { title: 'SAPO Tek', url: 'https://tek.sapo.pt/rss' },
    { title: '4gnews', url: 'https://4gnews.pt/feed/' },
    { title: 'Canaltech', url: 'https://canaltech.com.br/rss/' },
    { title: 'Observador Jogos', url: 'https://observador.pt/rss/jogos/' },
  ],
};

const TOPICS_BY_LOCALE: Record<AppLocale, GeekTopic[]> = {
  fr: FR_GEEK_TOPICS,
  en: EN_TOPICS,
  es: ES_TOPICS,
  it: IT_TOPICS,
  pt: PT_TOPICS,
};

export function getGeekTopics(locale: AppLocale): GeekTopic[] {
  return TOPICS_BY_LOCALE[locale] ?? FR_GEEK_TOPICS;
}

export function getDefaultSubscriptions(locale: AppLocale): SuggestedFeed[] {
  return DEFAULTS_BY_LOCALE[locale] ?? FR_DEFAULTS;
}
