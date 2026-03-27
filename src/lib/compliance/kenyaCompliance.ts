import { COMPLIANCE_RULES, ComplianceInput, RuleResult } from './rules'

export interface ComplianceReport {
  overallScore: number
  overallStatus: 'passed' | 'warning' | 'failed'
  submissionReady: boolean
  passedRules: RuleReport[]
  warningRules: RuleReport[]
  failedRules: RuleReport[]
  summary: string
  priorityActions: string[]
  estimatedApprovalTime: string
  requiredDocuments: string[]
}

export interface RuleReport {
  code: string
  name: string
  category: string
  status: 'passed' | 'warning' | 'failed'
  isMandatory: boolean
  reference: string
  actualValue: string
  requiredValue: string
  message: string
  recommendation: string
}

export function extractComplianceInput(
  analysis: any,
  plan: any,
  projectData: any
): ComplianceInput {
  const totalFloorArea = plan.floorPlans?.reduce(
    (sum: number, f: any) => sum + (f.totalArea || 0), 0
  ) || 0

  const footprint = plan.floorPlans?.[0]
    ? (plan.floorPlans[0].dimensions?.width || 10) *
      (plan.floorPlans[0].dimensions?.depth || 10)
    : analysis.estimatedFootprint?.width * analysis.estimatedFootprint?.depth || 100

  const allRooms = plan.floorPlans?.flatMap((f: any) =>
    (f.rooms || []).map((r: any) => ({
      name: r.name || 'Room',
      area: (r.width || 3) * (r.height || 3),
      hasWindow: (r.windows?.length || 0) > 0,
      hasVentilation: (r.windows?.length || 0) > 0,
      floor: f.floor || 1,
    }))
  ) || []

  const bathrooms = allRooms.filter((r: any) =>
    r.name.toLowerCase().includes('bathroom') ||
    r.name.toLowerCase().includes('toilet') ||
    r.name.toLowerCase().includes('wc')
  ).length

  return {
    buildingType: (analysis.buildingType || 'residential') as 'residential' | 'commercial' | 'industrial' | 'mixed',
    county: projectData.county || 'mombasa',
    zone: projectData.zone || 'medium_density',
    plotArea: projectData.plotArea || 450,
    totalFloorArea,
    buildingFootprint: footprint,
    floors: analysis.estimatedFloors || 1,
    buildingHeight: (analysis.estimatedFloors || 1) * 3.2,
    rooms: allRooms,
    setbacks: {
      front: projectData.frontSetback || 4.5,
      rear: projectData.rearSetback || 3,
      left: projectData.leftSetback || 2,
      right: projectData.rightSetback || 2,
    },
    parkingSpaces: projectData.parkingSpaces || 1,
    hasRamp: projectData.hasRamp || false,
    bathroomCount: bathrooms,
    hasFireExit: projectData.hasFireExit || false,
    hasFireExtinguisher: projectData.hasFireExtinguisher || false,
    distanceToSewage: projectData.distanceToSewage || 50,
    hasSewerConnection: projectData.hasSewerConnection || false,
    hasSepticTank: projectData.hasSepticTank || true,
    nearCoast: projectData.nearCoast || false,
    treeCount: projectData.treeCount || 0,
  }
}

export async function runComplianceCheck(
  input: ComplianceInput
): Promise<ComplianceReport> {
  const passed: RuleReport[] = []
  const warnings: RuleReport[] = []
  const failed: RuleReport[] = []

  for (const rule of COMPLIANCE_RULES) {
    const result: RuleResult = rule.check(input)
    const report: RuleReport = {
      code: rule.code,
      name: rule.name,
      category: rule.category,
      status: result.status,
      isMandatory: rule.isMandatory,
      reference: rule.reference,
      actualValue: result.actualValue,
      requiredValue: result.requiredValue,
      message: result.message,
      recommendation: result.recommendation,
    }

    if (result.status === 'passed') passed.push(report)
    else if (result.status === 'warning') warnings.push(report)
    else failed.push(report)
  }

  const totalRules = COMPLIANCE_RULES.length
  const mandatoryFailed = failed.filter(r => r.isMandatory).length
  const score = Math.max(
    0,
    Math.round(
      ((passed.length + warnings.length * 0.5) / totalRules) * 100
    )
  )

  const overallStatus: 'passed' | 'warning' | 'failed' =
    mandatoryFailed > 0 ? 'failed' :
    failed.length > 0 || warnings.length > 2 ? 'warning' : 'passed'

  const submissionReady = mandatoryFailed === 0 && failed.length === 0

  const aiSummary = await generateComplianceSummary(
    input, passed, warnings, failed, score
  )

  return {
    overallScore: score,
    overallStatus,
    submissionReady,
    passedRules: passed,
    warningRules: warnings,
    failedRules: failed,
    summary: aiSummary.summary,
    priorityActions: aiSummary.priorityActions,
    estimatedApprovalTime: aiSummary.estimatedApprovalTime,
    requiredDocuments: aiSummary.requiredDocuments,
  }
}

async function generateComplianceSummary(
  input: ComplianceInput,
  passed: RuleReport[],
  warnings: RuleReport[],
  failed: RuleReport[],
  score: number
) {
  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const anthropic = new Anthropic()

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are an NCA-registered building professional reviewing a compliance check.

Building: ${input.buildingType} in ${input.county} — ${input.zone} zone
Compliance Score: ${score}/100
Passed: ${passed.length} rules
Warnings: ${warnings.map(w => w.name).join(', ') || 'None'}
Failed: ${failed.map(f => f.name).join(', ') || 'None'}

Generate a concise compliance advisory as JSON:
{
  "summary": "2-3 sentence plain English summary of compliance status",
  "priorityActions": ["Action 1", "Action 2", "Action 3"] (max 5 — most critical first),
  "estimatedApprovalTime": "e.g. 4-6 weeks if issues resolved",
  "requiredDocuments": ["Document 1", "Document 2"] (what the county will require for submission)
}

Be specific to Mombasa County processes. Return ONLY valid JSON.`,
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    return JSON.parse(text)
  } catch {
    return {
      summary: `Your building scored ${score}/100 on NCA compliance. ${failed.length} issues require attention before submission.`,
      priorityActions: failed.map(f => f.recommendation).filter(Boolean).slice(0, 5),
      estimatedApprovalTime: failed.length === 0 ? '3-4 weeks' : '6-10 weeks after corrections',
      requiredDocuments: [
        'Architectural drawings (4 sets)',
        'Structural drawings',
        'Title deed / lease agreement',
        'Survey plan',
        'NCA contractor registration',
      ],
    }
  }
}
