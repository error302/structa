import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }
  return createClient(supabaseUrl, supabaseKey)
}

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY')
  }
  return new Anthropic({ apiKey })
}

const REFRESH_CATEGORIES = [
  { category: 'cement', searchContext: 'Bamburi cement price Kenya 2025' },
  { category: 'steel', searchContext: 'steel reinforcement bar price Kenya 2025' },
  { category: 'aggregates', searchContext: 'sand ballast price Mombasa 2025' },
  { category: 'roofing', searchContext: 'Mabati iron sheet price Kenya 2025' },
  { category: 'labour', searchContext: 'construction labour rate Kenya Coast 2025' },
]

interface PriceUpdateSuggestion {
  material: string
  suggestedPrice: number
  confidence: number
  reasoning: string
}

interface CurrentPrice {
  id: string
  material: string
  price_kes: number
  unit: string
}

async function getAIPriceSuggestions(
  category: string,
  currentPrices: CurrentPrice[],
  searchContext: string
): Promise<PriceUpdateSuggestion[]> {
  try {
    const anthropic = getAnthropicClient()
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `You are a construction cost expert for Kenya/Mombasa Coast region.

Current ${category} prices in our database:
${JSON.stringify(currentPrices, null, 2)}

Context: ${searchContext}

Based on your knowledge of Kenyan construction market trends as of early 2025:
- Has cement gone up due to fuel costs?
- Have steel prices changed due to import duties?
- Are labour rates shifting?

Suggest price updates as JSON array:
[{
  "material": string (exact match to above),
  "suggestedPrice": number (KES),
  "confidence": number (0-1),
  "reasoning": string (one sentence)
}]

Only suggest changes if confident. Return empty array if prices seem accurate.
Return ONLY valid JSON.`,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
    try {
      return JSON.parse(text)
    } catch {
      return []
    }
  } catch (error) {
    console.error('AI price suggestion error:', error)
    return []
  }
}

interface RefreshResult {
  category: string
  updated: number
  skipped: number
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseClient()

  console.log('🔄 Starting weekly price refresh...')
  const results: RefreshResult[] = []

  for (const { category, searchContext } of REFRESH_CATEGORIES) {
    const { data: currentPrices, error } = await supabase
      .from('material_prices')
      .select('id, material, price_kes, unit')
      .eq('category', category)
      .eq('region', 'mombasa')

    if (error || !currentPrices) {
      results.push({ category, updated: 0, skipped: -1 })
      continue
    }

    const suggestions = await getAIPriceSuggestions(
      category,
      currentPrices,
      searchContext
    )

    let updated = 0
    let skipped = 0

    for (const suggestion of suggestions) {
      if (suggestion.confidence < 0.75) {
        skipped++
        continue
      }

      const match = currentPrices.find(
        (p: CurrentPrice) => p.material.toLowerCase() === suggestion.material.toLowerCase()
      )

      if (!match) {
        skipped++
        continue
      }

      const changePercent = Math.abs(
        ((suggestion.suggestedPrice - match.price_kes) / match.price_kes) * 100
      )

      if (changePercent > 30) {
        await supabase.from('price_review_flags').insert({
          material_id: match.id,
          suggested_price: suggestion.suggestedPrice,
          current_price: match.price_kes,
          change_percent: changePercent,
          reasoning: suggestion.reasoning,
          status: 'pending_review',
        })
        skipped++
        continue
      }

      const { error: updateError } = await supabase
        .from('material_prices')
        .update({
          price_kes: suggestion.suggestedPrice,
          last_verified: new Date().toISOString(),
        })
        .eq('id', match.id)

      if (!updateError) updated++
      else skipped++
    }

    results.push({ category, updated, skipped })

    await new Promise(r => setTimeout(r, 1000))
  }

  console.log('✅ Price refresh complete:', results)

  return NextResponse.json({
    success: true,
    refreshedAt: new Date().toISOString(),
    results,
  })
}
