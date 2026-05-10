export type FeedSubscription = {
  id: string;
  title: string;
  url: string;
};

export type ParsedArticle = {
  id: string;
  title: string;
  link: string;
  publishedAt: number;
  summary: string;
  /** Chapô / extrait RSS en texte brut (souvent la balise `description` ou Atom `summary`) */
  chapoPlain?: string;
  /** Première image du flux (thumbnail, enclosure, `<img>` dans la description) */
  imageUrl?: string;
  /** Corps HTML si le flux le fournit (`content:encoded`, description riche, Atom `content`) */
  bodyHtml?: string;
  feedId: string;
  feedTitle: string;
};
