'use client'

import { useState } from 'react'
import { supabase } from './supabase'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export default function NewPostForm() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setError('投稿するにはログインしてください')
      return
    }

    const trimmed = content.trim()
    if (!trimmed) return

    setLoading(true)
    const { error } = await supabase.from('posts').insert({ content: trimmed })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setContent('')
    window.location.reload()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Textarea
        rows={3}
        placeholder="いま何してる？"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? '投稿中…' : '投稿'}
        </Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </form>
  )
}