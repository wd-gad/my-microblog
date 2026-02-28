'use client'
import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'

// Helper function to create crop
export const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: { width: number; height: number; x: number; y: number }
): Promise<File | null> => {
    const image = new Image()
    image.src = imageSrc
    await new Promise((resolve) => {
        image.onload = resolve
    })

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    )

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            if (!blob) return resolve(null)
            const croppedFile = new File([blob], 'cropped-image.jpg', {
                type: 'image/jpeg',
            })
            resolve(croppedFile)
        }, 'image/jpeg')
    })
}

export default function ImageCropperModal({
    imageSrc,
    onCancel,
    onConfirm,
    onSkipCrop,
}: {
    imageSrc: string
    onCancel: () => void
    onConfirm: (file: File) => void
    onSkipCrop: () => void
}) {
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [aspect, setAspect] = useState<number | undefined>(undefined) // undefined = original aspect ratio
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
    const [processing, setProcessing] = useState(false)

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    const handleConfirm = async () => {
        if (!croppedAreaPixels || processing) return
        setProcessing(true)
        const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels)
        setProcessing(false)
        if (croppedFile) {
            onConfirm(croppedFile)
        } else {
            onCancel()
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm p-4">
            {/* Cropper Area */}
            <div className="relative flex-1 bg-black rounded-lg overflow-hidden">
                <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={aspect}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    classes={{ containerClassName: 'bg-black' }}
                />
            </div>

            {/* Controls */}
            <div className="w-full max-w-sm mx-auto p-4 space-y-5 bg-black">
                {/* Aspect Ratio Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                        onClick={() => setAspect(undefined)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${aspect === undefined ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                            }`}
                    >
                        Original
                    </button>
                    <button
                        onClick={() => setAspect(1)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${aspect === 1 ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                            }`}
                    >
                        Square (1:1)
                    </button>
                    <button
                        onClick={() => setAspect(4 / 5)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${aspect === 4 / 5 ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                            }`}
                    >
                        Portrait (4:5)
                    </button>
                    <button
                        onClick={() => setAspect(4 / 3)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${aspect === 4 / 3 ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                            }`}
                    >
                        Landscape (4:3)
                    </button>
                    <button
                        onClick={() => setAspect(16 / 9)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${aspect === 16 / 9 ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                            }`}
                    >
                        Wide (16:9)
                    </button>
                </div>

                {/* Zoom Slider */}
                <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400 font-medium w-8 text-right">Zoom</span>
                    <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="flex-1 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t border-zinc-800">
                    <button
                        onClick={onSkipCrop}
                        disabled={processing}
                        className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors sm:mr-auto"
                    >
                        元の画像をそのまま使う
                    </button>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onCancel}
                            disabled={processing}
                            className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors"
                        >
                            キャンセル
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={processing}
                            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                        >
                            {processing ? '処理中...' : '切り抜いて決定'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
