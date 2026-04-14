'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  GraduationCap,
  Briefcase,
  Languages,
  Moon,
  Sun,
  User,
  LogOut,
  Coins,
  Plus,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/store'
import { useAuthStore } from '@/store/auth-store'
import { translations } from '@/lib/translations'
import { supabase } from '@/lib/supabase'

export function Header() {
  const router = useRouter()
  const { userMode, setUserMode, uiLanguage, setUILanguage } = useAppStore()
  const {
    user,
    setUser,
    credits,
    setCredits,
    setAnswerHistory,
    setHistoryLoading,
    setLoading,
    fetchAnswerHistory,
  } = useAuthStore()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const t = translations[uiLanguage]

  const loadUserData = useCallback(
    async (userId: string) => {
      try {
        // 先获取用户积分
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('credits')
          .eq('id', userId)
          .single()

        if (!profileError && profileData) {
          setCredits((profileData as any).credits ?? 0)
        }
        // 注意：查询失败时不再重置积分，保持当前值

        // 然后获取历史记录
        await fetchAnswerHistory(userId)
      } catch (e) {
        console.error('Failed to load user data:', e)
        // 发生错误时不再重置积分，保持当前值
        setAnswerHistory([])
      }
    },
    [fetchAnswerHistory, setCredits, setAnswerHistory]
  )

  useEffect(() => {
    let alive = true
    setMounted(true)

    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!alive) return

        if (session?.user) {
          setUser(session.user)
          // 异步加载用户数据，不阻塞页面渲染
          loadUserData(session.user.id).catch(err => {
            console.error('Failed to load user data:', err)
          })
        } else {
          // 只有当没有会话时才设置默认状态
          setUser(null)
          setCredits(0)
          setAnswerHistory([])
        }
      } catch (e) {
        console.error('Failed to initialize auth:', e)
        // 发生错误时设置默认状态
        setUser(null)
        setCredits(0)
        setAnswerHistory([])
      }
    }

    // 异步执行认证初始化，不阻塞页面渲染
    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!alive) return

      try {
        if (session?.user) {
          setUser(session.user)
          // 异步加载用户数据，不阻塞页面渲染
          loadUserData(session.user.id).catch(err => {
            console.error('Failed to load user data:', err)
          })
        } else {
          setUser(null)
          setCredits(0)
          setAnswerHistory([])
        }
      } catch (e) {
        console.error('Failed during auth state change:', e)
      }
    })

    return () => {
      alive = false
      subscription.unsubscribe()
    }
  }, [setUser, setCredits, setAnswerHistory, loadUserData])

  if (!mounted) {
    return null
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setCredits(0)
    setAnswerHistory([])
    router.push('/auth')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t.header.title}</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              {t.header.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
                <Coins className="h-4 w-4 text-yellow-500" />
                <span className="font-semibold">{credits}</span>
                <span className="text-sm text-muted-foreground">
                  {t.header.credits}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/recharge')}
                className="h-8"
              >
                <Plus className="h-3 w-3 mr-1" />
                {t.header.recharge}
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2 border-r pr-4">
            <GraduationCap
              className={`h-4 w-4 ${
                userMode === 'campus' ? 'text-primary' : 'text-muted-foreground'
              }`}
            />
            <Switch
              checked={userMode === 'experienced'}
              onCheckedChange={(checked) =>
                setUserMode(checked ? 'experienced' : 'campus')
              }
              aria-label="Toggle user mode"
            />
            <Briefcase
              className={`h-4 w-4 ${
                userMode === 'experienced'
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            />
            <span className="text-xs text-muted-foreground ml-1 hidden md:inline">
              {userMode === 'campus'
                ? t.header.campus
                : t.header.experienced}
            </span>
          </div>



          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-sm">
                  <p className="font-medium">{user.email}</p>
                </div>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  {t.header.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}