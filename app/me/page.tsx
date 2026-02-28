'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

type Profile = {
  display_name: string | null
  avatar_url: string | null
}

export default function MePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  const fallback = useMemo(() => {
    const base = displayName || email || 'U'
    return base.slice(0, 1).toUpperCase()
  }, [displayName, email])

  const load = async () => {
    setStatus(null)
    setLoading(true)
    try {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) {
        setStatus('ログインしてください')
        setUserId(null)
        setEmail(null)
        setProfile(null)
        return
      }

      setUserId(user.id)
      setEmail(user.email ?? null)

      const { data: p, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .single()

      if (error) {
        setStatus(error.message)
        setProfile(null)
        setDisplayName('')
        return
      }

      setProfile((p as any) ?? null)
      setDisplayName(p?.display_name ?? '')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const { data: sub } = supabase.auth.onAuthStateChange(() => load())
    return () => sub.subscription.unsubscribe()
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

  const uploadAvatar = async (file: File) => {
    setStatus(null)
    setUploading(true)
    try {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) {
        setStatus('ログインしてください')
        return
      }

      const ext = (file.name.split('.').pop() || 'png').toLowerCase()
      const path = `${user.id}/avatar.${ext}`

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (upErr) {
        setStatus(upErr.message)
        return
      }

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = pub.publicUrl

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
        <Button variant="outline" onClick={() => (location.href = '/')}>
          Home
        </Button>
      </div>

      {status && (
        <div className={`text-sm ${status.includes('しました') || status.includes('保存') ? 'text-green-600' : 'text-red-600'}`}>
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
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="表示名"
                  />
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
                      if (f) uploadAvatar(f)
                    }}
                    disabled={uploading}
                  />
                  <Button variant="outline" disabled>
                    {uploading ? 'Uploading…' : 'Upload'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  画像を選ぶと自動でアップロードします（png/jpg推奨）
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  )
}