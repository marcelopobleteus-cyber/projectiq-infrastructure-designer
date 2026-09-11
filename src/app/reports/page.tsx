'use client'

import React, { useEffect, useState } from 'react'
import { getOrgReportsSummary, type OrgReportsSummary } from '../projects/actions-org-reports'

export default function GlobalReportsPage() {
  const [summary, setSummary] = useState<OrgReportsSummary | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [previewReport, setPreviewReport] = useState<any>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getOrgReportsSummary().then(res => {
      if (cancelled) return
      if (res.error || !res.data) {
        setLoadError(res.error || 'Could not load organization data.')
      } else {
        setSummary(res.data)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const globalReports = [
    {
      title: 'Projects Summary',
      desc: 'High-level dashboard summary of all deployed, active, and pending projects across the organization.',
      sections: 'Status breakdown, camera and device totals, BOM cost, active client share links',
      status: 'Ready'
    },
    {
      title: 'Active Projects Report',
      desc: 'Operational summary of active designs showing task completion and per-project progress.',
      sections: 'Per-project task completion, camera counts, status',
      status: 'Ready'
    },
    {
      title: 'Equipment Usage Report',
      desc: 'Aggregated analytics of hardware and parts selected across all projects (useful for bulk procurement).',
      sections: 'Total cameras by model, total switches, total fiber conduit distance',
      status: 'Draft / Coming Soon'
    },
    {
      title: 'Open Tasks Across Projects',
      desc: 'Task matrix aggregating all field tech checklists, fiber testing, and camera installation tickets.',
      sections: 'High priority tasks, assigned technicians, project delays, open tickets',
      status: 'Draft / Coming Soon'
    },
    {
      title: 'BOM Summary Across Projects',
      desc: 'Consolidated Bill of Materials for all projects. Exports parts and counts for purchase orders.',
      sections: 'Consolidated materials sheet, estimated costs, vendor part list',
      status: 'Draft / Coming Soon'
    },
    {
      title: 'Client Share Links',
      desc: 'Audit of read-only client links generated across all projects.',
      sections: 'Active links, expiration dates, view counts',
      status: 'Ready'
    },
    {
      title: 'Client Deliverables Index',
      desc: 'Aggregated documentation packages, user guides, closeout records, and test reports.',
      sections: 'PDF packages, closeout signatures, fiber test OTDR curves',
      status: 'Draft / Coming Soon'
    }
  ]

  const handleGenerateReport = (report: any) => {
    setPreviewReport(report)
  }

  return (
    <div className="space-y-6 w-full px-6 py-8 font-sans text-[var(--text-primary)] bg-[var(--bg)] min-h-full overflow-y-auto scrollbar-thin relative">

      {/* Title Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight leading-none">
            Global Reports
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1.5 font-medium">
            Cross-project reports, bulk statistics, and procurement deliverables.
          </p>
        </div>
        <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--accent-border)] font-mono">
          Company level
        </span>
      </div>

      {loadError && (
        <div className="bg-[var(--danger-soft,#fee2e2)] border border-[var(--danger)] text-[var(--danger)] text-xs font-semibold px-4 py-3 rounded-xl">
          {loadError}
        </div>
      )}

      {/* Grid List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {globalReports.map((r, i) => (
          <div
            key={i}
            className="bg-[var(--surface-1)] border border-[var(--border)] p-5 rounded-xl flex flex-col justify-between space-y-4 shadow-xs hover:border-[var(--border-strong)] transition"
          >
            {/* Header info */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-[var(--text-primary)] text-sm">{r.title}</h3>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider font-mono ${
                  r.status === 'Ready'
                    ? 'bg-[var(--success-soft)] text-[var(--success)] border border-emerald-200'
                    : 'bg-[var(--surface-2)] text-[var(--text-tertiary)] border border-[var(--border)]'
                }`}>{r.status}</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{r.desc}</p>
            </div>

            {/* Details container */}
            <div className="bg-[var(--surface-2)] p-3.5 rounded-lg border border-[var(--border)] text-[11px] font-mono text-[var(--text-secondary)]">
              <strong className="text-[var(--text-primary)] font-sans font-bold">Included Metrics:</strong>
              <p className="text-[var(--text-secondary)] mt-0.5 leading-snug">{r.sections}</p>
            </div>

            {/* Action button */}
            {r.status === 'Ready' ? (
              <button
                type="button"
                onClick={() => handleGenerateReport(r)}
                disabled={loading}
                className="w-full py-2 bg-[var(--accent)] disabled:opacity-50 text-white rounded-lg text-xs font-bold transition tracking-wide cursor-pointer shadow-xs active:scale-98"
              >
                {loading ? 'Loading project data...' : 'Generate Report'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSelectedReport(r)}
                className="w-full py-2 bg-[var(--surface-2)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] rounded-lg text-xs font-semibold transition tracking-wide cursor-pointer active:scale-98"
              >
                View Scope — Coming Soon
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Report Scope Modal (for Coming Soon reports) */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[var(--surface-1)] backdrop-blur-xs" onClick={() => setSelectedReport(null)} />
          <div className="relative bg-[var(--surface-1)] border border-[var(--border-strong)] p-6 rounded-xl w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 font-sans">
            <div>
              <span className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider font-mono">Report Scope</span>
              <h3 className="text-sm font-extrabold uppercase text-[var(--accent-text)] tracking-wider mt-0.5">{selectedReport.title}</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-2">{selectedReport.desc}</p>
            </div>

            <div className="space-y-3 text-xs font-mono bg-[var(--surface-2)] p-4 border border-[var(--border)] rounded-lg text-[var(--text-secondary)]">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[var(--text-tertiary)] font-sans uppercase">Planned Data Integrations</span>
                <p className="text-[var(--text-primary)] leading-relaxed">{selectedReport.sections}</p>
              </div>

              <div className="pt-2 border-t border-[var(--border)] text-[var(--warn)] font-bold flex items-center gap-1.5 font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--warn)]" />
                Status: Coming Soon
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setSelectedReport(null)} className="px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] rounded-lg text-xs font-bold transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Preview Modal — real data */}
      {previewReport && summary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[var(--surface-1)] backdrop-blur-xs" onClick={() => setPreviewReport(null)} />
          <div className="relative bg-[var(--surface-1)] border border-[var(--border-strong)] p-6 rounded-xl w-full max-w-2xl space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 font-sans">
            <div>
              <span className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider font-mono">{summary.organizationName}</span>
              <h3 className="text-base font-extrabold text-[var(--text-primary)] tracking-wider mt-0.5">{previewReport.title}</h3>
            </div>

            <div className="space-y-4 text-xs font-mono bg-[var(--surface-2)] p-5 border border-[var(--border)] rounded-lg text-[var(--text-secondary)] max-h-[400px] overflow-y-auto scrollbar-thin">
              <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase font-sans">Report Header</span>
                <span className="text-[10px] text-[var(--text-tertiary)]">Date: {new Date(summary.generatedAt).toLocaleDateString()}</span>
              </div>

              {previewReport.title === 'Projects Summary' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Stat label="Projects" value={summary.projectCount} />
                    <Stat label="Cameras" value={summary.totalCameras} />
                    <Stat label="Network devices" value={summary.totalNetworkDevices} />
                    <Stat label="BOM cost" value={`$${summary.totalBomCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
                  </div>
                  <div className="p-3 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg space-y-1.5">
                    <span className="text-[10px] font-bold text-[var(--text-tertiary)] font-sans uppercase">Status breakdown</span>
                    {summary.projectsByStatus.length === 0 ? (
                      <p className="text-[var(--text-tertiary)] italic">No projects yet.</p>
                    ) : (
                      summary.projectsByStatus.map(s => (
                        <div key={s.status} className="flex justify-between border-b border-[var(--border)]/50 pb-1">
                          <span className="capitalize">{s.status.replace('_', ' ')}</span>
                          <span className="font-bold text-[var(--text-primary)]">{s.count}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-3 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg flex justify-between">
                    <span className="text-[10px] font-bold text-[var(--text-tertiary)] font-sans uppercase">Active client share links</span>
                    <span className="font-bold text-[var(--text-primary)]">{summary.activeShareLinks}</span>
                  </div>
                </div>
              )}

              {previewReport.title === 'Active Projects Report' && (
                <div className="space-y-2">
                  <div className="p-3 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg flex justify-between">
                    <span className="text-[10px] font-bold text-[var(--text-tertiary)] font-sans uppercase">Overall task completion</span>
                    <span className="font-bold text-[var(--text-primary)]">{summary.tasks.completed} / {summary.tasks.total} ({summary.tasks.percentComplete}%)</span>
                  </div>
                  {summary.projects.length === 0 ? (
                    <p className="text-[var(--text-tertiary)] italic p-3">No projects yet.</p>
                  ) : (
                    summary.projects.map(p => (
                      <div key={p.id} className="p-3 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg flex items-center justify-between">
                        <div>
                          <div className="font-bold text-[var(--text-primary)] font-sans">{p.name}</div>
                          <div className="text-[10px] capitalize text-[var(--text-tertiary)]">{p.status.replace('_', ' ')} · {p.cameraCount} cameras</div>
                        </div>
                        <span className="font-bold text-[var(--accent-text)]">{p.taskPercentComplete}%</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {previewReport.title === 'Client Share Links' && (
                <div className="p-3 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg flex justify-between">
                  <span className="text-[10px] font-bold text-[var(--text-tertiary)] font-sans uppercase">Active links across all projects</span>
                  <span className="font-bold text-[var(--text-primary)]">{summary.activeShareLinks}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <span className="px-4 py-2 text-[11px] text-[var(--text-tertiary)] font-semibold">
                Per-project PDF export lives inside each project, under Reports.
              </span>
              <button type="button" onClick={() => setPreviewReport(null)} className="px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] rounded-lg text-xs font-bold transition">
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg space-y-0.5">
      <span className="text-[10px] font-bold text-[var(--text-tertiary)] font-sans uppercase">{label}</span>
      <div className="text-sm font-extrabold text-[var(--text-primary)] font-sans">{value}</div>
    </div>
  )
}
