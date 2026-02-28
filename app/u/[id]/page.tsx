'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../supabase'
import { Button } from '@/components/ui/button'
import PostMedia from '../../PostMedia'
import QuotedPost from '../../QuotedPost'
import PostActions from '../../PostActions'
import PostEngagement from '../../PostEngagement'

type Profile = {
  id: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
}

type Post = {
  id: number
  user_id: string
  content: string
  created_at: string
  media_url: string | null
  quoted_post_id: number | null
  reply_to: number | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function UserPage() {
  const params = useParams()
  const userId = params?.id as string | undefined

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [error, setError] = useState<string | null>(null)

  const [profilesMap, setProfilesMap] = useState<Record<string, any>>({})
  const [quotedPostsMap, setQuotedPostsMap] = useState<Record<number, any>>({})

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    const run = async () => {
      if (!userId) {
        setError('Invalid URL')
        setLoading(false)
        return
      }

      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
      if (user && user.id === userId) setIsOwnProfile(true)

      const { data: p, error: pe } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, bio')
        .eq('id', userId)
        .single()

      if (pe) {
        setError(pe.message)
      } else {
        setProfile((p as any) ?? null)
      }

      // Fetch follow counts
      const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId)

      const { count: following } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId)

      setFollowerCount(followers ?? 0)
      setFollowingCount(following ?? 0)

      if (user && user.id !== userId) {
        const { data: followStatus } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', userId)
          .single()

        setIsFollowing(!!followStatus)
      }

      const { data: ps, error: pse } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      const fetchedPosts = ps ?? []
      setPosts(fetchedPosts)

      // Fetch associated profiles and quoted posts for timeline items
      const allUserIds = Array.from(new Set(fetchedPosts.map((p: any) => p.user_id)))
      const quotedIds = fetchedPosts.map((p: any) => p.quoted_post_id).filter(Boolean)

      const [profilesRes, quotedPostsRes] = await Promise.all([
        allUserIds.length ? supabase.from('profiles').select('id, display_name, avatar_url').in('id', allUserIds) : Promise.resolve({ data: [] }),
        quotedIds.length ? supabase.from('posts').select('*').in('id', quotedIds) : Promise.resolve({ data: [] })
      ])

      const pMap: Record<string, any> = {}
      for (const pr of profilesRes.data ?? []) pMap[pr.id] = pr
      setProfilesMap(pMap)

      const qMap: Record<number, any> = {}
      for (const qp of quotedPostsRes.data ?? []) qMap[qp.id] = qp
      setQuotedPostsMap(qMap)

      setLoading(false)
    }

    run()
  }, [userId])

  const handleFollowToggle = async () => {
    if (!currentUser || isOwnProfile || !userId) return
    setFollowLoading(true)

    if (isFollowing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', userId)

      if (!error) {
        setIsFollowing(false)
        setFollowerCount(prev => Math.max(0, prev - 1))
      }
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: currentUser.id, following_id: userId })

      if (!error) {
        setIsFollowing(true)
        setFollowerCount(prev => prev + 1)
      }
    }
    setFollowLoading(false)
  }

  const name = profile?.display_name ?? 'Unknown User'
  const fallback = name.slice(0, 1).toUpperCase()

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <Link href="/" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
        ← ホームに戻る
      </Link>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="bg-zinc-900 border border-zinc-800/60 rounded-2xl p-5 flex items-center gap-4">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt="avatar"
            className="h-14 w-14 rounded-full object-cover ring-1 ring-zinc-700"
          />
        ) : (
          <div className="h-14 w-14 rounded-full bg-indigo-600 flex items-center justify-center text-xl font-semibold text-white">
            {fallback}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-zinc-100 truncate">{name}</p>
          <p className="text-xs text-zinc-500 truncate mt-0.5">{userId}</p>
          <div className="flex gap-4 mt-2 text-xs text-zinc-400">
            <div><span className="font-semibold text-zinc-200">{followingCount}</span> フォロー中</div>
            <div><span className="font-semibold text-zinc-200">{followerCount}</span> フォロワー</div>
          </div>
        </div>

        {currentUser && !isOwnProfile && (
          <Button
            variant={isFollowing ? "outline" : "default"}
            size="sm"
            onClick={handleFollowToggle}
            disabled={followLoading}
          >
            {isFollowing ? 'フォロー解除' : 'フォローする'}
          </Button>
        )}
      </div>

      {profile?.bio && (
        <div className="bg-zinc-900 border border-zinc-800/60 rounded-2xl p-5 text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">
          {profile.bio}
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-zinc-600 text-center py-8">Loading...</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-zinc-600 text-center py-8">まだ投稿がありません。</p>
        ) : (
          posts.map((p) => {
            const author = profilesMap[p.user_id]
            const displayName = author?.display_name ?? 'Unknown User'
            const authorFallback = displayName.slice(0, 1).toUpperCase()
            return (
              <div key={p.id} className="block bg-zinc-900 border border-zinc-800/60 rounded-2xl p-4 hover:border-zinc-700 transition-colors">
                <div onClick={() => window.location.href = `/p/${p.id}`} className="cursor-pointer">
                  {p.reply_to && (
                    <div className="text-xs text-zinc-500 mb-2 flex items-center gap-1.5 ml-1">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                      返信
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    {author?.avatar_url ? (
                      <img src={author.avatar_url} alt="avatar" className="h-10 w-10 rounded-full object-cover ring-1 ring-zinc-800" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-medium text-white shadow-inner">{authorFallback}</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-zinc-200 truncate">{displayName}</p>
                        <p className="text-xs text-zinc-500 truncate flex-shrink-0">{formatDate(p.created_at)}</p>
                      </div>
                      <p className="mt-1 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">{p.content}</p>

                      {p.media_url && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-zinc-800/60 bg-black/20">
                          <PostMedia src={p.media_url} alt="Attached Media" />
                        </div>
                      )}

                      {p.quoted_post_id && quotedPostsMap[p.quoted_post_id] && (
                        <div className="mt-3">
                          <QuotedPost
                            post={{
                              id: quotedPostsMap[p.quoted_post_id].id,
                              content: quotedPostsMap[p.quoted_post_id].content,
                              userId: quotedPostsMap[p.quoted_post_id].user_id,
                              authorName: profilesMap[quotedPostsMap[p.quoted_post_id].user_id]?.display_name ?? 'Unknown',
                              authorAvatar: profilesMap[quotedPostsMap[p.quoted_post_id].user_id]?.avatar_url ?? null,
                              mediaUrl: quotedPostsMap[p.quoted_post_id].media_url ?? null,
                              createdAt: quotedPostsMap[p.quoted_post_id].created_at,
                              quotedPostId: quotedPostsMap[p.quoted_post_id].quoted_post_id ?? null
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pl-13 flex items-center justify-between border-t border-zinc-800/40 pt-3">
                  <PostEngagement
                    postId={p.id}
                    postContent={p.content}
                    postAuthorName={displayName}
                    postAuthorAvatar={author?.avatar_url ?? null}
                    replyCount={0}
                    repostCount={0}
                    likeCount={0}
                  />
                  {currentUser?.id === p.user_id && (
                    <PostActions postId={p.id} authorUserId={p.user_id} initialContent={p.content} />
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </main>
  )
}
