'use client'
import { useState } from 'react'
import ImageViewerModal from './ImageViewerModal'

export default function PostImage({ src, alt }: { src: string; alt: string }) {
    const [viewerOpen, setViewerOpen] = useState(false)

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
