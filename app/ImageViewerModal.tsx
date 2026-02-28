'use client'
import { useEffect } from 'react'

export default function ImageViewerModal({
    src,
    onClose,
}: {
    src: string
    onClose: () => void
}) {
    // Prevent scrolling on the body while the modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden'
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => {
            document.body.style.overflow = 'unset'
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [onClose])

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-all backdrop-blur-sm"
                aria-label="Close"
            >
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>

            <img
                src={src}
                alt="Full screen viewer"
                className="max-w-full max-h-full object-contain select-none"
                onClick={(e) => e.stopPropagation()}
                loading="lazy"
            />
        </div>
    )
}
