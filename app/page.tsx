import { createClient } from '../lib/supabase/server'
import Link from 'next/link'
import NewPostForm from './NewPostForm'
import PostActions from './PostActions'
import PostEngagement from './PostEngagement'
import PostImage from './PostImage'

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

  // Check authentication
  const { data: sessionData } = await supabase.auth.getSession()
  const isAuth = !!sessionData.session

  if (!isAuth) {
    return (
      <main className="min-h-[calc(100vh-64px)] w-full flex flex-col items-center justify-center relative overflow-hidden bg-black text-white px-4">
        {/* Geometric Background */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{
          backgroundImage: `
            linear-gradient(to right, #ffffff1a 1px, transparent 1px),
            linear-gradient(to bottom, #ffffff1a 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)'
        }}>
          {/* Decorative shapes */}
          <div className="absolute top-[20%] left-[15%] w-64 h-64 border border-indigo-500/30 rounded-full blur-sm" />
          <div className="absolute bottom-[20%] right-[15%] w-72 h-72 border border-pink-500/30 rotate-45 blur-sm" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-lg mx-auto space-y-6">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 drop-shadow-sm">
            My Microblog
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl font-medium">
            Join the conversation. Uncensored, unfiltered, unbiased.
          </p>
          <div className="pt-4 animate-bounce">
            <svg className="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </div>
          <p className="text-xs text-zinc-500 mt-2">Sign in using the button in the top right corner.</p>
        </div>
      </main>
    )
  }

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

              {post.media_url && (
                <PostImage src={post.media_url} alt="Post Attachment" />
              )}

              <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                <PostEngagement
                  postId={post.id}
                  postContent={post.content}
                  postAuthorName={prof?.display_name || 'Anonymous'}
                  postAuthorAvatar={prof?.avatar_url || null}
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
