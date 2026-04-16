'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth-store'

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset-password'

export default function AuthPage() {
  const router = useRouter()
  const { setUser } = useAuthStore()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [verifiedUserId, setVerifiedUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (mode === 'login') {
        await supabase.auth.signOut()
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        
        setUser(data.user)
        router.push('/')
      } else if (mode === 'signup') {
        if (password !== confirmPassword) {
          setMessage({
            text: '两次输入的密码不一致',
            type: 'error',
          })
          return
        }

        if (!phoneNumber || !/^1[3-9]\d{9}$/.test(phoneNumber)) {
          setMessage({
            text: '请输入有效的手机号码',
            type: 'error',
          })
          return
        }

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
        
        setTimeout(() => {
          router.push('/')
        }, 3000)
      } else if (mode === 'forgot') {
        if (!email || !phoneNumber) {
          setMessage({
            text: '请填写邮箱和手机号码',
            type: 'error',
          })
          return
        }

        if (!/^1[3-9]\d{9}$/.test(phoneNumber)) {
          setMessage({
            text: '请输入有效的手机号码',
            type: 'error',
          })
          return
        }

        const response = await fetch('/api/auth/verify-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            phoneNumber,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          setMessage({
            text: result.error || '验证失败，请稍后重试',
            type: 'error',
          })
          return
        }

        setVerifiedUserId(result.userId)
        setMode('reset-password')
        setMessage({
          text: '验证成功！请输入新密码',
          type: 'success',
        })
      } else if (mode === 'reset-password') {
        if (!newPassword || !confirmNewPassword) {
          setMessage({
            text: '请填写新密码',
            type: 'error',
          })
          return
        }

        if (newPassword !== confirmNewPassword) {
          setMessage({
            text: '两次输入的新密码不一致',
            type: 'error',
          })
          return
        }

        if (newPassword.length < 6) {
          setMessage({
            text: '密码长度至少为6位',
            type: 'error',
          })
          return
        }

        // 验证密码强度：必须包含大小写字母和数字
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(newPassword)) {
          setMessage({
            text: '密码必须包含大小写字母和数字',
            type: 'error',
          })
          return
        }

        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: verifiedUserId,
            newPassword,
            confirmPassword: confirmNewPassword,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          setMessage({
            text: result.error || '密码重置失败，请稍后重试',
            type: 'error',
          })
          return
        }

        setMessage({
          text: result.message || '密码重置成功！',
          type: 'success',
        })

        setTimeout(() => {
          setMode('login')
          setEmail('')
          setPhoneNumber('')
          setNewPassword('')
          setConfirmNewPassword('')
          setVerifiedUserId(null)
          setMessage(null)
        }, 3000)
      }
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : '发生错误'
      
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
      case 'reset-password':
        return '设置新密码'
    }
  }

  const getButtonText = () => {
    switch (mode) {
      case 'login':
        return '登录'
      case 'signup':
        return '注册'
      case 'forgot':
        return '验证身份'
      case 'reset-password':
        return '重置密码'
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
              {mode === 'forgot' && '输入您的邮箱和手机号码以验证身份'}
              {mode === 'reset-password' && '请输入您的新密码'}
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
            {mode !== 'reset-password' && (
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
            )}

            {(mode === 'signup' || mode === 'forgot') && (
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

            {(mode === 'login' || mode === 'signup') && (
              <div className="space-y-4">
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

            {mode === 'reset-password' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">新密码</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">确认新密码</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
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
            {mode === 'reset-password' && (
              <button
                type="button"
                onClick={() => {
                  setMode('login')
                  setEmail('')
                  setPhoneNumber('')
                  setNewPassword('')
                  setConfirmNewPassword('')
                  setVerifiedUserId(null)
                  setMessage(null)
                }}
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
