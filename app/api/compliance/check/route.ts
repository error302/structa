import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { runComplianceCheck, extractComplianceInput } from '@/lib/compliance/kenyaCompliance'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => cookieStore.set(name, value))
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId, analysis, plan, projectData } = await req.json()

  const complianceInput = extractComplianceInput(analysis, plan, projectData)
  const report = await runComplianceCheck(complianceInput)

  const { data: check, error: checkError } = await supabase
    .from('compliance_checks')
    .insert({
      project_id: projectId,
      overall_score: report.overallScore,
      overall_status: report.overallStatus,
      passed_rules: report.passedRules,
      warning_rules: report.warningRules,
      failed_rules: report.failedRules,
      county: complianceInput.county,
      building_type: complianceInput.buildingType,
      submission_ready: report.submissionReady,
    })
    .select()
    .single()

  if (checkError) {
    return NextResponse.json({ error: checkError.message }, { status: 500 })
  }

  const allResults = [
    ...report.passedRules,
    ...report.warningRules,
    ...report.failedRules,
  ].map(r => ({
    check_id: check.id,
    rule_code: r.code,
    rule_name: r.name,
    category: r.category,
    status: r.status,
    actual_value: r.actualValue,
    required_value: r.requiredValue,
    message: r.message,
    recommendation: r.recommendation,
    is_mandatory: r.isMandatory,
    reference: r.reference,
  }))

  await supabase.from('compliance_rule_results').insert(allResults)

  return NextResponse.json({ checkId: check.id, report })
}
