'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './supabase'

export default function ReplyForm({ parentId }: { parentId: number }) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setError('返信するにはログインしてください')
      return
    }
    const trimmed = content.trim()
    if (!trimmed) return
    setLoading(true)
    const { error } = await supabase.from('posts').insert({ content: trimmed, parent_id: parentId })
    setLoading(false)
    if (error) { setError(error.message); return }
    setContent('')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="bg-zinc-950 border border-zinc-800/60 rounded-xl p-3 space-y-2">
      <textarea
        rows={2}
        placeholder="返信を入力..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-600 resize-none outline-none leading-relaxed"
      />
      <div className="flex items-center justify-between">
        {error ? <p className="text-xs text-red-400">{error}</p> : <span />}
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-colors px-3 py-1 text-xs font-semibold text-white"
        >
          {loading ? '返信中…' : '返信'}
        </button>
      </div>
    </form>
  )
}
