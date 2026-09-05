import { redirect } from 'next/navigation';
import { serverApiFetch } from '@/lib/serverApi';
import ProfileView from '@/components/ProfileView';
import type { ActivityCommentPage, ProfileCounts, ProfileMe } from '@/data/profile';

const EMPTY_COUNTS: ProfileCounts = {
  posts: 0,
  replies: 0,
  upvotes: 0,
  downvotes: 0,
  helpful: 0,
  blogPosts: 0,
  blogReplies: 0,
  courseComments: 0,
};
const EMPTY_PAGE: ActivityCommentPage = { items: [], nextCursor: null };

export default async function ProfilePage(): Promise<React.JSX.Element> {
  const meRes = await serverApiFetch('/auth/me');
  if (!meRes.ok) {
    redirect('/login');
  }
  const me: ProfileMe = await meRes.json();

  // Counts (cheap) + the first page of the default tab, server-rendered so
  // the primary view has no loading flash. The Posts tab and every "load
  // more" are fetched on demand from the client.
  const [countsRes, repliesRes] = await Promise.all([
    serverApiFetch('/users/me/activity'),
    serverApiFetch('/users/me/comments?kind=reply&scope=blog'),
  ]);
  const counts: ProfileCounts = countsRes.ok ? await countsRes.json() : EMPTY_COUNTS;
  const initialReplies: ActivityCommentPage = repliesRes.ok ? await repliesRes.json() : EMPTY_PAGE;

  return <ProfileView initialMe={me} counts={counts} initialReplies={initialReplies} />;
}
