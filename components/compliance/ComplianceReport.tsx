'use client'

import { ComplianceReport as Report } from '@/lib/compliance/kenyaCompliance'
import { CheckCircle, AlertTriangle, XCircle, FileText, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface Props {
  report: Report
  projectId: string
}

const STATUS_CONFIG = {
  passed:  { icon: CheckCircle,    color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Passed' },
  warning: { icon: AlertTriangle,  color: 'text-amber-500',   bg: 'bg-amber-50',   border: 'border-amber-200',   label: 'Warning' },
  failed:  { icon: XCircle,        color: 'text-red-500',     bg: 'bg-red-50',     border: 'border-red-200',     label: 'Failed' },
}

const CATEGORY_LABELS: Record<string, string> = {
  setbacks:         'Setbacks & Boundaries',
  room_sizes:       'Room Sizes',
  floor_area_ratio: 'Floor Area Ratio',
  plot_coverage:    'Plot Coverage',
  heights:          'Building Height',
  parking:          'Parking',
  sanitation:       'Sanitation',
  ventilation:      'Ventilation & Light',
  fire_safety:      'Fire Safety',
  accessibility:    'Disability Access',
  structural:       'Structural',
  environmental:    'Environmental',
}

function ScoreRing({ score }: { score: number }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const progress = ((100 - score) / 100) * circumference
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={radius}
          fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-slate-800">{score}</span>
        <span className="text-xs text-slate-500 font-medium">/ 100</span>
      </div>
    </div>
  )
}

function RuleCard({ rule }: { rule: any }) {
  const [expanded, setExpanded] = useState(false)
  const config = STATUS_CONFIG[rule.status as keyof typeof STATUS_CONFIG]
  const Icon = config.icon

  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} p-4`}>
      <div
        className="flex items-start justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3">
          <Icon className={`${config.color} mt-0.5 flex-shrink-0`} size={18} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-800 text-sm">{rule.name}</span>
              {rule.isMandatory && (
                <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                  MANDATORY
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 mt-0.5">{rule.message}</p>
          </div>
        </div>
        {expanded
          ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0 mt-1" />
          : <ChevronDown size={16} className="text-slate-400 flex-shrink-0 mt-1" />
        }
      </div>

      {expanded && (
        <div className="mt-3 ml-7 space-y-2 border-t border-slate-200 pt-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-500 font-medium">Actual</span>
              <p className="text-slate-700">{rule.actualValue}</p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Required</span>
              <p className="text-slate-700">{rule.requiredValue}</p>
            </div>
          </div>
          {rule.recommendation && (
            <div className="text-xs bg-white rounded p-2 border border-slate-200">
              <span className="font-medium text-slate-600">Action: </span>
              <span className="text-slate-700">{rule.recommendation}</span>
            </div>
          )}
          <p className="text-xs text-slate-400">Ref: {rule.reference}</p>
        </div>
      )}
    </div>
  )
}

export default function ComplianceReport({ report, projectId }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'documents'>('overview')

  const statusConfig = STATUS_CONFIG[report.overallStatus]
  const StatusIcon = statusConfig.icon

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <ScoreRing score={report.overallScore} />
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
              <StatusIcon className={statusConfig.color} size={22} />
              <h2 className="text-xl font-bold text-slate-800">
                {report.overallStatus === 'passed' ? 'Compliance Passed' :
                 report.overallStatus === 'warning' ? 'Needs Attention' :
                 'Issues Found'}
              </h2>
            </div>
            <p className="text-slate-600 text-sm">{report.summary}</p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-4">
              <span className="flex items-center gap-1.5 text-sm">
                <CheckCircle size={14} className="text-emerald-500" />
                <span className="font-medium text-emerald-700">{report.passedRules.length} passed</span>
              </span>
              <span className="flex items-center gap-1.5 text-sm">
                <AlertTriangle size={14} className="text-amber-500" />
                <span className="font-medium text-amber-700">{report.warningRules.length} warnings</span>
              </span>
              <span className="flex items-center gap-1.5 text-sm">
                <XCircle size={14} className="text-red-500" />
                <span className="font-medium text-red-700">{report.failedRules.length} failed</span>
              </span>
            </div>
          </div>
        </div>

        <div className={`mt-4 rounded-xl p-3 flex items-center gap-3 ${
          report.submissionReady ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
        }`}>
          {report.submissionReady
            ? <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />
            : <XCircle size={18} className="text-red-500 flex-shrink-0" />
          }
          <div>
            <p className={`text-sm font-medium ${report.submissionReady ? 'text-emerald-800' : 'text-red-800'}`}>
              {report.submissionReady
                ? 'Ready for county submission'
                : 'Not ready for submission — resolve failed items first'}
            </p>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Clock size={12} />
              Estimated approval time: {report.estimatedApprovalTime}
            </p>
          </div>
        </div>
      </div>

      <div className="flex border-b border-slate-200">
        {(['overview', 'details', 'documents'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          {report.priorityActions.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-3">Priority Actions</h3>
              <ol className="space-y-2">
                {report.priorityActions.map((action, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-slate-700">{action}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {report.failedRules.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-800">Failed — Must Fix</h3>
              {report.failedRules.map(rule => (
                <RuleCard key={rule.code} rule={rule} />
              ))}
            </div>
          )}

          {report.warningRules.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-800">Warnings — Review Required</h3>
              {report.warningRules.map(rule => (
                <RuleCard key={rule.code} rule={rule} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'details' && (
        <div className="space-y-6">
          {Object.keys(CATEGORY_LABELS).map(category => {
            const categoryRules = [
              ...report.passedRules,
              ...report.warningRules,
              ...report.failedRules,
            ].filter(r => r.category === category)

            if (categoryRules.length === 0) return null

            return (
              <div key={category}>
                <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-2">
                  {CATEGORY_LABELS[category]}
                </h3>
                <div className="space-y-2">
                  {categoryRules.map(rule => (
                    <RuleCard key={rule.code} rule={rule} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">
            Required Submission Documents
          </h3>
          <div className="space-y-2">
            {report.requiredDocuments.map((doc, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <FileText size={16} className="text-blue-500 flex-shrink-0" />
                <span className="text-sm text-slate-700">{doc}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4">
            Submit to: Mombasa County Government — Physical Planning & Land Use Department,
            Treasury Square, Mombasa
          </p>
        </div>
      )}
    </div>
  )
}
