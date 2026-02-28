'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function MePage() {
  const [email, setEmail] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) {
        setStatus('ログインしてください')
        return
      }
      setEmail(user.email ?? null)

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .single()

      setDisplayName(profile?.display_name ?? '')
      setAvatarUrl(profile?.avatar_url ?? null)
    }
    load()
  }, [])

  const saveName = async () => {
    setStatus(null)
    setLoading(true)

    const { data } = await supabase.auth.getUser()
    const user = data.user
    if (!user) {
      setLoading(false)
      setStatus('ログインしてください')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    setLoading(false)
    setStatus(error ? error.message : '保存しました')
  }

  const uploadAvatar = async (file: File) => {
    setStatus(null)
    setLoading(true)

    const { data } = await supabase.auth.getUser()
    const user = data.user
    if (!user) {
      setLoading(false)
      setStatus('ログインしてください')
      return
    }

    const ext = file.name.split('.').pop() || 'png'
    const path = `${user.id}/avatar.${ext}`

    // 同名があれば上書きしたいので update を使う（無ければ upload に切り替える）
    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (upErr) {
      setLoading(false)
      setStatus(upErr.message)
      return
    }

    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = pub.publicUrl

    const { error: profErr } = await supabase
      .from('profiles')
      .update({ avatar_url: url, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    setAvatarUrl(url)
    setLoading(false)
    setStatus(profErr ? profErr.message : 'アイコン更新しました')
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <a href="/" style={{ display: 'inline-block', marginBottom: 16, fontSize: 14 }}>
        ← Home
      </a>

      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>My Profile</h1>

      {status && <p style={{ color: status.includes('保存') ? 'green' : 'crimson' }}>{status}</p>}

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 999,
            border: '1px solid #ddd',
            overflow: 'hidden',
            display: 'grid',
            placeItems: 'center',
            fontSize: 12,
            opacity: 0.7,
          }}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            'No Img'
          )}
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{email ?? ''}</div>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="表示名"
            style={{ border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', width: 260, marginTop: 6 }}
          />
          <div style={{ marginTop: 8 }}>
            <button
              onClick={saveName}
              disabled={loading}
              style={{ border: '1px solid #ddd', borderRadius: 8, padding: '6px 10px' }}
            >
              {loading ? '...' : '表示名を保存'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
          アイコン画像（png/jpg）
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) uploadAvatar(f)
          }}
        />
      </div>
    </main>
  )
}