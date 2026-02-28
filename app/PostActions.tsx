'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './supabase'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function PostActions(props: {
  postId: number
  authorUserId: string
  initialContent: string
}) {
  const router = useRouter()
  const [me, setMe] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState(props.initialContent)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setMe(data.user?.id ?? null)
    })
  }, [])

  const isMine = useMemo(() => me && me === props.authorUserId, [me, props.authorUserId])
  if (!isMine) return null

  const save = async () => {
    setErr(null)
    const trimmed = content.trim()
    if (!trimmed) {
      setErr('空投稿は保存できません')
      return
    }

    setBusy(true)
    const { error } = await supabase
      .from('posts')
      .update({ content: trimmed })
      .eq('id', props.postId)

    setBusy(false)

    if (error) {
      setErr(error.message)
      return
    }

    setOpen(false)
    router.refresh()
  }

  const del = async () => {
    if (!confirm('この投稿を削除します。よろしいですか？')) return

    setErr(null)
    setBusy(true)
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', props.postId)

    setBusy(false)

    if (error) {
      setErr(error.message)
      return
    }

    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Edit
      </Button>
      <Button variant="ghost" size="sm" onClick={del} disabled={busy}>
        Delete
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg space-y-4">
          <DialogHeader>
            <DialogTitle>Edit post</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Textarea
  value={content}
  onChange={(e) => setContent(e.target.value)}
  rows={6}
  className="bg-background text-foreground"
/>
            {err && <div className="text-sm text-red-600">{err}</div>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={save} disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}