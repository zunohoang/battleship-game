import { apiClient } from './axios';
import type { ForumComment, ForumPost, ForumPostsResponse } from '@/types/forum';

export async function listPosts(params: {
  page?: number;
  limit?: number;
  sort?: 'newest' | 'top' | 'comments';
  /** Server: title/content ILIKE match */
  q?: string;
}): Promise<ForumPostsResponse> {
  const response = await apiClient.get<ForumPostsResponse>('/forum/posts', {
    params,
  });
  return response.data;
}

export async function getPost(postId: string): Promise<ForumPost> {
  const response = await apiClient.get<ForumPost>(`/forum/posts/${postId}`);
  return response.data;
}

export async function createPost(payload: {
  title: string;
  content: string;
}): Promise<ForumPost> {
  const response = await apiClient.post<ForumPost>('/forum/posts', payload);
  return response.data;
}

export async function listComments(postId: string): Promise<ForumComment[]> {
  const response = await apiClient.get<ForumComment[]>(
    `/forum/posts/${postId}/comments`,
  );
  return response.data;
}

export async function createComment(
  postId: string,
  payload: { content: string },
): Promise<ForumComment> {
  const response = await apiClient.post<ForumComment>(
    `/forum/posts/${postId}/comments`,
    payload,
  );
  return response.data;
}

export async function votePost(
  postId: string,
  value: -1 | 1,
): Promise<{ voteScore: number; viewerVote: -1 | 0 | 1 }> {
  const response = await apiClient.post<{ voteScore: number; viewerVote: -1 | 0 | 1 }>(
    `/forum/posts/${postId}/vote`,
    { value },
  );
  return response.data;
}

export async function voteComment(
  commentId: string,
  value: -1 | 1,
): Promise<{ voteScore: number; viewerVote: -1 | 0 | 1 }> {
  const response = await apiClient.post<{ voteScore: number; viewerVote: -1 | 0 | 1 }>(
    `/forum/comments/${commentId}/vote`,
    { value },
  );
  return response.data;
}
