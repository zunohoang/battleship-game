export type ForumAuthor = {
  id: string;
  username: string;
  avatar: string | null;
};

export type ForumPost = {
  id: string;
  title: string;
  content: string;
  status: 'published' | 'archived';
  voteScore: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  author: ForumAuthor;
};

export type ForumComment = {
  id: string;
  postId: string;
  content: string;
  voteScore: number;
  createdAt: string;
  updatedAt: string;
  author: ForumAuthor;
};

export type ForumPostsResponse = {
  page: number;
  limit: number;
  total: number;
  data: ForumPost[];
};
