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
import Link from 'next/link'
import PostMedia from '../PostMedia'
import QuotedPost from '../QuotedPost'
import PostActions from '../PostActions'
import PostEngagement from '../PostEngagement'

type Profile = {
  display_name: string | null
  avatar_url: string | null
  bio: string | null
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
  const [bio, setBio] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  const [posts, setPosts] = useState<any[]>([])
  const [profilesMap, setProfilesMap] = useState<Record<string, any>>({})
  const [quotedPostsMap, setQuotedPostsMap] = useState<Record<number, any>>({})
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)

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
        .select('display_name, avatar_url, bio')
        .eq('id', user.id)
        .single()

      if (pe) {
        setStatus(pe.message)
        setProfile(null)
        setDisplayName('')
        setBio('')
        return
      }

      setProfile((p as any) ?? null)
      setDisplayName(p?.display_name ?? '')
      setBio(p?.bio ?? '')

      // Fetch follow counts
      const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id)

      const { count: following } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id)

      setFollowerCount(followers ?? 0)
      setFollowingCount(following ?? 0)

      // Fetch own posts
      const { data: ps } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const fetchedPosts = ps ?? []
      setPosts(fetchedPosts)

      // Fetch associated profiles and quoted posts for timeline items
      const allUserIds = Array.from(new Set(fetchedPosts.map((p: any) => p.user_id)))
      const quotedIds = fetchedPosts.map((p: any) => p.quoted_post_id).filter(Boolean)

      const [profilesRes, quotedPostsRes] = await Promise.all([
        allUserIds.length ? supabase.from('profiles').select('id, display_name, avatar_url').in('id', allUserIds) : Promise.resolve({ data: [] }),
        quotedIds.length ? supabase.from('posts').select('*').in('id', quotedIds) : Promise.resolve({ data: [] })
      ])

      const pMap: Record<string, any> = {}
      for (const pr of profilesRes.data ?? []) pMap[pr.id] = pr
      setProfilesMap(pMap)

      const qMap: Record<number, any> = {}
      for (const qp of quotedPostsRes.data ?? []) qMap[qp.id] = qp
      setQuotedPostsMap(qMap)

    } catch (e: any) {
      setStatus(String(e?.message ?? e))
      setUserId(null)
      setEmail(null)
      setProfile(null)
      setDisplayName('')
      setBio('')
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

  const saveProfile = async () => {
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
        .update({ display_name: displayName, bio: bio, updated_at: new Date().toISOString() })
        .eq('id', user.id)

      if (error) {
        setStatus(error.message)
        return
      }

      setStatus('保存しました')
      setProfile((prev) => ({ ...(prev ?? { avatar_url: null, display_name: null, bio: null }), display_name: displayName, bio: bio }))
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
      const path = `${user.id}/avatar-${Date.now()}.jpg`

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

      setProfile((prev) => ({ ...(prev ?? { avatar_url: null, display_name: null, bio: null }), avatar_url: url }))
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
          className={`text-sm ${status.includes('しました') || status.includes('保存') ? 'text-green-600' : 'text-red-600'
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
                <Avatar className="h-14 w-14 border border-zinc-800">
                  <AvatarImage src={profile?.avatar_url ?? ''} alt="avatar" className="object-cover" />
                  <AvatarFallback>{fallback}</AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{displayName || 'No display name'}</div>
                  <div className="text-xs text-muted-foreground truncate">{email}</div>

                  <div className="flex gap-4 mt-2 text-xs text-zinc-400">
                    <div><span className="font-semibold text-zinc-200">{followingCount}</span> フォロー中</div>
                    <div><span className="font-semibold text-zinc-200">{followerCount}</span> フォロワー</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 border-t border-zinc-800/60 pt-4 mt-2">
                <label className="text-xs text-muted-foreground">表示名</label>
                <div className="flex gap-2">
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="表示名" />
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex justify-between items-end">
                  <label className="text-xs text-muted-foreground">自己紹介</label>
                  <div className="text-[10px] text-zinc-500">
                    <span className={bio.length > 1000 ? 'text-red-400 font-bold' : ''}>{bio.length}</span>
                    /1000
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="自己紹介を入力してください"
                  className="w-full bg-transparent border border-zinc-800 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-shadow"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={saveProfile} disabled={saving || bio.length > 1000}>
                  {saving ? 'Saving…' : '保存'}
                </Button>
              </div>

              <div className="grid gap-2 pt-4 border-t border-zinc-800/60 mt-2">
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

      {!loading && userId && (
        <div className="pt-6">
          <h2 className="text-xl font-semibold tracking-tight mb-4">You Posts</h2>
          <div className="space-y-3">
            {posts.length === 0 ? (
              <p className="text-sm text-zinc-600 text-center py-8">まだ投稿がありません。</p>
            ) : (
              posts.map((p) => {
                const displayAuthor = displayName || 'Unknown User'
                return (
                  <div key={p.id} className="block bg-zinc-900 border border-zinc-800/60 rounded-2xl p-4 hover:border-zinc-700 transition-colors">
                    <div onClick={() => window.location.href = `/p/${p.id}`} className="cursor-pointer">
                      {p.reply_to && (
                        <div className="text-xs text-zinc-500 mb-2 flex items-center gap-1.5 ml-1">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                          返信
                        </div>
                      )}

                      <div className="flex items-start gap-3">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="avatar" className="h-10 w-10 rounded-full object-cover ring-1 ring-zinc-800" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-medium text-white shadow-inner">{fallback}</div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-zinc-200 truncate">{displayAuthor}</p>
                            <p className="text-xs text-zinc-500 truncate flex-shrink-0">{new Date(p.created_at).toLocaleString('ja-JP')}</p>
                          </div>
                          <p className="mt-1 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">{p.content}</p>

                          {p.media_url && (
                            <div className="mt-3 rounded-xl overflow-hidden border border-zinc-800/60 bg-black/20">
                              <PostMedia src={p.media_url} alt="Attached Media" />
                            </div>
                          )}

                          {p.quoted_post_id && quotedPostsMap[p.quoted_post_id] && (
                            <div className="mt-3">
                              <QuotedPost
                                post={{
                                  id: quotedPostsMap[p.quoted_post_id].id,
                                  content: quotedPostsMap[p.quoted_post_id].content,
                                  userId: quotedPostsMap[p.quoted_post_id].user_id,
                                  authorName: profilesMap[quotedPostsMap[p.quoted_post_id].user_id]?.display_name ?? 'Unknown',
                                  authorAvatar: profilesMap[quotedPostsMap[p.quoted_post_id].user_id]?.avatar_url ?? null,
                                  mediaUrl: quotedPostsMap[p.quoted_post_id].media_url ?? null,
                                  createdAt: quotedPostsMap[p.quoted_post_id].created_at,
                                  quotedPostId: quotedPostsMap[p.quoted_post_id].quoted_post_id ?? null
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pl-13 flex items-center justify-between border-t border-zinc-800/40 pt-3">
                      <PostEngagement
                        postId={p.id}
                        postContent={p.content}
                        postAuthorName={displayAuthor}
                        postAuthorAvatar={profile?.avatar_url ?? null}
                        replyCount={0}
                        repostCount={0}
                        likeCount={0}
                      />
                      <PostActions postId={p.id} authorUserId={p.user_id} initialContent={p.content} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

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