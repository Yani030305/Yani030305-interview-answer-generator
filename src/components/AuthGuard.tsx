'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { supabase } from '@/lib/supabase'

const publicPaths = ['/auth']

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading, setUser, setLoading, setCredits } = useAuthStore()

  useEffect(() => {
    const fetchCredits = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('credits')
          .eq('id', userId)
          .single()
        
        if (!error && data) {
          setCredits((data as any).credits)
        }
      } catch (e) {
        console.error('Failed to fetch credits:', e)
      }
    }

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchCredits(session.user.id)
        }
      } finally {
        setLoading(false)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchCredits(session.user.id)
        } else {
          setCredits(0)
          localStorage.removeItem('session_id')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [setUser, setLoading, setCredits])

  useEffect(() => {
    if (isLoading) return

    const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

    if (!user && !isPublicPath) {
      router.push('/auth')
    } else if (user && isPublicPath) {
      router.push('/')
    }
  }, [user, isLoading, pathname, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
