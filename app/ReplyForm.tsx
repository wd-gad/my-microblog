'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './supabase'

const MAX_MB = 100
const MAX_BYTES = MAX_MB * 1024 * 1024

export default function ReplyForm({ parentId }: { parentId: number }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [content, setContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    if (f && f.size > MAX_BYTES) {
      setError(`ファイルサイズが ${MAX_MB}MB を超えています`)
      e.target.value = ''
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setError(null)
    setFile(f)
    if (f && f.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(f))
    } else {
      setPreviewUrl(null)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setError('返信するにはログインしてください')
      return
    }
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
      parent_id: parentId,
      ...(mediaUrl ? { media_url: mediaUrl } : {}),
    })

    setLoading(false)
    if (insertErr) { setError(insertErr.message); return }

    setContent('')
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="bg-zinc-950 border border-zinc-800/60 rounded-xl p-3 space-y-3">
      <textarea
        rows={2}
        placeholder="返信を入力..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full bg-transparent text-sm text-white placeholder-zinc-500 resize-none outline-none leading-relaxed"
      />

      {file && (
        <div className="relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="w-full h-auto max-h-48 object-cover" />
          ) : (
            <div className="flex items-center gap-2 text-xs text-zinc-400 p-2">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              <span className="truncate flex-1 font-medium">{file.name}</span>
              <span className="text-zinc-600 shrink-0">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              if (previewUrl) URL.revokeObjectURL(previewUrl)
              setPreviewUrl(null)
              setFile(null)
              if (fileRef.current) fileRef.current.value = ''
            }}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-zinc-800/60 pt-2">
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
            画像
          </button>
          <input ref={fileRef} type="file" accept="*/*" onChange={handleFile} className="hidden" />
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={loading || (!content.trim() && !file)}
          className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-colors px-3 py-1 text-xs font-semibold text-white"
        >
          {loading ? '返信中…' : '返信'}
        </button>
      </div>
    </form>
  )
}
