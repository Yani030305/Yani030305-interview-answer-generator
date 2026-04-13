import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

type CreditPackageRow = {
  package_id: string
  name: string
  credits: number
  price: number | string
  original_price: number | string | null
  bonus: number | null
  is_popular: boolean | null
  is_active: boolean
  sort_order: number
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching credit packages:', error)

      const defaultPackages: CreditPackageRow[] = [
        {
          package_id: 'basic',
          name: '基础套餐',
          credits: 100,
          price: 4.9,
          original_price: null,
          bonus: 0,
          is_popular: false,
          is_active: true,
          sort_order: 1,
        },
        {
          package_id: 'standard',
          name: '标准套餐',
          credits: 500,
          price: 19.9,
          original_price: 24.5,
          bonus: 0,
          is_popular: true,
          is_active: true,
          sort_order: 2,
        },
        {
          package_id: 'premium',
          name: '高级套餐',
          credits: 1000,
          price: 34.9,
          original_price: 49,
          bonus: 50,
          is_popular: false,
          is_active: true,
          sort_order: 3,
        },
        {
          package_id: 'professional',
          name: '专业套餐',
          credits: 2000,
          price: 59.9,
          original_price: 98,
          bonus: 150,
          is_popular: false,
          is_active: true,
          sort_order: 4,
        },
        {
          package_id: 'enterprise',
          name: '企业套餐',
          credits: 5000,
          price: 149.9,
          original_price: 245,
          bonus: 500,
          is_popular: false,
          is_active: true,
          sort_order: 5,
        },
      ]

      const packages = defaultPackages.map((pkg) => ({
        id: pkg.package_id,
        name: pkg.name,
        credits: pkg.credits,
        price: Number(pkg.price),
        originalPrice:
          pkg.original_price !== null ? Number(pkg.original_price) : undefined,
        bonus: pkg.bonus ?? 0,
        popular: pkg.is_popular ?? false,
      }))

      return NextResponse.json({ packages })
    }

    const packages = ((data ?? []) as CreditPackageRow[]).map((pkg) => ({
      id: pkg.package_id,
      name: pkg.name,
      credits: pkg.credits,
      price: Number(pkg.price),
      originalPrice:
        pkg.original_price !== null ? Number(pkg.original_price) : undefined,
      bonus: pkg.bonus ?? 0,
      popular: pkg.is_popular ?? false,
    }))

    return NextResponse.json({ packages })
  } catch (error) {
    console.error('Error in credit-packages API:', error)

    const defaultPackages = [
      {
        id: 'basic',
        name: '基础套餐',
        credits: 100,
        price: 4.9,
        originalPrice: undefined,
        bonus: 0,
        popular: false,
      },
      {
        id: 'standard',
        name: '标准套餐',
        credits: 500,
        price: 19.9,
        originalPrice: 24.5,
        bonus: 0,
        popular: true,
      },
      {
        id: 'premium',
        name: '高级套餐',
        credits: 1000,
        price: 34.9,
        originalPrice: 49,
        bonus: 50,
        popular: false,
      },
      {
        id: 'professional',
        name: '专业套餐',
        credits: 2000,
        price: 59.9,
        originalPrice: 98,
        bonus: 150,
        popular: false,
      },
      {
        id: 'enterprise',
        name: '企业套餐',
        credits: 5000,
        price: 149.9,
        originalPrice: 245,
        bonus: 500,
        popular: false,
      },
    ]

    return NextResponse.json({ packages: defaultPackages })
  }
}