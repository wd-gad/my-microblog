'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './supabase'

export default function TimelineRealtime() {
    const router = useRouter()

    useEffect(() => {
        const channel = supabase.channel('realtime:posts')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'posts' },
                (payload) => {
                    // Trigger a silent soft reload on the server-components
                    // to push the new data into the tree seamlessly
                    router.refresh()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [router])

    return null
}
