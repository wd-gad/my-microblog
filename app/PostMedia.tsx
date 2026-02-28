'use client'
import { useState } from 'react'
import ImageViewerModal from './ImageViewerModal'

export default function PostMedia({ src, alt }: { src: string; alt: string }) {
    const [viewerOpen, setViewerOpen] = useState(false)

    const isVideo = src.match(/\.(mp4|webm|mov|mkv|ogg)(\?.*)?$/i)
    const isAudio = src.match(/\.(mp3|wav|ogg|m4a)(\?.*)?$/i)

    if (isVideo) {
        return (
            <div className="mt-3 rounded-xl overflow-hidden border border-zinc-800/60 bg-black">
                <video src={src} controls preload="metadata" className="w-full h-auto max-h-[28rem] object-contain" />
            </div>
        )
    }

    if (isAudio) {
        return (
            <div className="mt-3 rounded-xl overflow-hidden border border-zinc-800/60 bg-zinc-900 p-4">
                <audio src={src} controls preload="metadata" className="w-full" />
            </div>
        )
    }

    return (
        <>
            <div
                className="mt-3 rounded-xl overflow-hidden border border-zinc-800/60 cursor-zoom-in hover:brightness-110 transition-all active:scale-[0.98]"
                onClick={() => setViewerOpen(true)}
            >
                <img
                    src={src}
                    alt={alt}
                    className="w-full h-auto max-h-[28rem] object-contain bg-zinc-950"
                    loading="lazy"
                />
            </div>

            {viewerOpen && (
                <ImageViewerModal
                    src={src}
                    onClose={() => setViewerOpen(false)}
                />
            )}
        </>
    )
}
