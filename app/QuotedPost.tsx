'use client'
import Link from 'next/link'
import PostMedia from './PostMedia'
import { useState } from 'react'
import { supabase } from './supabase'

export type QuotedPostProps = {
    id: number
    userId: string
    content: string
    mediaUrl: string | null
    createdAt: string
    authorName: string
    authorAvatar: string | null
    quotedPostId?: number | null
}

export default function QuotedPost({ post }: { post: QuotedPostProps }) {
    const [expanded, setExpanded] = useState(false)
    const [loadingNested, setLoadingNested] = useState(false)
    const [nestedQuote, setNestedQuote] = useState<QuotedPostProps | null>(null)

    const fallback = (post.authorName || 'U').slice(0, 1).toUpperCase()

    const handleExpand = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (expanded) {
            setExpanded(false)
            return
        }

        if (!nestedQuote && post.quotedPostId) {
            setLoadingNested(true)
            const { data: qData } = await supabase.from('posts').select('*').eq('id', post.quotedPostId).maybeSingle()
            if (qData) {
                const { data: pData } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', qData.user_id).maybeSingle()
                setNestedQuote({
                    id: qData.id,
                    userId: qData.user_id,
                    content: qData.content,
                    mediaUrl: qData.media_url,
                    createdAt: qData.created_at,
                    authorName: pData?.display_name || 'Anonymous',
                    authorAvatar: pData?.avatar_url || null,
                    quotedPostId: qData.quoted_post_id
                })
            }
            setLoadingNested(false)
        }
        setExpanded(true)
    }

    return (
        <div className="mt-3 border border-zinc-700/60 rounded-xl p-3 bg-zinc-950 hover:bg-zinc-900/80 transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); window.location.href = `/p/${post.id}` }}>
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

            {/* Nested Quote Expansion */}
            {post.quotedPostId && (
                <div className="mt-2" onClick={e => e.stopPropagation()}>
                    {!expanded ? (
                        <button
                            type="button"
                            onClick={handleExpand}
                            disabled={loadingNested}
                            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                            {loadingNested ? '読込中...' : 'さらに過去の引用を見る'}
                        </button>
                    ) : (
                        <div className="flex flex-col">
                            <button
                                type="button"
                                onClick={handleExpand}
                                className="text-xs font-medium text-zinc-500 hover:text-zinc-400 transition-colors flex items-center gap-1 mb-1"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="18 15 12 9 6 15" />
                                </svg>
                                閉じる
                            </button>
                            {nestedQuote ? (
                                <div className="-mt-1 border-l border-zinc-800 pl-3 ml-1.5 opacity-80">
                                    <QuotedPost post={nestedQuote} />
                                </div>
                            ) : (
                                <p className="text-xs text-zinc-500">参照先が見つかりません</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
