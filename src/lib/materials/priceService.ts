'use client'

import { createBrowserClient } from '@supabase/ssr'

export interface MaterialPrice {
  id: string
  category: string
  material: string
  description: string | null
  unit: string
  price_kes: number
  price_usd: number
  region: string
  supplier: string | null
  supplier_contact: string | null
  in_stock: boolean
  last_verified: string
  updated_at: string
}

export interface PriceQuery {
  category?: string
  region?: string
  search?: string
  inStockOnly?: boolean
}

export interface CostCalculation {
  material: string
  unit: string
  quantity: number
  unitPrice: number
  total: number
  supplier: string | null
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function getMaterialPrices(
  query: PriceQuery = {}
): Promise<MaterialPrice[]> {
  let req = supabase
    .from('material_prices')
    .select('*')
    .order('category', { ascending: true })
    .order('material', { ascending: true })

  if (query.category) {
    req = req.eq('category', query.category)
  }
  if (query.region) {
    req = req.eq('region', query.region)
  }
  if (query.search) {
    req = req.ilike('material', `%${query.search}%`)
  }
  if (query.inStockOnly) {
    req = req.eq('in_stock', true)
  }

  const { data, error } = await req
  if (error) throw error
  return data || []
}

export async function getPriceByMaterial(
  material: string,
  region: string = 'mombasa'
): Promise<MaterialPrice | null> {
  const { data, error } = await supabase
    .from('material_prices')
    .select('*')
    .eq('region', region)
    .ilike('material', `%${material}%`)
    .single()

  if (error) return null
  return data
}

export async function calculateMaterialCosts(
  items: { material: string; quantity: number }[],
  region: string = 'mombasa'
): Promise<{
  calculations: CostCalculation[]
  subtotal: number
  contingency: number
  total: number
}> {
  const calculations: CostCalculation[] = []

  for (const item of items) {
    const price = await getPriceByMaterial(item.material, region)
    if (price) {
      calculations.push({
        material: price.material,
        unit: price.unit,
        quantity: item.quantity,
        unitPrice: price.price_kes,
        total: price.price_kes * item.quantity,
        supplier: price.supplier,
      })
    }
  }

  const subtotal = calculations.reduce((sum, c) => sum + c.total, 0)
  const contingency = subtotal * 0.125
  const total = subtotal + contingency

  return { calculations, subtotal, contingency, total }
}

export interface PriceHistoryEntry {
  recorded_at: string
  price_kes: number
  change_percent: number | null
}

export async function getPriceHistory(
  materialId: string,
  days: number = 90
): Promise<PriceHistoryEntry[]> {
  const from = new Date()
  from.setDate(from.getDate() - days)

  const { data, error } = await supabase
    .from('material_price_history')
    .select('recorded_at, price_kes, change_percent')
    .eq('material_id', materialId)
    .gte('recorded_at', from.toISOString())
    .order('recorded_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getMaterialCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from('material_prices')
    .select('category')
    .order('category')

  if (error) throw error
  const unique = [...new Set((data || []).map((d: { category: string }) => d.category))]
  return unique
}

export interface RegionalPrice {
  region: string
  price_kes: number
  difference: number
}

export async function compareRegionalPrices(
  material: string
): Promise<RegionalPrice[]> {
  const { data, error } = await supabase
    .from('material_prices')
    .select('region, price_kes')
    .ilike('material', `%${material}%`)
    .order('price_kes', { ascending: true })

  if (error) throw error
  if (!data || data.length === 0) return []

  const lowestPrice = data[0].price_kes
  return data.map((d: { region: string; price_kes: number }) => ({
    region: d.region,
    price_kes: d.price_kes,
    difference: ((d.price_kes - lowestPrice) / lowestPrice) * 100,
  }))
}
