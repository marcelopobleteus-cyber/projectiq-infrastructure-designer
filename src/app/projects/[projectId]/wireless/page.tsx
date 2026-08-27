import React from 'react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectWirelessPage({ params }: PageProps) {
  const { projectId } = await params

  // Planned engineering state metrics
  const metrics = [
    { label: 'Total Wireless Links', value: 0, color: 'text-[var(--accent-text)]' },
    { label: 'Radios', value: 0, color: 'text-[var(--success)]' },
    { label: 'Cameras using Wireless', value: 0, color: 'text-[var(--text-primary)]' },
    { label: 'Links needing validation', value: 0, color: 'text-[var(--warn)]' },
    { label: 'Signal warnings', value: 0, color: 'text-[var(--danger)]' },
  ]

  const sections = [
    {
      title: 'Wireless Links',
      desc: 'PtP & PtMP transmission pathways connecting cameras to distribution hub switches.',
      icon: (
        <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
    },
    {
      title: 'Wireless Radios',
      desc: 'Active 5GHz/60GHz access points, client terminals, and cellular modems inventory.',
      icon: (
        <svg className="w-5 h-5 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
        </svg>
      ),
    },
    {
      title: 'PtP / PtMP Planning',
      desc: 'Line of Sight alignment profiles, channel allocations, and sector coverages.',
      icon: (
        <svg className="w-5 h-5 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
      ),
    },
    {
      title: 'Signal & Latency',
      desc: 'Link quality KPIs including RSSI (dBm), CINR (dB), capacity, and packet jitter.',
      icon: (
        <svg className="w-5 h-5 text-[var(--warn)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      title: 'Line of Sight',
      desc: 'Obstruction audits, terrain elevation profiles, and Fresnel zone clearances.',
      icon: (
        <svg className="w-5 h-5 text-[var(--danger)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    {
      title: 'Installation Status',
      desc: 'Mounting brackets, power wiring specs, and alignment validation checklist.',
      icon: (
        <svg className="w-5 h-5 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="space-y-6 px-6 py-4 flex-1 flex flex-col overflow-y-auto scrollbar-thin font-sans text-[var(--text-primary)] bg-[var(--bg)] min-h-full">
      
      {/* Page Header */}
      <div className="border-b border-[var(--border)] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">Wireless Backhaul Design</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Plan PtP, PtMP, Wi-Fi bridge, LTE/5G and wireless camera connectivity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}/maps`}
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--surface-1)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] rounded-lg text-xs font-bold transition-all shrink-0 shadow-xs cursor-pointer"
          >
            Open GIS Map Workspace →
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        {metrics.map((m, idx) => (
          <div key={idx} className="bg-[var(--surface-1)] border border-[var(--border)] p-4 rounded-xl flex flex-col justify-between shadow-xs">
            <span className="text-[9.5px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">{m.label}</span>
            <span className={`text-2xl font-black font-mono tracking-tight mt-1 ${m.color}`}>{m.value}</span>
          </div>
        ))}
      </div>

      {/* Planned-State Engineering Notice (Recommended Action Callout Spec: --accent-soft bg, --accent-border border) */}
      <div className="bg-[var(--accent-soft)] border border-[var(--accent-border)] rounded-xl p-5 flex flex-col md:flex-row gap-5 items-center justify-between shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-[var(--surface-1)] border border-[var(--accent-border)] flex items-center justify-center shrink-0 text-[var(--accent-text)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 2 22 22 22 12 2"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-[var(--accent-text)] uppercase tracking-wider">Planned Engineering Module</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-2xl leading-relaxed">
              Wireless PtP/PtMP path planners, signal capacity simulations, and automated RF alignment metrics are currently scheduled for the next sprint. Use the <strong className="text-[var(--text-primary)]">GIS Map Workspace</strong> to assign wireless connectivity parameters directly to cameras.
            </p>
          </div>
        </div>
        <button
          disabled
          className="px-3.5 py-2 bg-[var(--surface-1)] border border-[var(--accent-border)] text-[var(--accent-text)] rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-not-allowed shrink-0"
        >
          RF Planner Planned
        </button>
      </div>

      {/* Dashboard Subgrids / Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sections.map((sec, idx) => (
          <div key={idx} className="bg-[var(--surface-1)] border border-[var(--border)] p-4 rounded-xl flex flex-col gap-3 shadow-xs hover:border-[var(--border-strong)] transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] shrink-0">
                {sec.icon}
              </div>
              <h4 className="text-xs font-extrabold text-[var(--text-primary)] uppercase tracking-wider">{sec.title}</h4>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
              {sec.desc}
            </p>
            <div className="mt-auto pt-2 border-t border-[var(--border)] flex justify-between items-center text-[10px]">
              <span className="text-[var(--text-tertiary)] font-bold uppercase tracking-wider">Planned Mode</span>
              <span className="text-[var(--accent-text)] font-semibold cursor-not-allowed">Configure &rarr;</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
