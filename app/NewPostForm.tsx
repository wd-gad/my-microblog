'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './supabase'

const MAX_MB = 100
const MAX_BYTES = MAX_MB * 1024 * 1024

export default function NewPostForm() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [content, setContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    if (f && f.size > MAX_BYTES) {
      setError(`ファイルサイズが ${MAX_MB}MB を超えています`)
      e.target.value = ''
      return
    }
    setError(null)
    setFile(f)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { setError('投稿するにはログインしてください'); return }

    const trimmed = content.trim()
    if (!trimmed && !file) return

    setLoading(true)
    let mediaUrl: string | null = null

    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${userData.user.id}/${Date.now()}.${ext}`
      const { data: up, error: upErr } = await supabase.storage
        .from('post-media')
        .upload(path, file, { cacheControl: '3600', upsert: false })

      if (upErr) { setError(upErr.message); setLoading(false); return }

      const { data: pub } = supabase.storage.from('post-media').getPublicUrl(up.path)
      mediaUrl = pub.publicUrl
    }

    const { error: insertErr } = await supabase.from('posts').insert({
      content: trimmed,
      ...(mediaUrl ? { media_url: mediaUrl } : {}),
    })
    setLoading(false)

    if (insertErr) { setError(insertErr.message); return }

    setContent('')
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="bg-zinc-900 border border-zinc-800/60 rounded-2xl p-4 space-y-3">
      <textarea
        rows={3}
        placeholder="いま何してる？"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full bg-transparent text-sm text-white placeholder-zinc-500 resize-none outline-none leading-relaxed"
      />

      {file && (
        <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-800/50 rounded-lg px-3 py-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
          <span className="truncate flex-1">{file.name}</span>
          <span className="text-zinc-600 shrink-0">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
          <button
            type="button"
            onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }}
            className="text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-zinc-800/60 pt-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            添付
          </button>
          <input ref={fileRef} type="file" accept="*/*" onChange={handleFile} className="hidden" />
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={loading || (!content.trim() && !file)}
          className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-4 py-1.5 text-xs font-semibold text-white"
        >
          {loading ? '投稿中…' : '投稿'}
        </button>
      </div>
    </form>
  )
}
