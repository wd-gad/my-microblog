function isImage(url: string) {
  return /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|$)/i.test(url)
}
function isVideo(url: string) {
  return /\.(mp4|webm|mov|ogg|m4v)(\?|$)/i.test(url)
}

export default function MediaPreview({ url, compact = false }: { url: string; compact?: boolean }) {
  if (isImage(url)) {
    return (
      <img
        src={url}
        alt="attachment"
        className={`mt-2 rounded-xl object-cover w-full ${compact ? 'max-h-40' : 'max-h-96'}`}
      />
    )
  }
  if (isVideo(url)) {
    return (
      <video
        src={url}
        controls
        className={`mt-2 rounded-xl w-full ${compact ? 'max-h-40' : 'max-h-96'}`}
      />
    )
  }
  const filename = decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? 'ファイル')
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
      </svg>
      {filename}
    </a>
  )
}
