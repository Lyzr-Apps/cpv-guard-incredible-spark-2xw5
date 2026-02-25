'use client'

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import parseLLMJson from '@/lib/jsonParser'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  FiHome,
  FiSettings,
  FiClipboard,
  FiFileText,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiChevronUp,
  FiAlertTriangle,
  FiAlertCircle,
  FiCheckCircle,
  FiInfo,
  FiPlus,
  FiTrash2,
  FiEdit3,
  FiSave,
  FiDownload,
  FiUpload,
  FiSearch,
  FiActivity,
  FiShield,
  FiLoader,
  FiX,
  FiClock,
  FiTrendingUp,
  FiTrendingDown,
  FiMinus,
  FiArrowRight,
  FiPrinter
} from 'react-icons/fi'

// ==================== TYPES ====================

interface ParameterConfig {
  id: string
  parameter_name: string
  unit: string
  lower_limit: string
  upper_limit: string
  target_value: string
  active: boolean
}

interface StageConfig {
  [stage: string]: ParameterConfig[]
}

interface ParameterResult {
  parameter_name: string
  unit: string
  measured_value: string
  lower_limit: string
  upper_limit: string
  target_value: string
  status: string
  severity: string
  deviation_notes: string
}

interface TrendAnalysis {
  parameter_name: string
  trend_type: string
  description: string
  risk_level: string
}

interface Anomaly {
  parameter_name: string
  anomaly_type: string
  description: string
  severity: string
}

interface AnalysisSummary {
  total_parameters_checked: number
  critical_count: number
  major_count: number
  minor_count: number
  pass_count: number
  missing_count: number
  overall_status: string
}

interface BMRAnalysisResult {
  batch_id: string
  stage: string
  analysis_timestamp: string
  summary: AnalysisSummary
  parameter_results: ParameterResult[]
  trend_analysis: TrendAnalysis[]
  anomalies: Anomaly[]
}

interface ExecutiveSummary {
  overall_status: string
  risk_assessment: string
  key_findings: string
  batch_disposition_recommendation: string
}

interface StageFinding {
  stage_name: string
  status: string
  critical_flags: number
  major_flags: number
  minor_flags: number
  findings_detail: string
  cross_stage_correlations: string
}

interface HistoricalComparison {
  previous_batches_compared: number
  trend_direction: string
  comparison_notes: string
}

interface Recommendation {
  priority: number
  severity: string
  affected_parameters: string
  action: string
  timeline: string
}

interface CFRPart11Notes {
  electronic_record_integrity: string
  audit_trail_observations: string
  data_integrity_flags: string
  signature_requirements: string
}

interface ComplianceReportResult {
  report_id: string
  batch_id: string
  generated_at: string
  executive_summary: ExecutiveSummary
  stage_findings: StageFinding[]
  historical_comparison: HistoricalComparison
  recommendations: Recommendation[]
  cfr_part_11_notes: CFRPart11Notes
}

interface StoredAnalysis {
  batch_id: string
  stage: string
  timestamp: string
  result: BMRAnalysisResult
}

// ==================== CONSTANTS ====================

const BMR_AGENT_ID = '699f4fa1f2130afa9fdb13a7'
const REPORT_AGENT_ID = '699f4fbef2130afa9fdb13a9'

const STAGES = ['Granulation', 'Compression', 'Coating', 'Packaging'] as const

const AGENT_INFO = [
  { id: BMR_AGENT_ID, name: 'BMR Compliance Analyzer', model: 'OpenAI GPT-4.1', purpose: 'Analyzes batch parameters against configured limits' },
  { id: REPORT_AGENT_ID, name: 'Compliance Report Generator', model: 'Anthropic Claude Sonnet 4.5', purpose: 'Generates comprehensive compliance reports' },
]

const DEFAULT_STAGE_CONFIGS: StageConfig = {
  Granulation: [
    { id: 'g1', parameter_name: 'Impeller Speed', unit: 'RPM', lower_limit: '150', upper_limit: '250', target_value: '200', active: true },
    { id: 'g2', parameter_name: 'Amperage', unit: 'A', lower_limit: '5', upper_limit: '15', target_value: '10', active: true },
    { id: 'g3', parameter_name: 'Product Temperature', unit: 'C', lower_limit: '40', upper_limit: '60', target_value: '50', active: true },
    { id: 'g4', parameter_name: 'Moisture Content', unit: '%', lower_limit: '1', upper_limit: '3', target_value: '2', active: true },
    { id: 'g5', parameter_name: 'Granule Size (D50)', unit: 'um', lower_limit: '200', upper_limit: '800', target_value: '500', active: true },
  ],
  Compression: [
    { id: 'c1', parameter_name: 'Compression Force', unit: 'kN', lower_limit: '10', upper_limit: '30', target_value: '20', active: true },
    { id: 'c2', parameter_name: 'Tablet Weight', unit: 'mg', lower_limit: '180', upper_limit: '220', target_value: '200', active: true },
    { id: 'c3', parameter_name: 'Hardness', unit: 'kPa', lower_limit: '4', upper_limit: '8', target_value: '6', active: true },
    { id: 'c4', parameter_name: 'Thickness', unit: 'mm', lower_limit: '3', upper_limit: '5', target_value: '4', active: true },
    { id: 'c5', parameter_name: 'Friability', unit: '%', lower_limit: '0', upper_limit: '1', target_value: '0.5', active: true },
  ],
  Coating: [
    { id: 'ct1', parameter_name: 'Inlet Temperature', unit: 'C', lower_limit: '50', upper_limit: '70', target_value: '60', active: true },
    { id: 'ct2', parameter_name: 'Spray Rate', unit: 'g/min', lower_limit: '5', upper_limit: '15', target_value: '10', active: true },
    { id: 'ct3', parameter_name: 'Pan Speed', unit: 'RPM', lower_limit: '5', upper_limit: '12', target_value: '8', active: true },
    { id: 'ct4', parameter_name: 'Exhaust Temperature', unit: 'C', lower_limit: '40', upper_limit: '55', target_value: '47', active: true },
    { id: 'ct5', parameter_name: 'Weight Gain', unit: '%', lower_limit: '2', upper_limit: '5', target_value: '3.5', active: true },
  ],
  Packaging: [
    { id: 'p1', parameter_name: 'Seal Strength', unit: 'N/15mm', lower_limit: '1.5', upper_limit: '3.5', target_value: '2.5', active: true },
    { id: 'p2', parameter_name: 'Fill Weight', unit: '%', lower_limit: '98', upper_limit: '102', target_value: '100', active: true },
    { id: 'p3', parameter_name: 'Leak Test', unit: 'mbar', lower_limit: '0', upper_limit: '0.5', target_value: '0.1', active: true },
    { id: 'p4', parameter_name: 'Print Quality Score', unit: '%', lower_limit: '90', upper_limit: '100', target_value: '98', active: true },
    { id: 'p5', parameter_name: 'Line Speed', unit: 'ppm', lower_limit: '40', upper_limit: '80', target_value: '60', active: true },
  ],
}

// ==================== SAMPLE DATA ====================

const SAMPLE_ANALYSES: StoredAnalysis[] = [
  {
    batch_id: 'BX-2025-0142',
    stage: 'Granulation',
    timestamp: '2025-02-24T14:30:00Z',
    result: {
      batch_id: 'BX-2025-0142',
      stage: 'Granulation',
      analysis_timestamp: '2025-02-24T14:30:00Z',
      summary: { total_parameters_checked: 5, critical_count: 1, major_count: 1, minor_count: 0, pass_count: 3, missing_count: 0, overall_status: 'FAIL' },
      parameter_results: [
        { parameter_name: 'Impeller Speed', unit: 'RPM', measured_value: '195', lower_limit: '150', upper_limit: '250', target_value: '200', status: 'PASS', severity: 'none', deviation_notes: 'Within acceptable range' },
        { parameter_name: 'Amperage', unit: 'A', measured_value: '17.2', lower_limit: '5', upper_limit: '15', target_value: '10', status: 'FAIL', severity: 'Critical', deviation_notes: 'Exceeds upper limit by 14.7%. May indicate over-granulation or impeller wear.' },
        { parameter_name: 'Product Temperature', unit: 'C', measured_value: '58', lower_limit: '40', upper_limit: '60', target_value: '50', status: 'PASS', severity: 'none', deviation_notes: 'Near upper limit but within range' },
        { parameter_name: 'Moisture Content', unit: '%', measured_value: '3.4', lower_limit: '1', upper_limit: '3', target_value: '2', status: 'FAIL', severity: 'Major', deviation_notes: 'Elevated moisture content may affect downstream compression quality.' },
        { parameter_name: 'Granule Size (D50)', unit: 'um', measured_value: '520', lower_limit: '200', upper_limit: '800', target_value: '500', status: 'PASS', severity: 'none', deviation_notes: 'Within acceptable range' },
      ],
      trend_analysis: [
        { parameter_name: 'Amperage', trend_type: 'increasing', description: 'Steady increase over last 5 batches suggesting equipment degradation', risk_level: 'High' },
        { parameter_name: 'Moisture Content', trend_type: 'increasing', description: 'Gradual upward trend over last 3 batches', risk_level: 'Medium' },
      ],
      anomalies: [
        { parameter_name: 'Amperage', anomaly_type: 'Spike', description: 'Sudden spike correlated with impeller wear pattern', severity: 'Critical' },
      ],
    },
  },
  {
    batch_id: 'BX-2025-0141',
    stage: 'Compression',
    timestamp: '2025-02-23T10:15:00Z',
    result: {
      batch_id: 'BX-2025-0141',
      stage: 'Compression',
      analysis_timestamp: '2025-02-23T10:15:00Z',
      summary: { total_parameters_checked: 5, critical_count: 0, major_count: 0, minor_count: 1, pass_count: 4, missing_count: 0, overall_status: 'PASS' },
      parameter_results: [
        { parameter_name: 'Compression Force', unit: 'kN', measured_value: '21', lower_limit: '10', upper_limit: '30', target_value: '20', status: 'PASS', severity: 'none', deviation_notes: 'Within range' },
        { parameter_name: 'Tablet Weight', unit: 'mg', measured_value: '202', lower_limit: '180', upper_limit: '220', target_value: '200', status: 'PASS', severity: 'none', deviation_notes: 'Within range' },
        { parameter_name: 'Hardness', unit: 'kPa', measured_value: '7.8', lower_limit: '4', upper_limit: '8', target_value: '6', status: 'PASS', severity: 'Minor', deviation_notes: 'Near upper limit at 97.5% of max; monitor closely' },
        { parameter_name: 'Thickness', unit: 'mm', measured_value: '4.1', lower_limit: '3', upper_limit: '5', target_value: '4', status: 'PASS', severity: 'none', deviation_notes: 'Within range' },
        { parameter_name: 'Friability', unit: '%', measured_value: '0.4', lower_limit: '0', upper_limit: '1', target_value: '0.5', status: 'PASS', severity: 'none', deviation_notes: 'Within range' },
      ],
      trend_analysis: [
        { parameter_name: 'Hardness', trend_type: 'increasing', description: 'Gradual increase over last 3 batches', risk_level: 'Low' },
      ],
      anomalies: [],
    },
  },
  {
    batch_id: 'BX-2025-0140',
    stage: 'Coating',
    timestamp: '2025-02-22T09:00:00Z',
    result: {
      batch_id: 'BX-2025-0140',
      stage: 'Coating',
      analysis_timestamp: '2025-02-22T09:00:00Z',
      summary: { total_parameters_checked: 5, critical_count: 0, major_count: 1, minor_count: 0, pass_count: 4, missing_count: 0, overall_status: 'FAIL' },
      parameter_results: [
        { parameter_name: 'Inlet Temperature', unit: 'C', measured_value: '62', lower_limit: '50', upper_limit: '70', target_value: '60', status: 'PASS', severity: 'none', deviation_notes: 'Within range' },
        { parameter_name: 'Spray Rate', unit: 'g/min', measured_value: '16.3', lower_limit: '5', upper_limit: '15', target_value: '10', status: 'FAIL', severity: 'Major', deviation_notes: 'Exceeds upper limit by 8.7%. Coating uniformity may be compromised.' },
        { parameter_name: 'Pan Speed', unit: 'RPM', measured_value: '9', lower_limit: '5', upper_limit: '12', target_value: '8', status: 'PASS', severity: 'none', deviation_notes: 'Within range' },
        { parameter_name: 'Exhaust Temperature', unit: 'C', measured_value: '48', lower_limit: '40', upper_limit: '55', target_value: '47', status: 'PASS', severity: 'none', deviation_notes: 'Within range' },
        { parameter_name: 'Weight Gain', unit: '%', measured_value: '3.8', lower_limit: '2', upper_limit: '5', target_value: '3.5', status: 'PASS', severity: 'none', deviation_notes: 'Within range' },
      ],
      trend_analysis: [
        { parameter_name: 'Spray Rate', trend_type: 'increasing', description: 'Increasing over last 4 batches; nozzle calibration check recommended', risk_level: 'Medium' },
      ],
      anomalies: [],
    },
  },
  {
    batch_id: 'BX-2025-0139',
    stage: 'Packaging',
    timestamp: '2025-02-21T15:45:00Z',
    result: {
      batch_id: 'BX-2025-0139',
      stage: 'Packaging',
      analysis_timestamp: '2025-02-21T15:45:00Z',
      summary: { total_parameters_checked: 5, critical_count: 0, major_count: 0, minor_count: 0, pass_count: 5, missing_count: 0, overall_status: 'PASS' },
      parameter_results: [
        { parameter_name: 'Seal Strength', unit: 'N/15mm', measured_value: '2.6', lower_limit: '1.5', upper_limit: '3.5', target_value: '2.5', status: 'PASS', severity: 'none', deviation_notes: 'Within range' },
        { parameter_name: 'Fill Weight', unit: '%', measured_value: '100.2', lower_limit: '98', upper_limit: '102', target_value: '100', status: 'PASS', severity: 'none', deviation_notes: 'Within range' },
        { parameter_name: 'Leak Test', unit: 'mbar', measured_value: '0.08', lower_limit: '0', upper_limit: '0.5', target_value: '0.1', status: 'PASS', severity: 'none', deviation_notes: 'Within range' },
        { parameter_name: 'Print Quality Score', unit: '%', measured_value: '97', lower_limit: '90', upper_limit: '100', target_value: '98', status: 'PASS', severity: 'none', deviation_notes: 'Within range' },
        { parameter_name: 'Line Speed', unit: 'ppm', measured_value: '62', lower_limit: '40', upper_limit: '80', target_value: '60', status: 'PASS', severity: 'none', deviation_notes: 'Within range' },
      ],
      trend_analysis: [],
      anomalies: [],
    },
  },
]

const SAMPLE_ALERTS = [
  { id: 'a1', batch_id: 'BX-2025-0142', parameter: 'Amperage', severity: 'Critical', message: 'Exceeds upper limit by 14.7% - potential over-granulation or impeller wear', timestamp: '2025-02-24T14:30:00Z' },
  { id: 'a2', batch_id: 'BX-2025-0142', parameter: 'Moisture Content', severity: 'Major', message: 'Elevated moisture at 3.4% may impact downstream compression quality', timestamp: '2025-02-24T14:30:00Z' },
  { id: 'a3', batch_id: 'BX-2025-0140', parameter: 'Spray Rate', severity: 'Major', message: 'Spray rate 16.3 g/min exceeds limit - coating uniformity risk', timestamp: '2025-02-22T09:00:00Z' },
  { id: 'a4', batch_id: 'BX-2025-0141', parameter: 'Hardness', severity: 'Minor', message: 'Near upper limit at 7.8 kPa - monitor trend closely', timestamp: '2025-02-23T10:15:00Z' },
]

// ==================== HELPERS ====================

function generateId() {
  return Math.random().toString(36).substring(2, 10)
}

function formatTimestamp(ts: string): string {
  if (!ts) return 'N/A'
  try {
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ts
  }
}

function severityBadgeClass(severity: string): string {
  const s = (severity ?? '').toLowerCase()
  if (s === 'critical') return 'bg-red-600 text-white hover:bg-red-700'
  if (s === 'major') return 'bg-orange-500 text-white hover:bg-orange-600'
  if (s === 'minor') return 'bg-yellow-500 text-white hover:bg-yellow-600'
  if (s === 'pass' || s === 'none' || s === 'low') return 'bg-green-600 text-white hover:bg-green-700'
  if (s === 'medium') return 'bg-orange-400 text-white hover:bg-orange-500'
  if (s === 'high') return 'bg-red-500 text-white hover:bg-red-600'
  return 'bg-secondary text-secondary-foreground'
}

function statusBadgeClass(status: string): string {
  const s = (status ?? '').toLowerCase()
  if (s === 'pass' || s === 'passed' || s === 'compliant') return 'bg-green-600 text-white'
  if (s === 'fail' || s === 'failed' || s === 'non-compliant') return 'bg-red-600 text-white'
  if (s === 'conditional' || s === 'conditionally compliant') return 'bg-orange-500 text-white'
  return 'bg-secondary text-secondary-foreground'
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part)
}

function parseAgentResponse(result: any): any {
  let parsed = result?.response?.result
  if (typeof parsed === 'string') {
    parsed = parseLLMJson(parsed)
  }
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    if (parsed.result && typeof parsed.result === 'object' && !Array.isArray(parsed.result)) {
      parsed = parsed.result
    }
  }
  return parsed
}

// ==================== ERROR BOUNDARY ====================

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Try again</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ==================== SUB-COMPONENTS ====================

function MetricCard({ title, value, icon, accent }: { title: string; value: string | number; icon: React.ReactNode; accent?: string }) {
  return (
    <Card className="border border-border/40 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-sans">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${accent ?? 'text-foreground'}`}>{value}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function SeveritySummaryBar({ summary }: { summary?: AnalysisSummary }) {
  if (!summary) return null
  const items = [
    { label: 'Critical', count: summary.critical_count ?? 0, color: 'bg-red-600' },
    { label: 'Major', count: summary.major_count ?? 0, color: 'bg-orange-500' },
    { label: 'Minor', count: summary.minor_count ?? 0, color: 'bg-yellow-500' },
    { label: 'Pass', count: summary.pass_count ?? 0, color: 'bg-green-600' },
    { label: 'Missing', count: summary.missing_count ?? 0, color: 'bg-gray-400' },
  ]
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div className={`w-3 h-3 rounded-full ${item.color}`} />
          <span className="text-xs font-medium text-muted-foreground font-sans">{item.count} {item.label}</span>
        </div>
      ))}
    </div>
  )
}

function TrendIcon({ type }: { type: string }) {
  const t = (type ?? '').toLowerCase()
  if (t === 'increasing' || t === 'upward') return <FiTrendingUp className="w-4 h-4 text-red-500" />
  if (t === 'decreasing' || t === 'downward') return <FiTrendingDown className="w-4 h-4 text-blue-500" />
  return <FiMinus className="w-4 h-4 text-muted-foreground" />
}

function LoadingOverlay({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
      <p className="text-sm text-muted-foreground animate-pulse font-sans">{message}</p>
    </div>
  )
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="p-3 rounded-full bg-muted text-muted-foreground">{icon}</div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md font-sans">{description}</p>
    </div>
  )
}

// ==================== SCREEN: DASHBOARD ====================

function DashboardScreen({
  analyses,
  sampleData,
  onNavigate,
}: {
  analyses: StoredAnalysis[]
  sampleData: boolean
  onNavigate: (screen: string) => void
}) {
  const data = sampleData ? SAMPLE_ANALYSES : analyses
  const alerts = sampleData ? SAMPLE_ALERTS : []

  const totalBatches = data.length
  const openFlags = data.reduce((sum, a) => sum + (a.result?.summary?.critical_count ?? 0) + (a.result?.summary?.major_count ?? 0) + (a.result?.summary?.minor_count ?? 0), 0)
  const criticalAlerts = data.reduce((sum, a) => sum + (a.result?.summary?.critical_count ?? 0), 0)
  const totalParams = data.reduce((sum, a) => sum + (a.result?.summary?.total_parameters_checked ?? 0), 0)
  const passParams = data.reduce((sum, a) => sum + (a.result?.summary?.pass_count ?? 0), 0)
  const complianceRate = totalParams > 0 ? Math.round((passParams / totalParams) * 100) : 100

  const [sortField, setSortField] = useState<string>('timestamp')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const sortedData = useMemo(() => {
    const sorted = [...data]
    sorted.sort((a, b) => {
      let aVal: any
      let bVal: any
      if (sortField === 'batch_id') { aVal = a.batch_id; bVal = b.batch_id }
      else if (sortField === 'stage') { aVal = a.stage; bVal = b.stage }
      else if (sortField === 'status') { aVal = a.result?.summary?.overall_status ?? ''; bVal = b.result?.summary?.overall_status ?? '' }
      else if (sortField === 'flags') { aVal = (a.result?.summary?.critical_count ?? 0) + (a.result?.summary?.major_count ?? 0); bVal = (b.result?.summary?.critical_count ?? 0) + (b.result?.summary?.major_count ?? 0) }
      else { aVal = a.timestamp; bVal = b.timestamp }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [data, sortField, sortDir])

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const SortableHeader = ({ field, label }: { field: string; label: string }) => (
    <TableHead className="cursor-pointer hover:text-foreground select-none font-sans text-xs" onClick={() => handleSort(field)}>
      <div className="flex items-center gap-1">
        {label}
        {sortField === field && (sortDir === 'asc' ? <FiChevronUp className="w-3 h-3" /> : <FiChevronDown className="w-3 h-3" />)}
      </div>
    </TableHead>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1 font-sans">Overview of batch manufacturing record compliance status</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Batches Reviewed" value={totalBatches} icon={<FiClipboard className="w-5 h-5" />} />
        <MetricCard title="Open Flags" value={openFlags} icon={<FiAlertTriangle className="w-5 h-5" />} accent={openFlags > 0 ? 'text-orange-600' : undefined} />
        <MetricCard title="Critical Alerts" value={criticalAlerts} icon={<FiAlertCircle className="w-5 h-5" />} accent={criticalAlerts > 0 ? 'text-red-600' : undefined} />
        <MetricCard title="Compliance Rate" value={`${complianceRate}%`} icon={<FiShield className="w-5 h-5" />} accent={complianceRate >= 90 ? 'text-green-600' : 'text-red-600'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border border-border/40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Recent Batch Reviews</CardTitle>
                <CardDescription className="text-xs font-sans">Click a row to navigate to BMR Review</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => onNavigate('bmr-review')} className="gap-1 text-xs font-sans">
                New Review <FiArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.length === 0 ? (
              <EmptyState icon={<FiClipboard className="w-6 h-6" />} title="No batches reviewed yet" description="Start by configuring stage limits in Stage Config, then submit batch data for compliance analysis in BMR Review." />
            ) : (
              <ScrollArea className="max-h-[340px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHeader field="batch_id" label="Batch ID" />
                      <SortableHeader field="stage" label="Stage" />
                      <SortableHeader field="status" label="Status" />
                      <SortableHeader field="timestamp" label="Date" />
                      <SortableHeader field="flags" label="Flags" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedData.map((a, idx) => {
                      const flagCount = (a.result?.summary?.critical_count ?? 0) + (a.result?.summary?.major_count ?? 0) + (a.result?.summary?.minor_count ?? 0)
                      return (
                        <TableRow key={idx} className="cursor-pointer hover:bg-muted/50" onClick={() => onNavigate('bmr-review')}>
                          <TableCell className="font-medium text-sm font-sans">{a.batch_id}</TableCell>
                          <TableCell className="text-sm font-sans">{a.stage}</TableCell>
                          <TableCell>
                            <Badge className={statusBadgeClass(a.result?.summary?.overall_status ?? '')}>{a.result?.summary?.overall_status ?? 'N/A'}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground font-sans">{formatTimestamp(a.timestamp)}</TableCell>
                          <TableCell>
                            {flagCount > 0 ? <Badge variant="outline" className="text-orange-600 border-orange-300 font-sans">{flagCount}</Badge> : <span className="text-sm text-muted-foreground font-sans">0</span>}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Alert Feed</CardTitle>
            <CardDescription className="text-xs font-sans">Recent critical and major flags</CardDescription>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 && data.length === 0 ? (
              <EmptyState icon={<FiAlertTriangle className="w-6 h-6" />} title="No alerts" description="Alerts will appear here when flagged parameters are detected during compliance analysis." />
            ) : (
              <ScrollArea className="max-h-[340px]">
                <div className="space-y-3">
                  {(alerts.length > 0 ? alerts : data.flatMap(a => Array.isArray(a.result?.parameter_results) ? a.result.parameter_results.filter((p: ParameterResult) => p.severity && (p.severity ?? '').toLowerCase() !== 'none').map((p: ParameterResult) => ({ id: `${a.batch_id}-${p.parameter_name}`, batch_id: a.batch_id, parameter: p.parameter_name, severity: p.severity, message: p.deviation_notes, timestamp: a.timestamp })) : [])).map((alert: any, idx: number) => (
                    <div key={alert?.id ?? idx} className="p-3 rounded-lg bg-muted/50 border border-border/30 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge className={severityBadgeClass(alert?.severity ?? '')} variant="secondary">{alert?.severity ?? 'Unknown'}</Badge>
                          <span className="text-xs font-medium text-foreground font-sans">{alert?.batch_id ?? ''}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-sans">{formatTimestamp(alert?.timestamp ?? '')}</span>
                      </div>
                      <p className="text-xs text-muted-foreground font-sans"><span className="font-medium text-foreground">{alert?.parameter ?? ''}:</span> {alert?.message ?? ''}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ==================== SCREEN: STAGE CONFIG ====================

function StageConfigScreen({
  stageConfigs,
  setStageConfigs,
}: {
  stageConfigs: StageConfig
  setStageConfigs: React.Dispatch<React.SetStateAction<StageConfig>>
}) {
  const [activeStage, setActiveStage] = useState<string>('Granulation')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<string>('')

  const params = stageConfigs[activeStage] ?? []

  const handleParamChange = (id: string, field: keyof ParameterConfig, value: string | boolean) => {
    setStageConfigs(prev => ({
      ...prev,
      [activeStage]: (prev[activeStage] ?? []).map(p => p.id === id ? { ...p, [field]: value } : p),
    }))
  }

  const handleAddParam = () => {
    const newParam: ParameterConfig = {
      id: generateId(),
      parameter_name: 'New Parameter',
      unit: '',
      lower_limit: '0',
      upper_limit: '100',
      target_value: '50',
      active: true,
    }
    setStageConfigs(prev => ({
      ...prev,
      [activeStage]: [...(prev[activeStage] ?? []), newParam],
    }))
    setEditingId(newParam.id)
  }

  const handleDeleteParam = (id: string) => {
    setStageConfigs(prev => ({
      ...prev,
      [activeStage]: (prev[activeStage] ?? []).filter(p => p.id !== id),
    }))
    if (editingId === id) setEditingId(null)
  }

  const handleSave = () => {
    setEditingId(null)
    setStatusMsg('Configuration saved successfully.')
    setTimeout(() => setStatusMsg(''), 3000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Stage Configuration</h1>
        <p className="text-sm text-muted-foreground mt-1 font-sans">Define parameter limits and targets for each manufacturing stage</p>
      </div>

      <Tabs value={activeStage} onValueChange={setActiveStage}>
        <TabsList className="w-full grid grid-cols-4">
          {STAGES.map(stage => (
            <TabsTrigger key={stage} value={stage} className="text-sm font-sans">{stage}</TabsTrigger>
          ))}
        </TabsList>

        {STAGES.map(stage => (
          <TabsContent key={stage} value={stage} className="mt-4">
            <Card className="border border-border/40">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">{stage} Parameters</CardTitle>
                  <Button variant="outline" size="sm" onClick={handleAddParam} className="gap-1.5 font-sans">
                    <FiPlus className="w-3.5 h-3.5" /> Add Parameter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[420px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-sans text-xs">Parameter Name</TableHead>
                        <TableHead className="font-sans text-xs">Unit</TableHead>
                        <TableHead className="font-sans text-xs">Lower Limit</TableHead>
                        <TableHead className="font-sans text-xs">Upper Limit</TableHead>
                        <TableHead className="font-sans text-xs">Target</TableHead>
                        <TableHead className="font-sans text-xs">Active</TableHead>
                        <TableHead className="w-[80px] font-sans text-xs">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {params.map(p => {
                        const isEditing = editingId === p.id
                        return (
                          <TableRow key={p.id}>
                            <TableCell>
                              {isEditing ? (
                                <Input value={p.parameter_name} onChange={e => handleParamChange(p.id, 'parameter_name', e.target.value)} className="h-8 text-sm font-sans" />
                              ) : (
                                <span className="text-sm font-medium font-sans">{p.parameter_name}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input value={p.unit} onChange={e => handleParamChange(p.id, 'unit', e.target.value)} className="h-8 text-sm w-20 font-sans" />
                              ) : (
                                <span className="text-sm text-muted-foreground font-sans">{p.unit}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input value={p.lower_limit} onChange={e => handleParamChange(p.id, 'lower_limit', e.target.value)} className="h-8 text-sm w-20 font-sans" type="number" />
                              ) : (
                                <span className="text-sm font-sans">{p.lower_limit}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input value={p.upper_limit} onChange={e => handleParamChange(p.id, 'upper_limit', e.target.value)} className="h-8 text-sm w-20 font-sans" type="number" />
                              ) : (
                                <span className="text-sm font-sans">{p.upper_limit}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input value={p.target_value} onChange={e => handleParamChange(p.id, 'target_value', e.target.value)} className="h-8 text-sm w-20 font-sans" type="number" />
                              ) : (
                                <span className="text-sm font-sans">{p.target_value}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Switch checked={p.active} onCheckedChange={v => handleParamChange(p.id, 'active', v)} />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {isEditing ? (
                                  <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} className="h-7 w-7 p-0">
                                    <FiCheckCircle className="w-4 h-4 text-green-600" />
                                  </Button>
                                ) : (
                                  <Button variant="ghost" size="sm" onClick={() => setEditingId(p.id)} className="h-7 w-7 p-0">
                                    <FiEdit3 className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteParam(p.id)} className="h-7 w-7 p-0">
                                  <FiTrash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30">
                  {statusMsg ? (
                    <div className="flex items-center gap-2 text-sm text-green-700 font-sans">
                      <FiCheckCircle className="w-4 h-4" />
                      {statusMsg}
                    </div>
                  ) : (
                    <div />
                  )}
                  <Button onClick={handleSave} className="gap-1.5 font-sans">
                    <FiSave className="w-4 h-4" /> Save Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

// ==================== SCREEN: BMR REVIEW ====================

function BMRReviewScreen({
  stageConfigs,
  analyses,
  setAnalyses,
  activeAgentId,
  setActiveAgentId,
}: {
  stageConfigs: StageConfig
  analyses: StoredAnalysis[]
  setAnalyses: React.Dispatch<React.SetStateAction<StoredAnalysis[]>>
  activeAgentId: string | null
  setActiveAgentId: React.Dispatch<React.SetStateAction<string | null>>
}) {
  const [batchId, setBatchId] = useState('')
  const [selectedStage, setSelectedStage] = useState<string>('Granulation')
  const [inputMode, setInputMode] = useState<'manual' | 'file'>('manual')
  const [paramValues, setParamValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [currentResult, setCurrentResult] = useState<BMRAnalysisResult | null>(null)
  const [error, setError] = useState<string>('')
  const [expandedParams, setExpandedParams] = useState<Set<string>>(new Set())
  const [fileContent, setFileContent] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const stageParams = useMemo(() => (stageConfigs[selectedStage] ?? []).filter(p => p.active), [stageConfigs, selectedStage])

  useEffect(() => {
    setParamValues({})
    setCurrentResult(null)
    setError('')
  }, [selectedStage])

  const handleParamValueChange = (paramName: string, value: string) => {
    setParamValues(prev => ({ ...prev, [paramName]: value }))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setFileContent(text ?? '')

      if (file.name.endsWith('.csv')) {
        try {
          const lines = text.split('\n').filter(l => l.trim())
          if (lines.length > 1) {
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
            const paramIdx = headers.indexOf('parameter') !== -1 ? headers.indexOf('parameter') : headers.indexOf('parameter_name') !== -1 ? headers.indexOf('parameter_name') : 0
            const valIdx = headers.indexOf('value') !== -1 ? headers.indexOf('value') : headers.indexOf('measured_value') !== -1 ? headers.indexOf('measured_value') : 1

            const newValues: Record<string, string> = {}
            for (let i = 1; i < lines.length; i++) {
              const cols = lines[i].split(',').map(c => c.trim())
              if (cols[paramIdx] && cols[valIdx]) {
                const matchParam = stageParams.find(p => p.parameter_name.toLowerCase() === (cols[paramIdx] ?? '').toLowerCase())
                if (matchParam) {
                  newValues[matchParam.parameter_name] = cols[valIdx] ?? ''
                }
              }
            }
            setParamValues(prev => ({ ...prev, ...newValues }))
          }
        } catch {
          setError('Failed to parse CSV file. Please check the format (parameter,value).')
        }
      }
    }
    reader.readAsText(file)
  }

  const handleRunCheck = async () => {
    if (!batchId.trim()) {
      setError('Please enter a Batch ID.')
      return
    }

    const hasValues = inputMode === 'manual'
      ? stageParams.some(p => paramValues[p.parameter_name])
      : fileContent.trim().length > 0

    if (!hasValues) {
      setError(inputMode === 'manual' ? 'Please enter at least one parameter value.' : 'Please upload a data file.')
      return
    }

    setError('')
    setLoading(true)
    setActiveAgentId(BMR_AGENT_ID)
    setCurrentResult(null)

    try {
      let paramDataStr = ''
      if (inputMode === 'manual') {
        paramDataStr = stageParams.map(p => {
          const val = paramValues[p.parameter_name] ?? ''
          return `- ${p.parameter_name}: measured_value=${val} ${p.unit}, lower_limit=${p.lower_limit}, upper_limit=${p.upper_limit}, target_value=${p.target_value}`
        }).join('\n')
      } else {
        paramDataStr = `File data:\n${fileContent}\n\nConfigured limits for ${selectedStage}:\n` + stageParams.map(p => `- ${p.parameter_name}: lower_limit=${p.lower_limit}, upper_limit=${p.upper_limit} ${p.unit}, target_value=${p.target_value}`).join('\n')
      }

      const message = `Analyze the following BMR compliance data for batch "${batchId}", manufacturing stage "${selectedStage}".

Parameter measurements and configured limits:
${paramDataStr}

Instructions:
1. Compare each measured value against its lower and upper limits
2. Classify each parameter status as PASS or FAIL
3. Assign severity: Critical (if deviation >10% beyond limit or safety-critical), Major (if deviation 5-10% or quality-impacting), Minor (if near limit boundary), or none (if clearly passing)
4. Identify any trends or anomalies
5. Determine overall batch status

Return the complete analysis as a JSON object with these fields:
- batch_id (string)
- stage (string)
- analysis_timestamp (ISO string)
- summary: { total_parameters_checked, critical_count, major_count, minor_count, pass_count, missing_count, overall_status }
- parameter_results: array of { parameter_name, unit, measured_value, lower_limit, upper_limit, target_value, status, severity, deviation_notes }
- trend_analysis: array of { parameter_name, trend_type, description, risk_level }
- anomalies: array of { parameter_name, anomaly_type, description, severity }`

      const result = await callAIAgent(message, BMR_AGENT_ID)

      if (result.success) {
        const parsed = parseAgentResponse(result)
        if (parsed) {
          const analysisResult: BMRAnalysisResult = {
            batch_id: parsed?.batch_id ?? batchId,
            stage: parsed?.stage ?? selectedStage,
            analysis_timestamp: parsed?.analysis_timestamp ?? new Date().toISOString(),
            summary: {
              total_parameters_checked: parsed?.summary?.total_parameters_checked ?? 0,
              critical_count: parsed?.summary?.critical_count ?? 0,
              major_count: parsed?.summary?.major_count ?? 0,
              minor_count: parsed?.summary?.minor_count ?? 0,
              pass_count: parsed?.summary?.pass_count ?? 0,
              missing_count: parsed?.summary?.missing_count ?? 0,
              overall_status: parsed?.summary?.overall_status ?? 'UNKNOWN',
            },
            parameter_results: Array.isArray(parsed?.parameter_results) ? parsed.parameter_results : [],
            trend_analysis: Array.isArray(parsed?.trend_analysis) ? parsed.trend_analysis : [],
            anomalies: Array.isArray(parsed?.anomalies) ? parsed.anomalies : [],
          }
          setCurrentResult(analysisResult)

          const stored: StoredAnalysis = {
            batch_id: batchId,
            stage: selectedStage,
            timestamp: new Date().toISOString(),
            result: analysisResult,
          }
          setAnalyses(prev => [stored, ...prev])
        } else {
          setError('Failed to parse agent response. The analysis may have returned an unexpected format.')
        }
      } else {
        setError(result.error ?? 'Agent call failed. Please try again.')
      }
    } catch (err) {
      setError('An unexpected error occurred during analysis.')
    } finally {
      setLoading(false)
      setActiveAgentId(null)
    }
  }

  const toggleParamExpand = (name: string) => {
    setExpandedParams(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const sortedResults = useMemo(() => {
    if (!currentResult || !Array.isArray(currentResult.parameter_results)) return []
    const results = [...currentResult.parameter_results]
    const severityOrder: Record<string, number> = { Critical: 0, Major: 1, Minor: 2, none: 3, Pass: 3 }
    results.sort((a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4))
    return results
  }, [currentResult])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">BMR Compliance Review</h1>
        <p className="text-sm text-muted-foreground mt-1 font-sans">Submit batch parameter data for automated compliance analysis</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel: Input */}
        <div className="space-y-4">
          <Card className="border border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Batch Data Input</CardTitle>
              <CardDescription className="text-xs font-sans">Enter batch ID, select stage, and provide parameter measurements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium font-sans">Batch ID</Label>
                  <Input placeholder="e.g. BX-2025-0143" value={batchId} onChange={e => setBatchId(e.target.value)} className="mt-1 font-sans" />
                </div>
                <div>
                  <Label className="text-xs font-medium font-sans">Manufacturing Stage</Label>
                  <Select value={selectedStage} onValueChange={setSelectedStage}>
                    <SelectTrigger className="mt-1 font-sans">
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <Button variant={inputMode === 'manual' ? 'default' : 'outline'} size="sm" onClick={() => setInputMode('manual')} className="font-sans text-xs">Manual Entry</Button>
                <Button variant={inputMode === 'file' ? 'default' : 'outline'} size="sm" onClick={() => setInputMode('file')} className="font-sans text-xs">File Upload</Button>
              </div>

              {inputMode === 'manual' ? (
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-3 pr-2">
                    {stageParams.map(p => (
                      <div key={p.id}>
                        <Label className="text-xs text-muted-foreground font-sans">{p.parameter_name} <span className="text-[10px]">({p.unit}) [{p.lower_limit} - {p.upper_limit}]</span></Label>
                        <Input placeholder={`Target: ${p.target_value}`} value={paramValues[p.parameter_name] ?? ''} onChange={e => handleParamValueChange(p.parameter_name, e.target.value)} className="mt-0.5 h-8 font-sans" type="number" step="any" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                    <FiUpload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground font-sans">Click to upload CSV file</p>
                    <p className="text-xs text-muted-foreground mt-1 font-sans">Expected columns: parameter, value</p>
                    <input ref={fileInputRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFileUpload} />
                  </div>
                  {fileContent && (
                    <div className="flex items-center gap-2 p-2 rounded bg-green-50 border border-green-200 text-xs text-green-700 font-sans">
                      <FiCheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>File loaded - {fileContent.split('\n').length} lines detected</span>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 font-sans">
                  <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{error}</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0" onClick={() => setError('')}><FiX className="w-3 h-3" /></Button>
                </div>
              )}

              <Button onClick={handleRunCheck} disabled={loading} className="w-full gap-2 font-sans">
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" /> Analyzing Parameters...</>
                ) : (
                  <><FiActivity className="w-4 h-4" /> Run Compliance Check</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Results */}
        <div>
          {loading ? (
            <Card className="border border-border/40">
              <CardContent className="p-0">
                <LoadingOverlay message="Analyzing batch parameters against configured limits..." />
              </CardContent>
            </Card>
          ) : currentResult ? (
            <div className="space-y-4">
              <Card className="border border-border/40">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">Analysis Results</CardTitle>
                      <CardDescription className="text-xs font-sans mt-0.5">Batch {currentResult.batch_id} -- {currentResult.stage} -- {formatTimestamp(currentResult.analysis_timestamp)}</CardDescription>
                    </div>
                    <Badge className={statusBadgeClass(currentResult.summary?.overall_status ?? '')}>{currentResult.summary?.overall_status ?? 'N/A'}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SeveritySummaryBar summary={currentResult.summary} />

                  <Separator />

                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-sans">Parameter Results ({(currentResult.summary?.total_parameters_checked ?? 0)} checked)</div>
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-2 pr-2">
                      {sortedResults.map((p, idx) => {
                        const expanded = expandedParams.has(p.parameter_name)
                        return (
                          <div key={idx} className="rounded-lg border border-border/30 overflow-hidden">
                            <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleParamExpand(p.parameter_name)}>
                              <div className="flex items-center gap-2">
                                <Badge className={severityBadgeClass(p.severity)} variant="secondary">{(p.severity ?? 'none') === 'none' ? 'Pass' : p.severity}</Badge>
                                <span className="text-sm font-medium font-sans">{p.parameter_name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-mono">{p.measured_value} {p.unit}</span>
                                {expanded ? <FiChevronUp className="w-4 h-4 text-muted-foreground" /> : <FiChevronDown className="w-4 h-4 text-muted-foreground" />}
                              </div>
                            </div>
                            {expanded && (
                              <div className="px-3 pb-3 pt-1 border-t border-border/20 bg-muted/20 space-y-2">
                                <div className="grid grid-cols-3 gap-2 text-xs font-sans">
                                  <div><span className="text-muted-foreground">Lower:</span> <span className="font-medium">{p.lower_limit} {p.unit}</span></div>
                                  <div><span className="text-muted-foreground">Target:</span> <span className="font-medium">{p.target_value} {p.unit}</span></div>
                                  <div><span className="text-muted-foreground">Upper:</span> <span className="font-medium">{p.upper_limit} {p.unit}</span></div>
                                </div>
                                <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
                                  <div className="absolute h-full bg-green-200 rounded-full" style={{ left: '20%', width: '60%' }} />
                                  {(() => {
                                    const low = parseFloat(p.lower_limit)
                                    const high = parseFloat(p.upper_limit)
                                    const measured = parseFloat(p.measured_value)
                                    if (isNaN(low) || isNaN(high) || isNaN(measured) || high === low) return null
                                    const range = high - low
                                    const extLow = low - range * 0.25
                                    const extRange = range * 1.5
                                    const pos = Math.max(0, Math.min(100, ((measured - extLow) / extRange) * 100))
                                    const isFail = measured < low || measured > high
                                    return <div className={`absolute top-0 w-2.5 h-2.5 rounded-full ${isFail ? 'bg-red-600' : 'bg-green-700'} border-2 border-white`} style={{ left: `${pos}%`, transform: 'translateX(-50%)' }} />
                                  })()}
                                </div>
                                {p.deviation_notes && (
                                  <p className="text-xs text-muted-foreground font-sans">{p.deviation_notes}</p>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {Array.isArray(currentResult.trend_analysis) && currentResult.trend_analysis.length > 0 && (
                <Card className="border border-border/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Trend Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {currentResult.trend_analysis.map((t, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/30 border border-border/20">
                          <TrendIcon type={t.trend_type} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium font-sans">{t.parameter_name}</span>
                              <Badge className={severityBadgeClass(t.risk_level)} variant="secondary">{t.risk_level} Risk</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 font-sans">{t.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {Array.isArray(currentResult.anomalies) && currentResult.anomalies.length > 0 && (
                <Card className="border border-border/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Anomalies Detected</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {currentResult.anomalies.map((a, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-red-50 border border-red-200">
                          <FiAlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium font-sans">{a.parameter_name}</span>
                              <Badge className={severityBadgeClass(a.severity)} variant="secondary">{a.severity}</Badge>
                              <span className="text-xs text-muted-foreground font-sans">({a.anomaly_type})</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 font-sans">{a.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="border border-border/40 h-full min-h-[300px] flex items-center justify-center">
              <CardContent className="p-0">
                <EmptyState icon={<FiSearch className="w-6 h-6" />} title="Submit batch data to see analysis" description="Enter parameter values on the left panel and click 'Run Compliance Check' to analyze against configured limits." />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// ==================== SCREEN: COMPLIANCE REPORTS ====================

function ComplianceReportScreen({
  analyses,
  sampleData,
  activeAgentId,
  setActiveAgentId,
}: {
  analyses: StoredAnalysis[]
  sampleData: boolean
  activeAgentId: string | null
  setActiveAgentId: React.Dispatch<React.SetStateAction<string | null>>
}) {
  const data = sampleData ? SAMPLE_ANALYSES : analyses
  const [selectedBatch, setSelectedBatch] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<ComplianceReportResult | null>(null)
  const [error, setError] = useState<string>('')
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['executive', 'findings', 'historical', 'recommendations', 'cfr']))

  const toggleSection = (s: string) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  }

  const batchAnalyses = useMemo(() => {
    if (!selectedBatch) return []
    return data.filter(a => a.batch_id === selectedBatch)
  }, [data, selectedBatch])

  const uniqueBatches = useMemo(() => {
    const seen = new Set<string>()
    return data.filter(a => {
      if (seen.has(a.batch_id)) return false
      seen.add(a.batch_id)
      return true
    })
  }, [data])

  const handleGenerateReport = async () => {
    if (!selectedBatch) {
      setError('Please select a batch.')
      return
    }

    if (batchAnalyses.length === 0) {
      setError('No analysis data available for this batch.')
      return
    }

    setError('')
    setLoading(true)
    setActiveAgentId(REPORT_AGENT_ID)
    setReport(null)

    try {
      const analysisDetails = batchAnalyses.map(a => {
        const summary = a.result?.summary
        const params = Array.isArray(a.result?.parameter_results) ? a.result.parameter_results : []
        return `Stage: ${a.stage}
Overall Status: ${summary?.overall_status ?? 'Unknown'}
Parameters checked: ${summary?.total_parameters_checked ?? 0}
Critical flags: ${summary?.critical_count ?? 0}, Major flags: ${summary?.major_count ?? 0}, Minor flags: ${summary?.minor_count ?? 0}, Pass: ${summary?.pass_count ?? 0}

Parameter details:
${params.map(p => `  - ${p.parameter_name}: measured=${p.measured_value} ${p.unit}, range=[${p.lower_limit}-${p.upper_limit}], target=${p.target_value}, status=${p.status}, severity=${p.severity}, notes="${p.deviation_notes}"`).join('\n')}

Trends: ${Array.isArray(a.result?.trend_analysis) ? a.result.trend_analysis.map(t => `${t.parameter_name} (${t.trend_type}, risk=${t.risk_level}): ${t.description}`).join('; ') : 'None identified'}
Anomalies: ${Array.isArray(a.result?.anomalies) ? a.result.anomalies.map(an => `${an.parameter_name} (${an.anomaly_type}, ${an.severity}): ${an.description}`).join('; ') : 'None identified'}`
      }).join('\n\n---\n\n')

      const message = `Generate a comprehensive pharmaceutical compliance report for batch "${selectedBatch}" based on the following stage analysis data:

${analysisDetails}

Provide the report as a JSON object with these fields:
- report_id: unique identifier string
- batch_id: "${selectedBatch}"
- generated_at: current ISO timestamp
- executive_summary: { overall_status, risk_assessment, key_findings, batch_disposition_recommendation }
- stage_findings: array of { stage_name, status, critical_flags (number), major_flags (number), minor_flags (number), findings_detail, cross_stage_correlations }
- historical_comparison: { previous_batches_compared (number), trend_direction, comparison_notes }
- recommendations: array of { priority (number, 1=highest), severity, affected_parameters, action, timeline }
- cfr_part_11_notes: { electronic_record_integrity, audit_trail_observations, data_integrity_flags, signature_requirements }

Be thorough in your analysis. For key_findings and findings_detail, provide detailed narrative. For recommendations, prioritize by urgency and impact.`

      const result = await callAIAgent(message, REPORT_AGENT_ID)

      if (result.success) {
        const parsed = parseAgentResponse(result)
        if (parsed) {
          const reportResult: ComplianceReportResult = {
            report_id: parsed?.report_id ?? `RPT-${Date.now()}`,
            batch_id: parsed?.batch_id ?? selectedBatch,
            generated_at: parsed?.generated_at ?? new Date().toISOString(),
            executive_summary: {
              overall_status: parsed?.executive_summary?.overall_status ?? 'Unknown',
              risk_assessment: parsed?.executive_summary?.risk_assessment ?? '',
              key_findings: parsed?.executive_summary?.key_findings ?? '',
              batch_disposition_recommendation: parsed?.executive_summary?.batch_disposition_recommendation ?? '',
            },
            stage_findings: Array.isArray(parsed?.stage_findings) ? parsed.stage_findings : [],
            historical_comparison: {
              previous_batches_compared: parsed?.historical_comparison?.previous_batches_compared ?? 0,
              trend_direction: parsed?.historical_comparison?.trend_direction ?? '',
              comparison_notes: parsed?.historical_comparison?.comparison_notes ?? '',
            },
            recommendations: Array.isArray(parsed?.recommendations) ? parsed.recommendations : [],
            cfr_part_11_notes: {
              electronic_record_integrity: parsed?.cfr_part_11_notes?.electronic_record_integrity ?? '',
              audit_trail_observations: parsed?.cfr_part_11_notes?.audit_trail_observations ?? '',
              data_integrity_flags: parsed?.cfr_part_11_notes?.data_integrity_flags ?? '',
              signature_requirements: parsed?.cfr_part_11_notes?.signature_requirements ?? '',
            },
          }
          setReport(reportResult)
        } else {
          setError('Failed to parse report response. Please try again.')
        }
      } else {
        setError(result.error ?? 'Report generation failed. Please try again.')
      }
    } catch {
      setError('An unexpected error occurred during report generation.')
    } finally {
      setLoading(false)
      setActiveAgentId(null)
    }
  }

  const handleExportPDF = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Compliance Reports</h1>
          <p className="text-sm text-muted-foreground mt-1 font-sans">Generate comprehensive compliance reports from analysis data</p>
        </div>
        {report && (
          <Button variant="outline" onClick={handleExportPDF} className="gap-1.5 font-sans">
            <FiPrinter className="w-4 h-4" /> Export as PDF
          </Button>
        )}
      </div>

      <Card className="border border-border/40 print:hidden">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="flex-1 w-full sm:w-auto">
              <Label className="text-xs font-medium font-sans">Select Batch</Label>
              <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                <SelectTrigger className="mt-1 font-sans">
                  <SelectValue placeholder="Choose a reviewed batch" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueBatches.map((a, idx) => (
                    <SelectItem key={idx} value={a.batch_id}>
                      {a.batch_id} - {a.stage} ({formatTimestamp(a.timestamp)})
                    </SelectItem>
                  ))}
                  {uniqueBatches.length === 0 && (
                    <SelectItem value="_none" disabled>No batches available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            {selectedBatch && (
              <div className="text-sm text-muted-foreground font-sans whitespace-nowrap">
                <span className="font-medium">{batchAnalyses.length}</span> stage{batchAnalyses.length !== 1 ? 's' : ''} analyzed
              </div>
            )}
            <Button onClick={handleGenerateReport} disabled={loading || !selectedBatch} className="gap-2 font-sans whitespace-nowrap">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" /> Generating...</>
              ) : (
                <><FiFileText className="w-4 h-4" /> Generate Report</>
              )}
            </Button>
          </div>
          {error && (
            <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 font-sans">
              <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0" onClick={() => setError('')}><FiX className="w-3 h-3" /></Button>
            </div>
          )}
        </CardContent>
      </Card>

      {loading && (
        <Card className="border border-border/40">
          <CardContent className="p-0">
            <LoadingOverlay message="Generating comprehensive compliance report with AI analysis..." />
          </CardContent>
        </Card>
      )}

      {!loading && !report && data.length === 0 && (
        <Card className="border border-border/40">
          <CardContent className="p-0">
            <EmptyState icon={<FiFileText className="w-6 h-6" />} title="No analyses available" description="Run a BMR Compliance Check first to generate analysis data, then return here to create a comprehensive compliance report." />
          </CardContent>
        </Card>
      )}

      {!loading && !report && data.length > 0 && !selectedBatch && (
        <Card className="border border-border/40">
          <CardContent className="p-0">
            <EmptyState icon={<FiFileText className="w-6 h-6" />} title="Select a batch to generate report" description="Choose a reviewed batch from the dropdown above, then click 'Generate Report' to create a comprehensive compliance report." />
          </CardContent>
        </Card>
      )}

      {!loading && report && (
        <div className="space-y-4" id="report-content">
          {/* Report Header */}
          <Card className="border border-border/40 bg-primary/5">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-sans">Report ID: {report.report_id}</p>
                  <h2 className="text-lg font-bold text-foreground mt-1">Batch {report.batch_id} -- Compliance Report</h2>
                  <p className="text-xs text-muted-foreground mt-0.5 font-sans">Generated: {formatTimestamp(report.generated_at)}</p>
                </div>
                <Badge className={statusBadgeClass(report.executive_summary?.overall_status ?? '')}>{report.executive_summary?.overall_status ?? 'N/A'}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Executive Summary */}
          <Collapsible open={openSections.has('executive')} onOpenChange={() => toggleSection('executive')}>
            <Card className="border border-border/40">
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 cursor-pointer hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">Executive Summary</CardTitle>
                    {openSections.has('executive') ? <FiChevronUp className="w-4 h-4 text-muted-foreground" /> : <FiChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 font-sans">Risk Assessment</p>
                      <div className="text-sm font-sans">{renderMarkdown(report.executive_summary?.risk_assessment ?? 'N/A')}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 font-sans">Disposition Recommendation</p>
                      <div className="text-sm font-sans">{renderMarkdown(report.executive_summary?.batch_disposition_recommendation ?? 'N/A')}</div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 font-sans">Key Findings</p>
                    <div className="text-sm font-sans">{renderMarkdown(report.executive_summary?.key_findings ?? 'N/A')}</div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Stage Findings */}
          <Collapsible open={openSections.has('findings')} onOpenChange={() => toggleSection('findings')}>
            <Card className="border border-border/40">
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 cursor-pointer hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">Stage-by-Stage Findings</CardTitle>
                    {openSections.has('findings') ? <FiChevronUp className="w-4 h-4 text-muted-foreground" /> : <FiChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {Array.isArray(report.stage_findings) && report.stage_findings.length > 0 ? (
                    <div className="space-y-4">
                      {report.stage_findings.map((sf, idx) => (
                        <div key={idx} className="p-4 rounded-lg border border-border/30 bg-muted/10">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold font-sans">{sf.stage_name ?? 'Unknown Stage'}</h4>
                              <Badge className={statusBadgeClass(sf.status ?? '')}>{sf.status ?? 'N/A'}</Badge>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {(sf.critical_flags ?? 0) > 0 && <Badge className="bg-red-600 text-white text-[10px]">{sf.critical_flags} Critical</Badge>}
                              {(sf.major_flags ?? 0) > 0 && <Badge className="bg-orange-500 text-white text-[10px]">{sf.major_flags} Major</Badge>}
                              {(sf.minor_flags ?? 0) > 0 && <Badge className="bg-yellow-500 text-white text-[10px]">{sf.minor_flags} Minor</Badge>}
                            </div>
                          </div>
                          {sf.findings_detail && (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-muted-foreground mb-1 font-sans">Findings Detail</p>
                              <div className="text-sm font-sans">{renderMarkdown(sf.findings_detail)}</div>
                            </div>
                          )}
                          {sf.cross_stage_correlations && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1 font-sans">Cross-Stage Correlations</p>
                              <div className="text-sm font-sans">{renderMarkdown(sf.cross_stage_correlations)}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground font-sans">No stage findings available.</p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Historical Comparison */}
          <Collapsible open={openSections.has('historical')} onOpenChange={() => toggleSection('historical')}>
            <Card className="border border-border/40">
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 cursor-pointer hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">Historical Comparison</CardTitle>
                    {openSections.has('historical') ? <FiChevronUp className="w-4 h-4 text-muted-foreground" /> : <FiChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg bg-muted/30 text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-sans">Batches Compared</p>
                      <p className="text-2xl font-bold text-foreground">{report.historical_comparison?.previous_batches_compared ?? 0}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-sans">Trend Direction</p>
                      <div className="flex items-center justify-center gap-1.5 mt-1">
                        <TrendIcon type={report.historical_comparison?.trend_direction ?? ''} />
                        <p className="text-sm font-medium capitalize font-sans">{report.historical_comparison?.trend_direction ?? 'N/A'}</p>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-sans">Comparison Notes</p>
                      <div className="text-sm font-sans">{renderMarkdown(report.historical_comparison?.comparison_notes ?? 'N/A')}</div>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Recommendations */}
          <Collapsible open={openSections.has('recommendations')} onOpenChange={() => toggleSection('recommendations')}>
            <Card className="border border-border/40">
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 cursor-pointer hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">Prioritized Recommendations</CardTitle>
                    {openSections.has('recommendations') ? <FiChevronUp className="w-4 h-4 text-muted-foreground" /> : <FiChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {Array.isArray(report.recommendations) && report.recommendations.length > 0 ? (
                    <div className="space-y-3">
                      {[...report.recommendations].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99)).map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-border/30 bg-muted/10">
                          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex-shrink-0 font-sans">{rec.priority ?? idx + 1}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge className={severityBadgeClass(rec.severity ?? '')} variant="secondary">{rec.severity ?? 'N/A'}</Badge>
                              {rec.affected_parameters && <span className="text-xs text-muted-foreground font-sans">{rec.affected_parameters}</span>}
                            </div>
                            <p className="text-sm font-medium font-sans">{rec.action ?? 'No action specified'}</p>
                            {rec.timeline && (
                              <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground font-sans">
                                <FiClock className="w-3 h-3" />
                                <span>{rec.timeline}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground font-sans">No recommendations available.</p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* 21 CFR Part 11 Notes */}
          <Collapsible open={openSections.has('cfr')} onOpenChange={() => toggleSection('cfr')}>
            <Card className="border border-border/40">
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 cursor-pointer hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">21 CFR Part 11 Compliance Notes</CardTitle>
                    {openSections.has('cfr') ? <FiChevronUp className="w-4 h-4 text-muted-foreground" /> : <FiChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'Electronic Record Integrity', value: report.cfr_part_11_notes?.electronic_record_integrity },
                      { label: 'Audit Trail Observations', value: report.cfr_part_11_notes?.audit_trail_observations },
                      { label: 'Data Integrity Flags', value: report.cfr_part_11_notes?.data_integrity_flags },
                      { label: 'Signature Requirements', value: report.cfr_part_11_notes?.signature_requirements },
                    ].map((item, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-muted/30">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 font-sans">{item.label}</p>
                        <div className="text-sm font-sans">{renderMarkdown(item.value ?? 'N/A')}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      )}
    </div>
  )
}

// ==================== MAIN PAGE ====================

export default function Page() {
  const [activeScreen, setActiveScreen] = useState<string>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sampleData, setSampleData] = useState(false)
  const [stageConfigs, setStageConfigs] = useState<StageConfig>(() => JSON.parse(JSON.stringify(DEFAULT_STAGE_CONFIGS)))
  const [analyses, setAnalyses] = useState<StoredAnalysis[]>([])
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <FiHome className="w-5 h-5" /> },
    { id: 'stage-config', label: 'Stage Config', icon: <FiSettings className="w-5 h-5" /> },
    { id: 'bmr-review', label: 'BMR Review', icon: <FiClipboard className="w-5 h-5" /> },
    { id: 'reports', label: 'Reports', icon: <FiFileText className="w-5 h-5" /> },
  ]

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground flex">
        {/* Sidebar */}
        <aside className={`print:hidden flex flex-col border-r border-border/40 bg-card transition-all duration-300 flex-shrink-0 ${sidebarCollapsed ? 'w-16' : 'w-60'}`}>
          {/* Logo */}
          <div className="p-4 border-b border-border/30">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <FiShield className="w-5 h-5 text-primary-foreground" />
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <h1 className="text-base font-bold text-foreground tracking-wide">PharmaCPV</h1>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-sans">Compliance Platform</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 space-y-1">
            {navItems.map(item => (
              <TooltipProvider key={item.id} delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={() => setActiveScreen(item.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors font-sans ${activeScreen === item.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
                      {item.icon}
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </button>
                  </TooltipTrigger>
                  {sidebarCollapsed && <TooltipContent side="right"><span className="font-sans">{item.label}</span></TooltipContent>}
                </Tooltip>
              </TooltipProvider>
            ))}
          </nav>

          {/* Agent Status */}
          {!sidebarCollapsed && (
            <div className="p-3 border-t border-border/30">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-sans">AI Agents</p>
              <div className="space-y-2">
                {AGENT_INFO.map(agent => (
                  <div key={agent.id} className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${activeAgentId === agent.id ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30'}`} />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-foreground truncate font-sans">{agent.name}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight font-sans">{agent.purpose}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Collapse Toggle */}
          <div className="p-2 border-t border-border/30">
            <button onClick={() => setSidebarCollapsed(prev => !prev)} className="w-full flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors">
              {sidebarCollapsed ? <FiChevronRight className="w-4 h-4" /> : <FiChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
          {/* Top Bar */}
          <header className="print:hidden flex items-center justify-between px-6 py-3 border-b border-border/30 bg-card/50 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground font-sans">{navItems.find(n => n.id === activeScreen)?.label ?? 'Dashboard'}</span>
              {activeAgentId && (
                <Badge variant="outline" className="text-xs font-sans animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
                  AI Processing
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground cursor-pointer font-sans">Sample Data</Label>
              <Switch id="sample-toggle" checked={sampleData} onCheckedChange={setSampleData} />
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeScreen === 'dashboard' && (
              <DashboardScreen analyses={analyses} sampleData={sampleData} onNavigate={setActiveScreen} />
            )}
            {activeScreen === 'stage-config' && (
              <StageConfigScreen stageConfigs={stageConfigs} setStageConfigs={setStageConfigs} />
            )}
            {activeScreen === 'bmr-review' && (
              <BMRReviewScreen stageConfigs={stageConfigs} analyses={analyses} setAnalyses={setAnalyses} activeAgentId={activeAgentId} setActiveAgentId={setActiveAgentId} />
            )}
            {activeScreen === 'reports' && (
              <ComplianceReportScreen analyses={analyses} sampleData={sampleData} activeAgentId={activeAgentId} setActiveAgentId={setActiveAgentId} />
            )}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}
