'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './supabase'

type Props = {
  quotedPost: {
    id: number
    content: string
    authorName: string
    authorAvatar: string | null
  }
  onClose: () => void
  onSuccess: () => void
}

export default function QuoteModal({ quotedPost, onClose, onSuccess }: Props) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fallback = (quotedPost.authorName || 'U').slice(0, 1).toUpperCase()

  const submit = async () => {
    setError(null)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { setError('ログインが必要です'); return }

    setLoading(true)
    const { error } = await supabase.from('posts').insert({
      content: content.trim(),
      quoted_post_id: quotedPost.id,
    })
    setLoading(false)

    if (error) { setError(error.message); return }
    onSuccess()
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-2xl">
        <h2 className="text-sm font-semibold text-zinc-100">引用リツイート</h2>

        <textarea
          rows={3}
          placeholder="コメントを追加（任意）"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 resize-none outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
          autoFocus
        />

        {/* 引用元プレビュー */}
        <div className="border border-zinc-700/50 rounded-xl p-3 bg-zinc-950/60 space-y-1.5">
          <div className="flex items-center gap-2">
            {quotedPost.authorAvatar ? (
              <img src={quotedPost.authorAvatar} alt="avatar" className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <div className="h-5 w-5 rounded-full bg-indigo-700 flex items-center justify-center text-xs font-semibold text-white">
                {fallback}
              </div>
            )}
            <span className="text-xs font-medium text-zinc-400">{quotedPost.authorName || 'Anonymous'}</span>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">{quotedPost.content}</p>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 transition-colors px-3 py-1.5 text-xs font-semibold text-white"
          >
            {loading ? '投稿中…' : 'リツイート'}
          </button>
        </div>
      </div>
    </div>
  )
}
