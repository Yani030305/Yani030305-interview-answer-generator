import { supabase } from '@/lib/supabase'

export const CREDITS_PER_GENERATION = 10

export async function getUserCredits(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', user.id)
    .single()

  if (error) throw error
  return (data as any).credits
}

export async function deductCredits(amount: number, description: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await (supabase as any).rpc('deduct_credits', {
    user_id: user.id,
    amount,
    description,
  })

  if (error) throw error
}

export async function addCredits(amount: number, type: string, description: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await (supabase as any).rpc('add_credits', {
    user_id: user.id,
    amount,
    type,
    description,
  })

  if (error) throw error
}

export async function getCreditHistory() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}
