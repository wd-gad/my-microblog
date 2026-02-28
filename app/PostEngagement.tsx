'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from './supabase'
import QuoteModal from './QuoteModal'

function IconChat() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function IconHeart({ filled }: { filled: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function IconRepost() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  )
}

export default function PostEngagement({
  postId,
  postContent,
  postAuthorName,
  postAuthorAvatar,
  replyCount,
  likeCount: initialLikeCount,
  repostCount: initialRepostCount,
}: {
  postId: number
  postContent: string
  postAuthorName: string
  postAuthorAvatar: string | null
  replyCount: number
  likeCount: number
  repostCount: number
}) {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [liked, setLiked] = useState(false)
  const [reposted, setReposted] = useState(false)
  const [myRepostId, setMyRepostId] = useState<number | null>(null)
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [repostCount, setRepostCount] = useState(initialRepostCount)
  const [busy, setBusy] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null
      setUserId(uid)
      if (!uid) return
      const [{ data: l }, { data: r }] = await Promise.all([
        supabase.from('likes').select('id').eq('post_id', postId).eq('user_id', uid).maybeSingle(),
        supabase.from('posts').select('id').eq('quoted_post_id', postId).eq('user_id', uid).maybeSingle(),
      ])
      setLiked(!!l)
      setReposted(!!r)
      setMyRepostId((r as any)?.id ?? null)
    })
  }, [postId])

  const toggleLike = async () => {
    if (!userId || busy) return
    setBusy(true)
    if (liked) {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', userId)
      setLiked(false)
      setLikeCount(c => c - 1)
    } else {
      await supabase.from('likes').insert({ post_id: postId, user_id: userId })
      setLiked(true)
      setLikeCount(c => c + 1)
    }
    setBusy(false)
  }

  const handleRepost = async () => {
    if (!userId) return
    if (reposted && myRepostId) {
      if (!confirm('リツイートを取り消しますか？')) return
      setBusy(true)
      await supabase.from('posts').delete().eq('id', myRepostId)
      setBusy(false)
      setReposted(false)
      setMyRepostId(null)
      setRepostCount(c => c - 1)
      router.refresh()
    } else {
      setQuoteOpen(true)
    }
  }

  return (
    <>
      <div className="flex items-center gap-5">
        <Link
          href={`/p/${postId}`}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-indigo-400 transition-colors"
        >
          <IconChat />
          <span>{replyCount}</span>
        </Link>
        <button
          onClick={toggleLike}
          disabled={busy}
          className={`flex items-center gap-1.5 text-xs transition-colors ${liked ? 'text-pink-500' : 'text-zinc-500 hover:text-pink-400'} ${!userId ? 'cursor-default' : ''}`}
        >
          <IconHeart filled={liked} />
          <span>{likeCount}</span>
        </button>
        <button
          onClick={handleRepost}
          disabled={busy}
          className={`flex items-center gap-1.5 text-xs transition-colors ${reposted ? 'text-emerald-500' : 'text-zinc-500 hover:text-emerald-400'} ${!userId ? 'cursor-default' : ''}`}
        >
          <IconRepost />
          <span>{repostCount}</span>
        </button>
      </div>

      {quoteOpen && (
        <QuoteModal
          quotedPost={{ id: postId, content: postContent, authorName: postAuthorName, authorAvatar: postAuthorAvatar }}
          onClose={() => setQuoteOpen(false)}
          onSuccess={() => {
            setQuoteOpen(false)
            setReposted(true)
            setRepostCount(c => c + 1)
          }}
        />
      )}
    </>
  )
}
