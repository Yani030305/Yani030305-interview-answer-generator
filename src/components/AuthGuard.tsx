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
  const {
    authStatus,
    user,
    setUser,
    setAuthStatus,
    setCredits,
    setAccessToken,
  } = useAuthStore()

  useEffect(() => {
    console.log('[AuthGuard] ===== Auth initialization START =====')
    console.log('[AuthGuard] Current authStatus:', authStatus)

    const fetchCredits = async (userId: string) => {
      console.log('[AuthGuard] Async: Fetching credits for user:', userId)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('credits')
          .eq('id', userId)
          .single()

        if (!error && data) {
          setCredits((data as any).credits || 0)
          console.log('[AuthGuard] Async: Credits set to:', (data as any).credits)
        }
      } catch (e) {
        console.error('[AuthGuard] Async: Failed to fetch credits:', e)
      }
    }

    const initAuth = async () => {
      console.log('[AuthGuard] Step 1: Getting session...')

      try {
        const { data: { session } } = await supabase.auth.getSession()

        console.log('[AuthGuard] Step 2: Session obtained', session?.user?.id || 'NO USER')

        if (session?.user) {
          console.log('[AuthGuard] Step 3: User exists, setting auth state IMMEDIATELY')
          setUser(session.user)
          setAccessToken(session.access_token)
          setAuthStatus('authenticated')
          console.log('[AuthGuard] Step 4: Starting async credits fetch')
          fetchCredits(session.user.id)
        } else {
          console.log('[AuthGuard] Step 3: No user, setting auth state IMMEDIATELY')
          setUser(null)
          setAccessToken(null)
          setCredits(0)
          setAuthStatus('unauthenticated')
        }

      } catch (error) {
        console.error('[AuthGuard] Error during auth init:', error)
        setUser(null)
        setAccessToken(null)
        setCredits(0)
        setAuthStatus('unauthenticated')
      }

      console.log('[AuthGuard] ===== Auth initialization COMPLETE =====')
    }

    initAuth()

    console.log('[AuthGuard] Setting up auth state listener')
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthGuard] Auth state changed:', event)
        console.log('[AuthGuard] Session user:', session?.user?.id || 'NO USER')

        if (session?.user) {
          console.log('[AuthGuard] onAuthStateChange: Setting auth state IMMEDIATELY')
          setUser(session.user)
          setAccessToken(session.access_token)
          setAuthStatus('authenticated')
          console.log('[AuthGuard] onAuthStateChange: Starting async credits fetch')
          fetchCredits(session.user.id)
        } else {
          console.log('[AuthGuard] onAuthStateChange: Setting auth state IMMEDIATELY')
          setUser(null)
          setAccessToken(null)
          setCredits(0)
          setAuthStatus('unauthenticated')
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('session_id')
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [setUser, setAuthStatus, setCredits, setAccessToken])

  useEffect(() => {
    if (authStatus === 'initializing') {
      console.log('[AuthGuard] Navigation check: still initializing, skip')
      return
    }

    console.log('[AuthGuard] Navigation check START')
    console.log('[AuthGuard] authStatus:', authStatus)
    console.log('[AuthGuard] user:', user?.id || 'null')
    console.log('[AuthGuard] pathname:', pathname)

    const isPublicPath = publicPaths.some(path => pathname.startsWith(path))
    console.log('[AuthGuard] isPublicPath:', isPublicPath)

    if (!isPublicPath && authStatus === 'unauthenticated') {
      console.log('[AuthGuard] Need auth, redirecting to /auth')
      router.replace('/auth')
    } else if (isPublicPath && authStatus === 'authenticated') {
      console.log('[AuthGuard] Authenticated on public path, redirecting to /')
      router.replace('/')
    } else {
      console.log('[AuthGuard] No redirect needed, authStatus:', authStatus)
    }
  }, [authStatus, user, pathname, router])

  if (authStatus === 'initializing') {
    console.log('[AuthGuard] Rendering FULL SCREEN LOADING (initializing)')
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg text-muted-foreground">加载中...</p>
          <p className="text-sm text-muted-foreground mt-2">HireMind AI</p>
        </div>
      </div>
    )
  }

  console.log('[AuthGuard] Rendering children - auth complete, authStatus:', authStatus)
  return <>{children}</>
}
