'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth-store'

type AuthMode = 'login' | 'signup' | 'forgot'

export default function AuthPage() {
  const router = useRouter()
  const { setUser } = useAuthStore()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (mode === 'login') {
        // First sign out any existing sessions
        await supabase.auth.signOut()
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        
        setUser(data.user)
        router.push('/')
      } else if (mode === 'signup') {
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .ilike('email', email)
          .maybeSingle()

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError
        }

        if (existingUser) {
          setMessage({
            text: '该邮箱已被注册，请直接登录',
            type: 'error',
          })
          return
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        })
        if (error) throw error
        setMessage({
          text: '注册成功！请检查您的邮箱确认注册。',
          type: 'success',
        })
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/`,
        })
        if (error) throw error
        setMessage({
          text: '重置密码请求已提交！如果没有收到邮件，请尝试直接用原密码登录，或联系客服。',
          type: 'success',
        })
      }
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : '发生错误',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const getTitle = () => {
    switch (mode) {
      case 'login':
        return '登录'
      case 'signup':
        return '注册'
      case 'forgot':
        return '重置密码'
    }
  }

  const getButtonText = () => {
    switch (mode) {
      case 'login':
        return '登录'
      case 'signup':
        return '注册'
      case 'forgot':
        return '发送重置链接'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => router.push('/')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回首页
        </Button>

        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">{getTitle()}</h1>
            <p className="text-muted-foreground mt-2">
              {mode === 'login' && '登录您的账户以继续使用'}
              {mode === 'signup' && '创建新账户开始使用'}
              {mode === 'forgot' && '输入您的邮箱以重置密码'}
            </p>
          </div>

          {message && (
            <div
              className={`p-4 rounded-lg ${
                message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">邮箱</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  请稍候...
                </>
              ) : (
                getButtonText()
              )}
            </Button>
          </form>

          <div className="flex flex-col gap-2 text-center text-sm">
            {mode === 'login' && (
              <>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-primary hover:underline"
                >
                  忘记密码？
                </button>
                <div className="text-muted-foreground">
                  还没有账户？
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="text-primary hover:underline ml-1"
                  >
                    立即注册
                  </button>
                </div>
              </>
            )}
            {mode === 'signup' && (
              <div className="text-muted-foreground">
                已有账户？
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-primary hover:underline ml-1"
                >
                  立即登录
                </button>
              </div>
            )}
            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-primary hover:underline"
              >
                返回登录
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
