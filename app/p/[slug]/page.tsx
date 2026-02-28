import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PostActions from '@/app/PostActions'
import PostEngagement from '@/app/PostEngagement'
import ReplyForm from '@/app/ReplyForm'
import PostMedia from '@/app/PostMedia'
import QuotedPost from '@/app/QuotedPost'

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

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const id = Number(slug)
  if (!id) notFound()

  const supabase = await createClient()

  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !post) notFound()

  const { data: replies } = await supabase
    .from('posts')
    .select('*')
    .eq('parent_id', id)
    .order('created_at', { ascending: true })

  const allIds = [id, ...(replies ?? []).map((r: any) => r.id)]
  const quotedIds = [post.quoted_post_id, ...(replies ?? []).map((r: any) => r.quoted_post_id)].filter(Boolean)

  const [likeRowsRes, repostRowsRes, replyCountsRes, quotedPostsRes] = await Promise.all([
    supabase.from('likes').select('post_id').in('post_id', allIds),
    supabase.from('reposts').select('post_id').in('post_id', allIds),
    supabase.from('posts').select('parent_id').in('parent_id', allIds),
    quotedIds.length ? supabase.from('posts').select('*').in('id', quotedIds) : Promise.resolve({ data: [] }),
  ])

  const quotedPostsMap: Record<number, any> = {}
  for (const qp of quotedPostsRes.data ?? []) {
    quotedPostsMap[qp.id] = qp
  }

  const directUserIds = [post.user_id, ...(replies ?? []).map((r: any) => r.user_id)]
  const quotedUserIds = (quotedPostsRes.data ?? []).map((p: any) => p.user_id).filter(Boolean)
  const allUserIds = [...new Set([...directUserIds, ...quotedUserIds])]

  const profilesRes = allUserIds.length ? await supabase.from('profiles').select('id, display_name, avatar_url').in('id', allUserIds) : { data: [] }

  const profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {}
  for (const p of profilesRes.data ?? []) {
    profileMap[(p as any).id] = { display_name: (p as any).display_name, avatar_url: (p as any).avatar_url }
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

  const replyCounts: Record<number, number> = {}
  for (const r of replyCountsRes.data ?? []) {
    const pid = (r as any).parent_id
    replyCounts[pid] = (replyCounts[pid] ?? 0) + 1
  }

  const mainProf = profileMap[post.user_id] ?? null
  const mainFallback = (mainProf?.display_name || 'U').slice(0, 1).toUpperCase()
  const mainEdited = isEdited(post.created_at, post.updated_at)

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <Link href="/" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
        ← ホームに戻る
      </Link>

      {/* メイン投稿 */}
      <div className="bg-zinc-900 border border-zinc-800/60 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Link href={`/u/${post.user_id}`} className="flex items-center gap-2.5 hover:opacity-75 transition-opacity">
            {mainProf?.avatar_url ? (
              <img src={mainProf.avatar_url} alt="avatar" className="h-8 w-8 rounded-full object-cover ring-1 ring-zinc-700" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-semibold text-white">
                {mainFallback}
              </div>
            )}
            <span className="text-sm font-medium text-zinc-100">{mainProf?.display_name || 'Anonymous'}</span>
          </Link>
          <div className="flex items-center gap-2">
            {mainEdited && <span className="text-xs text-zinc-600">編集済</span>}
            <span className="text-xs text-zinc-500">
              {formatDate(mainEdited ? post.updated_at : post.created_at)}
            </span>
          </div>
        </div>

        <p className="text-zinc-100 leading-7 whitespace-pre-wrap break-words">{post.content}</p>

        {post.media_url && (
          <PostMedia src={post.media_url} alt="Post Attachment" />
        )}

        {post.quoted_post_id && quotedPostsMap[post.quoted_post_id] && (() => {
          const qp = quotedPostsMap[post.quoted_post_id]
          const qpProf = profileMap[qp.user_id] ?? null
          return (
            <QuotedPost
              post={{
                id: qp.id,
                userId: qp.user_id,
                content: qp.content,
                mediaUrl: qp.media_url,
                createdAt: qp.created_at,
                authorName: qpProf?.display_name || 'Anonymous',
                authorAvatar: qpProf?.avatar_url || null,
              }}
            />
          )
        })()}

        <div className="pt-1 border-t border-zinc-800/60 flex items-center justify-between">
          <PostEngagement
            postId={post.id}
            postContent={post.content}
            postAuthorName={mainProf?.display_name || 'Anonymous'}
            postAuthorAvatar={mainProf?.avatar_url || null}
            replyCount={replyCounts[post.id] ?? 0}
            likeCount={likeCounts[post.id] ?? 0}
            repostCount={repostCounts[post.id] ?? 0}
          />
          <PostActions postId={post.id} authorUserId={post.user_id} initialContent={post.content} />
        </div>
      </div>

      {/* リプライフォーム */}
      <ReplyForm parentId={post.id} />

      {/* リプライ一覧 */}
      {(replies ?? []).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-600 px-1">
            {replies!.length} 件の返信
          </p>
          {replies!.map((reply: any) => {
            const prof = profileMap[reply.user_id] ?? null
            const fallback = (prof?.display_name || 'U').slice(0, 1).toUpperCase()
            const edited = isEdited(reply.created_at, reply.updated_at)
            return (
              <div key={reply.id} className="bg-zinc-900/70 border border-zinc-800/40 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Link href={`/u/${reply.user_id}`} className="flex items-center gap-2 hover:opacity-75 transition-opacity">
                    {prof?.avatar_url ? (
                      <img src={prof.avatar_url} alt="avatar" className="h-6 w-6 rounded-full object-cover ring-1 ring-zinc-700" />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-semibold text-white">
                        {fallback}
                      </div>
                    )}
                    <span className="text-sm font-medium text-zinc-100">{prof?.display_name || 'Anonymous'}</span>
                  </Link>
                  <div className="flex items-center gap-2">
                    {edited && <span className="text-xs text-zinc-600">編集済</span>}
                    <Link href={`/p/${reply.id}`} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                      {formatDate(edited ? reply.updated_at : reply.created_at)}
                    </Link>
                  </div>
                </div>
                <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">{reply.content}</p>
                {reply.media_url && (
                  <PostMedia src={reply.media_url} alt="Reply Attachment" />
                )}
                {reply.quoted_post_id && quotedPostsMap[reply.quoted_post_id] && (() => {
                  const qp = quotedPostsMap[reply.quoted_post_id]
                  const qpProf = profileMap[qp.user_id] ?? null
                  return (
                    <QuotedPost
                      post={{
                        id: qp.id,
                        userId: qp.user_id,
                        content: qp.content,
                        mediaUrl: qp.media_url,
                        createdAt: qp.created_at,
                        authorName: qpProf?.display_name || 'Anonymous',
                        authorAvatar: qpProf?.avatar_url || null,
                      }}
                    />
                  )
                })()}
                <div className="mt-2 pt-2 border-t border-zinc-800/40 flex items-center justify-between">
                  <PostEngagement
                    postId={reply.id}
                    postContent={reply.content}
                    postAuthorName={prof?.display_name || 'Anonymous'}
                    postAuthorAvatar={prof?.avatar_url || null}
                    replyCount={replyCounts[reply.id] ?? 0}
                    likeCount={likeCounts[reply.id] ?? 0}
                    repostCount={repostCounts[reply.id] ?? 0}
                  />
                  <PostActions postId={reply.id} authorUserId={reply.user_id} initialContent={reply.content} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
