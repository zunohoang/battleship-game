import { Navigate, useParams } from 'react-router-dom';

/** Old `/forum/posts/:id` URLs → `/forum?openPost=id` so the feed can open the modal. */
export function ForumPostLegacyRedirect() {
  const { postId } = useParams<{ postId: string }>();
  const q = postId ? `?openPost=${encodeURIComponent(postId)}` : '';
  return <Navigate to={`/forum${q}`} replace />;
}
