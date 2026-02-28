import Link from 'next/link'
import MediaPreview from './MediaPreview'

type Props = {
  id: number
  content: string
  mediaUrl: string | null
  createdAt: string
  authorName: string
  authorAvatar: string | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

export default function QuotedPostCard({ id, content, mediaUrl, createdAt, authorName, authorAvatar }: Props) {
  const fallback = (authorName || 'U').slice(0, 1).toUpperCase()
  return (
    <Link
      href={`/p/${id}`}
      className="block mt-3 border border-zinc-700/50 rounded-xl p-3 bg-zinc-950/60 hover:border-zinc-600/60 transition-colors space-y-1.5"
    >
      <div className="flex items-center gap-2">
        {authorAvatar ? (
          <img src={authorAvatar} alt="avatar" className="h-5 w-5 rounded-full object-cover" />
        ) : (
          <div className="h-5 w-5 rounded-full bg-indigo-700 flex items-center justify-center text-xs font-semibold text-white">
            {fallback}
          </div>
        )}
        <span className="text-xs font-medium text-zinc-400">{authorName || 'Anonymous'}</span>
        <span className="text-xs text-zinc-600">{formatDate(createdAt)}</span>
      </div>
      {content && (
        <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap break-words line-clamp-4">{content}</p>
      )}
      {mediaUrl && <MediaPreview url={mediaUrl} compact />}
    </Link>
  )
}
