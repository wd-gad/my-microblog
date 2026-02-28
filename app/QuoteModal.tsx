'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './supabase'
import ImageCropperModal from './ImageCropperModal'

const MAX_MB = 100
const MAX_BYTES = MAX_MB * 1024 * 1024

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
  const fileRef = useRef<HTMLInputElement>(null)
  const [content, setContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [cropModalSrc, setCropModalSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fallback = (quotedPost.authorName || 'U').slice(0, 1).toUpperCase()

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    if (f && f.size > MAX_BYTES) {
      setError(`ファイルサイズが ${MAX_MB}MB を超えています`)
      e.target.value = ''
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setError(null)

    if (f && f.type.startsWith('image/')) {
      setFile(f)
      const reader = new FileReader()
      reader.onload = () => {
        setCropModalSrc(reader.result as string)
      }
      reader.readAsDataURL(f)
    } else if (f && (f.type.startsWith('video/') || f.type.startsWith('audio/'))) {
      setFile(f)
      setPreviewUrl(URL.createObjectURL(f))
    } else {
      setFile(f)
      setPreviewUrl(null)
    }
  }

  const handleCropConfirm = (croppedFile: File) => {
    setFile(croppedFile)
    setPreviewUrl(URL.createObjectURL(croppedFile))
    setCropModalSrc(null)
  }

  const handleCropCancel = () => {
    setCropModalSrc(null)
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSkipCrop = () => {
    setCropModalSrc(null)
    if (file) {
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const submit = async () => {
    setError(null)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { setError('ログインが必要です'); return }

    const trimmed = content.trim()
    if (!trimmed && !file) { setError('テキストまたはファイルを入力してください'); return }

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
      quoted_post_id: quotedPost.id,
      ...(mediaUrl ? { media_url: mediaUrl } : {}),
    })
    setLoading(false)

    if (insertErr) { setError(insertErr.message); return }

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
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

        {file && (
          <div className="relative rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800">
            {previewUrl ? (
              file?.type.startsWith('video/') ? (
                <video src={previewUrl} controls className="w-full h-auto max-h-48 bg-black object-contain" />
              ) : file?.type.startsWith('audio/') ? (
                <div className="p-3 bg-zinc-900 flex items-center justify-center">
                  <audio src={previewUrl} controls className="w-full" />
                </div>
              ) : (
                <img src={previewUrl} alt="Preview" className="w-full h-auto max-h-48 object-contain bg-black" />
              )
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

        <div className="flex items-center justify-between">
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
              画像/メディア
            </button>
            <input ref={fileRef} type="file" accept="*/*" onChange={handleFile} className="hidden" />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={submit}
              disabled={loading || (!content.trim() && !file)}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 transition-colors px-3 py-1.5 text-xs font-semibold text-white"
            >
              {loading ? '投稿中…' : 'リツイート'}
            </button>
          </div>
        </div>
      </div>

      {cropModalSrc && (
        <ImageCropperModal
          imageSrc={cropModalSrc}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
          onSkipCrop={handleSkipCrop}
        />
      )}
    </div>
  )
}
