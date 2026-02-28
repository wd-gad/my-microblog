'use client'
import Link from 'next/link'
import PostMedia from './PostMedia'

type QuotedPostProps = {
    id: number
    userId: string
    content: string
    mediaUrl: string | null
    createdAt: string
    authorName: string
    authorAvatar: string | null
}

export default function QuotedPost({ post }: { post: QuotedPostProps }) {
    const fallback = (post.authorName || 'U').slice(0, 1).toUpperCase()

    return (
        <div className="mt-3 border border-zinc-700/60 rounded-xl p-3 bg-zinc-950 hover:bg-zinc-900/80 transition-colors cursor-pointer" onClick={() => window.location.href = `/p/${post.id}`}>
            <div className="flex items-center gap-2 mb-2">
                {post.authorAvatar ? (
                    <img src={post.authorAvatar} alt="avatar" className="h-5 w-5 rounded-full object-cover ring-1 ring-zinc-700" />
                ) : (
                    <div className="h-5 w-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-semibold text-white">
                        {fallback}
                    </div>
                )}
                <span className="text-xs font-semibold text-zinc-300">{post.authorName || 'Anonymous'}</span>
                <span className="text-[10px] text-zinc-500">
                    • {new Date(post.createdAt).toLocaleDateString('ja-JP')}
                </span>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap break-words line-clamp-4">
                {post.content}
            </p>

            {post.mediaUrl && (
                <div className="mt-2 opacity-80 pointer-events-none scale-95 origin-top-left">
                    <PostMedia src={post.mediaUrl} alt="Quote Attachment" />
                </div>
            )}
        </div>
    )
}
