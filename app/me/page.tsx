'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Cropper from 'react-easy-crop'
import { Slider } from '@/components/ui/slider'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
type Profile = {
  display_name: string | null
  avatar_url: string | null
}

export default function MePage() {
    const [file, setFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [cropOpen, setCropOpen] = useState(false)

    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [status, setStatus] = useState<string | null>(null)
    const onPickFile = (f: File) => {
        if (previewUrl) URL.revokeObjectURL(previewUrl)
  setFile(f)
  const url = URL.createObjectURL(f)
  setPreviewUrl(url)
  setCrop({ x: 0, y: 0 })
  setZoom(1)
  setCroppedAreaPixels(null)
  setCropOpen(true)
}
const getCroppedBlob = async (imageSrc: string, cropPixels: any): Promise<Blob> => {
  const image: HTMLImageElement = await new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = imageSrc
  })

  const canvas = document.createElement('canvas')
  canvas.width = cropPixels.width
  canvas.height = cropPixels.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas ctx is null')

  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height
  )

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.92)
  })
  return blob
}
  const fallback = useMemo(() => {
    const base = displayName || email || 'U'
    return base.slice(0, 1).toUpperCase()
  }, [displayName, email])

  const loadOnce = async () => {
    setStatus(null)

    // もし何かで固まっても3秒で必ず抜ける（UIフリーズ防止）
    const timeout = setTimeout(() => {
      setLoading(false)
      setStatus('読み込みがタイムアウトしました。リロードしてください。')
    }, 3000)

    try {
      const { data, error } = await supabase.auth.getUser()
      if (error) {
        setStatus(error.message)
        setUserId(null)
        setEmail(null)
        setProfile(null)
        setDisplayName('')
        return
      }

      const user = data.user
      if (!user) {
        setUserId(null)
        setEmail(null)
        setProfile(null)
        setDisplayName('')
        setStatus('ログインしてください')
        return
      }

      setUserId(user.id)
      setEmail(user.email ?? null)

      const { data: p, error: pe } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .single()

      if (pe) {
        setStatus(pe.message)
        setProfile(null)
        setDisplayName('')
        return
      }

      setProfile((p as any) ?? null)
      setDisplayName(p?.display_name ?? '')
    } catch (e: any) {
      setStatus(String(e?.message ?? e))
      setUserId(null)
      setEmail(null)
      setProfile(null)
      setDisplayName('')
    } finally {
      clearTimeout(timeout)
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOnce()
    // onAuthStateChange は一旦外す（無限ループ/連発の温床）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveName = async () => {
    setStatus(null)
    setSaving(true)
    try {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) {
        setStatus('ログインしてください')
        return
      }

      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName, updated_at: new Date().toISOString() })
        .eq('id', user.id)

      if (error) {
        setStatus(error.message)
        return
      }

      setStatus('保存しました')
      setProfile((prev) => ({ ...(prev ?? { avatar_url: null, display_name: null }), display_name: displayName }))
    } finally {
      setSaving(false)
    }
  }

const uploadAvatarCropped = async () => {
  if (!file || !previewUrl || !croppedAreaPixels) {
    setStatus('画像を選択してトリミングしてください')
    return
  }

  setStatus(null)
  setUploading(true)
  try {
    const { data } = await supabase.auth.getUser()
    const user = data.user
    if (!user) {
      setStatus('ログインしてください')
      return
    }

    const blob = await getCroppedBlob(previewUrl, croppedAreaPixels)
    const path = `${user.id}/avatar.jpg`

    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })

    if (upErr) {
      setStatus(upErr.message)
      return
    }

    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
    // キャッシュ回避（同じURLだと更新が見えないことがある）
    const url = `${pub.publicUrl}?v=${Date.now()}`

    const { error: profErr } = await supabase
      .from('profiles')
      .update({ avatar_url: url, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (profErr) {
      setStatus(profErr.message)
      return
    }

    setProfile((prev) => ({ ...(prev ?? { avatar_url: null, display_name: null }), avatar_url: url }))
    setStatus('アイコン更新しました')
    setCropOpen(false)
  } catch (e: any) {
    setStatus(String(e?.message ?? e))
  } finally {
    setUploading(false)
  }
}

  return (
  <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">表示名とアイコンを編集できます</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => loadOnce()} disabled={loading}>
          Reload
        </Button>
        <Button variant="outline" onClick={() => (location.href = '/')}>
          Home
        </Button>
      </div>
    </div>

    {status && (
      <div
        className={`text-sm ${
          status.includes('しました') || status.includes('保存') ? 'text-green-600' : 'text-red-600'
        }`}
      >
        {status}
      </div>
    )}

    <Card>
      <CardHeader>
        <CardTitle className="text-base">Account</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : !userId ? (
          <p className="text-sm text-muted-foreground">ログインしてください。</p>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={profile?.avatar_url ?? ''} alt="avatar" />
                <AvatarFallback>{fallback}</AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{displayName || 'No display name'}</div>
                <div className="text-xs text-muted-foreground truncate">{email}</div>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs text-muted-foreground">表示名</label>
              <div className="flex gap-2">
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="表示名" />
                <Button onClick={saveName} disabled={saving}>
                  {saving ? 'Saving…' : '保存'}
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs text-muted-foreground">アイコン</label>

              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) onPickFile(f)
                  }}
                  disabled={uploading}
                />

                <Button variant="outline" onClick={() => setCropOpen(true)} disabled={!previewUrl}>
                  Crop
                </Button>

                <Button onClick={uploadAvatarCropped} disabled={uploading || !croppedAreaPixels}>
                  {uploading ? 'Uploading…' : 'Upload'}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">画像を選択 → Cropで調整 → Uploadで反映</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>

    {/* DialogはCardの外に出しておくと崩れにくい */}
    <Dialog open={cropOpen} onOpenChange={setCropOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>アイコンをトリミング（1:1）</DialogTitle>
        </DialogHeader>

        {!previewUrl ? (
          <p className="text-sm text-muted-foreground">画像を選択してください</p>
        ) : (
          <div className="space-y-4">
            <div className="relative w-full h-80 bg-black/5 rounded-md overflow-hidden">
              <Cropper
                image={previewUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
              />
            </div>
            <div className="space-y-2">
  <div className="text-xs text-muted-foreground">Zoom</div>
  <Slider
    value={[zoom]}
    min={1}
    max={3}
    step={0.01}
    onValueChange={(v) => setZoom(v[0] ?? 1)}
  />
</div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setCropOpen(false)}>
                Close
              </Button>
              <Button onClick={uploadAvatarCropped} disabled={uploading || !croppedAreaPixels}>
                {uploading ? 'Uploading…' : 'Upload'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  </main>
)
}