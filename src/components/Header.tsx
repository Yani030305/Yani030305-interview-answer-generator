'use client'

import { useState, useEffect } from 'react'
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
    refreshCredits,
  } = useAuthStore()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const t = translations[uiLanguage]

  useEffect(() => {
    setMounted(true)
    
    // Header 不再负责认证初始化，只在需要时刷新积分
    // 认证初始化完全由 AuthGuard 负责
  }, [])

  if (!mounted) {
    return null
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('[Header] Logout failed:', error)
    } finally {
      setUser(null)
      setCredits(0)
      setAnswerHistory([])
      router.push('/auth')
    }
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
              <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded-lg whitespace-nowrap">
                <Coins className="h-3 w-3 text-yellow-500" />
                <span className="font-semibold">{credits}</span>
                <span className="text-xs text-muted-foreground">
                  {t.header.credits}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/recharge')}
                className="h-8 px-2 text-xs"
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
                <DropdownMenuItem onClick={() => router.push('/payment-history')}>
                  <Coins className="h-4 w-4 mr-2" />
                  充值历史
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/jd-analysis-history')}>
                  <Briefcase className="h-4 w-4 mr-2" />
                  深度拆解历史
                </DropdownMenuItem>
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
