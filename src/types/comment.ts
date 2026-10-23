export type ArticleComment = {
  id: string;
  threadId: string;
  articleUrl: string;
  articleTitle?: string;
  pseudo: string;
  body: string;
  authorToken: string;
  createdAt: number;
};

export type PostArticleCommentInput = {
  threadId: string;
  articleUrl: string;
  articleTitle?: string;
  pseudo: string;
  body: string;
  authorToken: string;
};

export type CommentThreadSummary = {
  threadId: string;
  articleUrl: string;
  articleTitle?: string;
  commentCount: number;
  lastCommentAt: number;
};
