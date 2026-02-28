'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { useRouter } from 'next/navigation'

export default function PostActions(props: {
  postId: number
  authorUserId: string
  initialContent: string
}) {
  const router = useRouter()
  const [me, setMe] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState(props.initialContent)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setMe(data.user?.id ?? null)
    })
  }, [])

  const isMine = useMemo(() => me && me === props.authorUserId, [me, props.authorUserId])
  if (!isMine) return null

  const save = async () => {
    setErr(null)
    const trimmed = content.trim()
    if (!trimmed) { setErr('空投稿は保存できません'); return }

    setBusy(true)
    const { error } = await supabase
      .from('posts')
      .update({ content: trimmed, updated_at: new Date().toISOString() })
      .eq('id', props.postId)
    setBusy(false)

    if (error) { setErr(error.message); return }
    setOpen(false)
    router.refresh()
  }

  const del = async () => {
    if (!confirm('この投稿を削除します。よろしいですか？')) return
    setBusy(true)
    const { error } = await supabase.from('posts').delete().eq('id', props.postId)
    setBusy(false)
    if (error) { setErr(error.message); return }
    router.refresh()
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => { setContent(props.initialContent); setOpen(true) }}
        className="text-xs text-zinc-500 hover:text-indigo-400 transition-colors"
      >
        Edit
      </button>
      <button
        onClick={del}
        disabled={busy}
        className="text-xs text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-40"
      >
        Delete
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4 shadow-2xl">
            <h2 className="text-sm font-semibold text-white">Edit post</h2>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-3 text-sm text-white placeholder-zinc-500 resize-none outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
            />
            {err && <p className="text-xs text-red-400">{err}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={busy}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={busy}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-colors px-3 py-1.5 text-xs font-semibold text-white"
              >
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
