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
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
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
        // Validate confirm password
        if (password !== confirmPassword) {
          setMessage({
            text: '两次输入的密码不一致',
            type: 'error',
          })
          return
        }

        // Validate phone number
        if (!phoneNumber || !/^1[3-9]\d{9}$/.test(phoneNumber)) {
          setMessage({
            text: '请输入有效的手机号码',
            type: 'error',
          })
          return
        }

        // Call backend register API
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            phoneNumber,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          setMessage({
            text: result.error || '注册失败，请稍后重试',
            type: 'error',
          })
          return
        }

        setMessage({
          text: result.message || '注册成功！',
          type: 'success',
        })
        
        // 3秒后跳转到首页
        setTimeout(() => {
          router.push('/')
        }, 3000)
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
      let errorMessage = error instanceof Error ? error.message : '发生错误'
      
      // 处理密码验证错误，改为中文提示
      if (error instanceof Error && error.message.includes('Password should contain at least one character of each')) {
        errorMessage = '密码必须包含大小写字母和数字'
      }
      
      setMessage({
        text: errorMessage,
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
              <div className="space-y-4">
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">手机号码</label>
                    <div className="relative">
                      <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <Input
                        type="tel"
                        placeholder="13812345678"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="pl-10"
                        required
                        pattern="^1[3-9]\d{9}$"
                      />
                    </div>
                  </div>
                )}

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

                {mode === 'signup' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">确认密码</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                )}
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
