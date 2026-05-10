export type SuggestedFeed = { title: string; url: string };

export type GeekTopic = {
  id: string;
  title: string;
  description: string;
  feeds: SuggestedFeed[];
};

/**
 * Catalogue stable de flux francophones (tech, JV, culture, sciences).
 * Les URLs ont été testées en HTTP 200 ; certaines rédactions (ex. Clubic)
 * n’exposent plus de flux RSS public fiable — elles ne figurent pas ici.
 */
export const GEEK_TOPICS: GeekTopic[] = [
  {
    id: 'tech',
    title: 'Tech & numérique',
    description: 'Hardware, logiciels, mobile et culture numérique.',
    feeds: [
      { title: 'Numerama', url: 'https://www.numerama.com/feed/' },
      { title: 'Frandroid', url: 'https://www.frandroid.com/feed/' },
      { title: 'Les Numériques', url: 'https://www.lesnumeriques.com/rss/rss.xml' },
      { title: 'Presse citron', url: 'https://www.presse-citron.net/feed/' },
      { title: 'Korben', url: 'https://korben.info/feed' },
      { title: 'Next', url: 'https://next.ink/feed/' },
      { title: '01net', url: 'https://www.01net.com/rss/actualites/' },
      { title: 'Le Monde (Pixels)', url: 'https://www.lemonde.fr/pixels/rss_full.xml' },
      { title: 'Univers Freebox', url: 'https://www.universfreebox.com/feed/' },
      { title: 'Cowcotland', url: 'https://feeds.feedburner.com/cowcotland' },
      { title: 'PhonAndroid', url: 'https://www.phonandroid.com/feed/' },
      { title: 'Android MT', url: 'https://www.android-mt.com/feed/' },
      { title: 'BeGeek', url: 'https://www.begeek.fr/feed/' },
      { title: 'iPhon.fr', url: 'https://www.iphon.fr/rss' },
      { title: 'Mac4ever', url: 'https://www.mac4ever.com/rss' },
      { title: 'Point Gphone', url: 'https://www.pointgphone.com/feed/' },
      { title: 'Ginjfo', url: 'https://www.ginjfo.com/feed/' },
      { title: 'MiniMachines', url: 'https://www.minimachines.net/blog/feed/' },
      { title: 'ZDNet France', url: 'https://zdnet.fr/feed/' },
      { title: 'Silicon.fr', url: 'https://www.silicon.fr/rss' },
      { title: 'Tom’s Hardware FR', url: 'https://www.tomshardware.fr/rss' },
      { title: 'Tom’s Guide FR', url: 'https://www.tomsguide.fr/rss' },
      { title: 'Blog du modérateur', url: 'https://blogdumoderateur.com/feed/' },
      { title: 'Siècle digital', url: 'https://siecledigital.fr/feed/' },
      { title: 'Journal du Net', url: 'https://www.journaldunet.com/web-tech/rss' },
      { title: 'Journal du Net (général)', url: 'https://www.journaldunet.com/rss.xml' },
      { title: 'FrenchWeb', url: 'https://www.frenchweb.fr/feed/' },
      { title: 'La Grande Ourse', url: 'https://www.lagrandeourse.fr/feed/' },
      { title: 'Webmarketing & co’m', url: 'https://www.webmarketing-com.com/feed/' },
      { title: 'e-marketing.fr', url: 'https://www.e-marketing.fr/rss' },
      { title: 'Maddyness', url: 'https://www.maddyness.com/feed/' },
      { title: 'Startup.info', url: 'https://www.startup.info/feed/' },
      { title: 'La Plateforme.io', url: 'https://www.laplateforme.io/feed/' },
      { title: 'Cap Digital', url: 'https://capdigital.com/rss' },
      { title: 'Classe Numérique', url: 'https://www.classe-numerique.fr/feed/rss' },
      { title: 'Social Net Link', url: 'https://socialnetlink.org/feed/' },
      { title: 'Ecommerce Mag', url: 'https://www.ecommercemag.fr/rss' },
      { title: 'Smartphone France', url: 'https://www.smartphonefrance.info/?feed=rss2' },
      { title: 'Tech2Tech', url: 'https://tech2tech.fr/feed/' },
      { title: 'Logiciel.eu', url: 'https://www.logiciel.eu/flux-rss' },
      { title: 'Guide PC', url: 'https://www.guide-pc.fr/feed/' },
      { title: 'Comment ça marche', url: 'https://commentcamarche.net/feed/' },
      { title: 'L’Express', url: 'https://www.lexpress.fr/rss' },
      { title: 'L’Humanité', url: 'https://www.humanite.fr/rss' },
      { title: 'Marianne', url: 'https://www.marianne.net/rss' },
      { title: 'Nouvel Obs (high-tech)', url: 'https://www.nouvelobs.com/high-tech/rss.xml' },
      { title: 'Business Insider FR', url: 'https://www.businessinsider.fr/feed' },
      { title: 'BFMTV', url: 'https://www.bfmtv.com/rss/' },
      { title: 'France 24', url: 'https://www.france24.com/fr/rss' },
      { title: 'Europe 1', url: 'https://www.europe1.fr/rss.xml' },
      { title: 'France Inter', url: 'https://www.franceinter.fr/rss' },
      { title: 'Orange', url: 'https://www.orange.fr/rss' },
      { title: 'AirZen Radio', url: 'https://www.airzen.fr/feed/' },
      { title: 'Culturebox (France TV)', url: 'https://culturebox.francetvinfo.fr/rss' },
      { title: 'La Dépêche', url: 'https://www.ladepeche.fr/rss.xml' },
      { title: 'Journal Métro (QC)', url: 'https://journalmetro.com/rss' },
      { title: 'ICI Radio-Canada', url: 'https://ici.radio-canada.ca/rss/4159' },
      { title: 'Usbek & Rica', url: 'https://usbeketrica.com/rss/' },
      { title: 'Developpez.com (dev)', url: 'https://www.developpez.com/rss/dev.xml' },
      { title: 'Framablog', url: 'https://framablog.org/feed/' },
      { title: 'Planet Debian', url: 'https://planet.debian.org/rss20.xml' },
      { title: 'Hardware libre', url: 'https://hardware-libre.fr/feed/' },
      { title: 'Maison et Domotique', url: 'https://www.maison-et-domotique.com/feed/' },
      { title: 'CNIL', url: 'https://www.cnil.fr/rss' },
      { title: 'CERT-FR / ANSSI', url: 'https://www.cert.ssi.gouv.fr/actualite/feed/' },
      { title: 'Zataz', url: 'https://www.zataz.com/rss' },
      { title: 'Journal du Coin', url: 'https://www.journalducoin.com/feed' },
      { title: 'Cryptoast', url: 'https://cryptoast.fr/feed/' },
      { title: 'Bitcoin.fr', url: 'https://bitcoin.fr/feed' },
    ],
  },
  {
    id: 'games',
    title: 'Jeux vidéo',
    description: 'Actu JV francophone.',
    feeds: [
      { title: 'jeuxvideo.com', url: 'https://www.jeuxvideo.com/rss/rss.xml' },
      { title: 'Gameblog', url: 'https://www.gameblog.fr/rss.php' },
      { title: 'Gamergen', url: 'https://gamergen.com/flux-rss' },
      { title: 'Actu Gaming', url: 'https://www.actugaming.net/feed/' },
      { title: 'Golem13', url: 'https://www.golem13.fr/feed/' },
      { title: 'Gaming Way (style)', url: 'https://www.gaming-style.com/flux-rss' },
      { title: 'Gamezone', url: 'https://www.gamezone.com/feed/' },
      { title: 'Micromania (blog)', url: 'https://www.micromania.fr/blog/feed/' },
    ],
  },
  {
    id: 'pop',
    title: 'Pop culture',
    description: 'Geek, ciné, séries.',
    feeds: [
      { title: 'Journal du Geek', url: 'https://www.journaldugeek.com/feed/' },
      { title: 'AlloCiné (actu)', url: 'https://www.allocine.fr/rss/news.xml' },
      { title: 'JustGeek', url: 'https://www.justgeek.fr/rss' },
      { title: 'Geekzone', url: 'https://www.geekzone.fr/feed/' },
      { title: 'Actu.fr', url: 'https://www.actu.fr/rss.xml' },
    ],
  },
  {
    id: 'science',
    title: 'Science & société',
    description: 'Sciences, recherche et vulgarisation.',
    feeds: [
      { title: 'Futura Sciences', url: 'https://www.futura-sciences.com/rss/actualites.xml' },
      { title: 'Sciences et Avenir', url: 'https://www.sciencesetavenir.fr/rss.xml' },
      { title: 'Pour la Science', url: 'https://www.pourlascience.fr/rss.xml' },
      { title: 'Science & Vie', url: 'https://www.science-et-vie.com/rss/actu/rss.xml' },
      { title: 'Le Monde (Sciences)', url: 'https://www.lemonde.fr/sciences/rss_full.xml' },
      { title: 'Trust My Science', url: 'https://trustmyscience.com/rss' },
      { title: 'Le journal du CNRS', url: 'https://lejournal.cnrs.fr/rss' },
      { title: 'Café pédagogique', url: 'https://cafepedagogique.net/rss' },
      { title: 'Libération', url: 'https://www.liberation.fr/arc/outboundfeeds/rss' },
    ],
  },
];

/** Flux pré-abonnés au premier lancement */
export const DEFAULT_SUBSCRIPTIONS: SuggestedFeed[] = [
  { title: 'Numerama', url: 'https://www.numerama.com/feed/' },
  { title: 'jeuxvideo.com', url: 'https://www.jeuxvideo.com/rss/rss.xml' },
  { title: 'Journal du Geek', url: 'https://www.journaldugeek.com/feed/' },
];
