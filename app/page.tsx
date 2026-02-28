import { createClient } from '../lib/supabase/server'
import Link from 'next/link'
import NewPostForm from './NewPostForm'
import PostActions from './PostActions'
import PostEngagement from './PostEngagement'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isEdited(createdAt: string, updatedAt: string | null) {
  if (!updatedAt) return false
  return new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 10000
}

export default async function Home() {
  const supabase = await createClient()

  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .is('parent_id', null)
    .order('created_at', { ascending: false })

  const postIds = (posts ?? []).map((p: any) => p.id)
  const userIds = [...new Set((posts ?? []).map((p: any) => p.user_id).filter(Boolean))]

  const [profilesRes, replyRowsRes, likeRowsRes, repostRowsRes] = await Promise.all([
    userIds.length
      ? supabase.from('profiles').select('id, display_name, avatar_url').in('id', userIds)
      : Promise.resolve({ data: [] }),
    postIds.length
      ? supabase.from('posts').select('parent_id').in('parent_id', postIds)
      : Promise.resolve({ data: [] }),
    postIds.length
      ? supabase.from('likes').select('post_id').in('post_id', postIds)
      : Promise.resolve({ data: [] }),
    postIds.length
      ? supabase.from('reposts').select('post_id').in('post_id', postIds)
      : Promise.resolve({ data: [] }),
  ])

  const profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {}
  for (const p of profilesRes.data ?? []) {
    profileMap[(p as any).id] = { display_name: (p as any).display_name, avatar_url: (p as any).avatar_url }
  }

  const replyCounts: Record<number, number> = {}
  for (const r of replyRowsRes.data ?? []) {
    const pid = (r as any).parent_id
    replyCounts[pid] = (replyCounts[pid] ?? 0) + 1
  }

  const likeCounts: Record<number, number> = {}
  for (const r of likeRowsRes.data ?? []) {
    const pid = (r as any).post_id
    likeCounts[pid] = (likeCounts[pid] ?? 0) + 1
  }

  const repostCounts: Record<number, number> = {}
  for (const r of repostRowsRes.data ?? []) {
    const pid = (r as any).post_id
    repostCounts[pid] = (repostCounts[pid] ?? 0) + 1
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-5">
        <NewPostForm />
      </div>
      <div className="space-y-3">
        {posts?.map((post: any) => {
          const prof = profileMap[post.user_id] ?? null
          const fallback = (prof?.display_name || 'U').slice(0, 1).toUpperCase()
          const edited = isEdited(post.created_at, post.updated_at)
          return (
            <div key={post.id} className="bg-zinc-900 border border-zinc-800/60 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <Link href={`/u/${post.user_id}`} className="flex items-center gap-2.5 hover:opacity-75 transition-opacity">
                  {prof?.avatar_url ? (
                    <img src={prof.avatar_url} alt="avatar" className="h-8 w-8 rounded-full object-cover ring-1 ring-zinc-700" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-semibold text-white">
                      {fallback}
                    </div>
                  )}
                  <span className="text-sm font-medium text-zinc-100">{prof?.display_name || 'Anonymous'}</span>
                </Link>
                <div className="flex items-center gap-2">
                  {edited && <span className="text-xs text-zinc-600">編集済</span>}
                  <Link href={`/p/${post.id}`} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                    {formatDate(edited ? post.updated_at : post.created_at)}
                  </Link>
                </div>
              </div>

              <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">{post.content}</p>

              <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                <PostEngagement
                  postId={post.id}
                  replyCount={replyCounts[post.id] ?? 0}
                  likeCount={likeCounts[post.id] ?? 0}
                  repostCount={repostCounts[post.id] ?? 0}
                />
                <PostActions postId={post.id} authorUserId={post.user_id} initialContent={post.content} />
              </div>
            </div>
          )
        })}
        {posts?.length === 0 && (
          <p className="text-sm text-zinc-600 text-center py-16">まだ投稿がありません。</p>
        )}
      </div>
    </main>
  )
}
