'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

interface FiberNode {
  id: string
  node_tag: string
  node_type: string
  status: string
  latitude: number | null
  longitude: number | null
}

interface FiberRoute {
  id: string
  route_id_tag: string
  from_node_id: string
  to_node_id: string
  installation_type: string
  measured_length_feet: number | null
  notes: string | null
}

interface ReportsClientProps {
  projectId: string
  projectName: string
  fiberData: {
    nodes: FiberNode[]
    routes: FiberRoute[]
  }
}

export default function ReportsClient({ projectId, projectName, fiberData }: ReportsClientProps) {
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  
  // Node sorting & filtering state
  const [nodeSearch, setNodeSearch] = useState('')
  const [nodeSortField, setNodeSortField] = useState<'node_tag' | 'node_type' | 'status'>('node_tag')
  const [nodeSortDirection, setNodeSortDirection] = useState<'asc' | 'desc'>('asc')

  const reportsList = [
    {
      name: 'System Coverage & Cam List',
      code: 'R-CAM-01',
      category: 'CCTV / Physical Security',
      description: 'Tabular configuration of cameras, resolutions, lenses, status, and coordinate placement details.',
      lastGenerated: 'Pending Placement Sync',
      type: 'PDF / CSV',
      interactive: false,
    },
    {
      name: 'PoE Power Budget & Port Assignment',
      code: 'R-NET-02',
      category: 'Network / Switch Matrix',
      description: 'Power-over-Ethernet (PoE) budget calculations, switch port mappings, and active load verification reports.',
      lastGenerated: 'Auto-calculating',
      type: 'PDF / JSON',
      interactive: false,
    },
    {
      name: 'Hardware Bill of Materials (BOM)',
      code: 'R-BOM-03',
      category: 'Procurement / Costing',
      description: 'Procurement sheet containing item quantities, manufacturers, part numbers, and status indicators.',
      lastGenerated: 'Live Sync',
      type: 'XLSX / PDF',
      interactive: false,
    },
    {
      name: 'Fiber Pathways & Nodes Report',
      code: 'R-FIB-04',
      category: 'Fiber Optic / Telecom',
      description: 'Dynamic list of fiber pathway routes, handhole nodes, measured lengths, and installation categories.',
      lastGenerated: 'Active Canvas Sync',
      type: 'PDF / Interactive',
      interactive: true,
    },
    {
      name: 'UPS Power Backup & Battery calculations',
      code: 'R-PWR-05',
      category: 'Power / Auxiliary',
      description: 'Calculations for power draw limits, battery backup duration, and auxiliary Solar panels limits.',
      lastGenerated: 'Pending Spec',
      type: 'PDF / XLS',
      interactive: false,
    },
  ]

  // Map of node IDs to node tags for easy lookup in routes table
  const nodeTagMap = useMemo(() => {
    const map = new Map<string, string>()
    fiberData.nodes.forEach((node) => {
      map.set(node.id, node.node_tag)
    })
    return map
  }, [fiberData.nodes])

  // Filter and sort nodes
  const filteredAndSortedNodes = useMemo(() => {
    let result = [...fiberData.nodes]

    // Search filter
    if (nodeSearch.trim() !== '') {
      const searchLower = nodeSearch.toLowerCase()
      result = result.filter(
        (node) =>
          node.node_tag.toLowerCase().includes(searchLower) ||
          node.node_type.toLowerCase().includes(searchLower) ||
          node.status.toLowerCase().includes(searchLower)
      )
    }

    // Sort
    result.sort((a, b) => {
      let valA = a[nodeSortField] || ''
      let valB = b[nodeSortField] || ''

      // Handle case insensitive comparisons
      if (typeof valA === 'string') valA = valA.toLowerCase()
      if (typeof valB === 'string') valB = valB.toLowerCase()

      if (valA < valB) return nodeSortDirection === 'asc' ? -1 : 1
      if (valA > valB) return nodeSortDirection === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [fiberData.nodes, nodeSearch, nodeSortField, nodeSortDirection])

  // Handler to toggle sorting on headers
  const handleSort = (field: 'node_tag' | 'node_type' | 'status') => {
    if (nodeSortField === field) {
      setNodeSortDirection(nodeSortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setNodeSortField(field)
      setNodeSortDirection('asc')
    }
  }

  // Calculate metrics
  const totalLength = useMemo(() => {
    return fiberData.routes.reduce((acc, route) => acc + (route.measured_length_feet || 0), 0)
  }, [fiberData.routes])

  // Count nodes by type
  const nodeTypeCounts = useMemo(() => {
    const counts: { [key: string]: number } = {}
    fiberData.nodes.forEach((node) => {
      const type = node.node_type || 'Unknown'
      counts[type] = (counts[type] || 0) + 1
    })
    return counts
  }, [fiberData.nodes])

  // Count and total route lengths by installation type
  const routeTypeBreakdown = useMemo(() => {
    const breakdown: { [key: string]: { count: number; length: number } } = {}
    fiberData.routes.forEach((route) => {
      const type = route.installation_type || 'other'
      if (!breakdown[type]) {
        breakdown[type] = { count: 0, length: 0 }
      }
      breakdown[type].count += 1
      breakdown[type].length += route.measured_length_feet || 0
    })
    return breakdown
  }, [fiberData.routes])

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 relative z-10 w-full px-6 py-4 font-sans text-[var(--text-primary)] print:text-black">
      {/* Global CSS to hide wrapper elements and style the document for printing */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide app chrome: sidebar, topbar, buttons, search, page header */
          aside, header, nav, button, .no-print, [role="navigation"], .actions-panel, .tab-buttons {
            display: none !important;
          }
          
          /* Reset layout containers for print */
          body, html, main, .print-area-wrapper {
            background: white !important;
            color: black !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .print-document {
            display: block !important;
            background: white !important;
            color: black !important;
            padding: 20px !important;
            width: 100% !important;
          }

          .print-header {
            border-bottom: 2px solid #000 !important;
            margin-bottom: 20px !important;
            padding-bottom: 10px !important;
          }

          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 15px !important;
            font-size: 11px !important;
            color: black !important;
          }

          .print-table th {
            background-color: #f1f5f9 !important;
            color: black !important;
            border: 1px solid #94a3b8 !important;
            padding: 6px 10px !important;
            font-weight: bold !important;
            text-align: left !important;
          }

          .print-table td {
            border: 1px solid #cbd5e1 !important;
            padding: 6px 10px !important;
            color: black !important;
            background: transparent !important;
          }

          .print-card {
            border: 1px solid #cbd5e1 !important;
            border-radius: 6px !important;
            padding: 12px !important;
            margin-bottom: 15px !important;
            background: white !important;
            color: black !important;
          }
        }
      ` }} />

      {/* Main Report Dashboard (hidden when a report is print previewed) */}
      {!selectedReport ? (
        <>
          {/* Page Header */}
          <div className="border-b border-[var(--border)] pb-4 flex items-center justify-between no-print">
            <div>
              <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Project Reports</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Export detailed specifications, engineering sheets, and sign-offs</p>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-[var(--surface-1)] backdrop-blur-md border border-[var(--border)] rounded-2xl p-4 flex items-start gap-3 no-print">
            <div className="p-2 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--accent)]/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </div>
            <div>
              <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Engineering Compliance Verification</h4>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                All reports are dynamically updated from active canvas camera nodes, switch port matrices, and RLS tables. Print layouts will generate PDF sheets complying with Axis Site Designer & Bentley systems format.
              </p>
            </div>
          </div>

          {/* Reports Grid/Table */}
          <div className="bg-[var(--surface-1)] backdrop-blur-md border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden no-print">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[var(--surface-2)] text-[var(--text-secondary)] border-b border-[var(--border)] font-mono text-[9px] uppercase tracking-wider">
                    <th className="py-3 px-6">Report Code</th>
                    <th className="py-3 px-4">Report Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Formats</th>
                    <th className="py-3 px-4">Last Sync</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {reportsList.map((rep, idx) => (
                    <tr key={idx} className="hover:bg-slate-855/15 transition-colors">
                      <td className="py-3.5 px-6 font-mono font-bold text-[var(--accent-text)]">
                        {rep.code}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[var(--text-primary)]">
                        <div>
                          {rep.name}
                          <p className="text-[10px] text-[var(--text-secondary)] font-normal mt-0.5">{rep.description}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                        <span className="px-2 py-0.5 rounded-full text-[9px] bg-[var(--surface-2)] border border-[var(--border)] font-mono text-[var(--text-secondary)]">
                          {rep.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[var(--text-secondary)]">
                        {rep.type}
                      </td>
                      <td className="py-3.5 px-4 text-[var(--text-secondary)] font-mono">
                        {rep.lastGenerated}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        {rep.interactive ? (
                          <button
                            onClick={() => setSelectedReport(rep.code)}
                            className="px-3 py-1 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white hover:bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[var(--text-primary)] border border-[var(--accent)]/20 rounded-lg text-[10px] font-bold transition-all shadow-md active:scale-95"
                          >
                            Open Report
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-2.5 py-1 bg-[var(--surface-1)] text-slate-600 border border-[var(--border)] rounded-lg text-[10px] font-bold cursor-not-allowed"
                          >
                            Locked
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Report Detail Sheet Mode */
        <div className="print-area-wrapper print-document">
          {/* Top navigation actions inside report view */}
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 mb-6 no-print">
            <button
              onClick={() => setSelectedReport(null)}
              className="inline-flex items-center gap-1 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              Back to Reports List
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white hover:bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[var(--text-primary)] font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Print / Save PDF
              </button>
            </div>
          </div>

          {/* Print Only Header (Visible only when paper printing or saving as PDF) */}
          <div className="hidden print-header">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold uppercase tracking-wide">ProjectIQ Engineering Specification Sheet</h1>
                <h2 className="text-sm font-semibold text-slate-700 mt-1">Report R-FIB-04: Fiber Pathways & Nodes</h2>
              </div>
              <div className="text-right text-[10px] font-mono text-slate-650">
                <div>Project: {projectName}</div>
                <div>Date Generated: {new Date().toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          {/* Interactive Report Header */}
          <div className="no-print">
            <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Fiber Pathways & Nodes Report</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Detailed routing, physical conduits, junction locations, and measurements.</p>
          </div>

          {/* Project Details Box */}
          <div className="mt-6 bg-[var(--surface-1)]/30 border border-[var(--border)] rounded-2xl p-5 grid grid-cols-2 md:grid-cols-4 gap-6 print-card">
            <div>
              <div className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase">Project Name</div>
              <div className="text-sm font-bold text-slate-100 print:text-black mt-1">{projectName}</div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase">Total Fiber Nodes</div>
              <div className="text-sm font-bold text-[var(--accent-text)] print:text-black mt-1 font-mono">{fiberData.nodes.length} nodes</div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase">Total Conduit Routes</div>
              <div className="text-sm font-bold text-sky-400 print:text-black mt-1 font-mono">{fiberData.routes.length} pathways</div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase">Total Measured Length</div>
              <div className="text-sm font-bold text-emerald-400 print:text-black mt-1 font-mono">{totalLength.toLocaleString()} feet</div>
            </div>
          </div>

          {/* Element Quantities Breakdown */}
          <div className="mt-6 bg-[var(--surface-1)]/10 border border-[var(--border)] rounded-2xl p-5 print-card">
            <h3 className="text-xs font-mono text-slate-405 uppercase tracking-wider mb-4 print:text-black border-b border-[var(--border)]/30 pb-2">
              Element Quantities Breakdown / Resumen de Cantidades
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nodes breakdown */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-[var(--accent-text)] print:text-black uppercase tracking-wide">
                  Fiber Nodes by Type
                </h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                  {Object.entries(nodeTypeCounts).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center py-0.5 border-b border-[var(--border)]/50 pb-1 font-mono text-[var(--text-secondary)] print:text-black print:border-slate-200">
                      <span className="truncate pr-2">{type}</span>
                      <span className="font-bold text-[var(--text-primary)] print:text-black">{count}</span>
                    </div>
                  ))}
                  {Object.keys(nodeTypeCounts).length === 0 && (
                    <div className="text-[var(--text-tertiary)] italic col-span-2">No nodes available</div>
                  )}
                </div>
              </div>

              {/* Pathways breakdown */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-sky-400 print:text-black uppercase tracking-wide">
                  Pathways by Installation Type
                </h4>
                <div className="space-y-1.5 text-xs font-mono">
                  {Object.entries(routeTypeBreakdown).map(([type, data]) => (
                    <div key={type} className="flex justify-between items-center py-0.5 border-b border-[var(--border)]/50 pb-1 text-[var(--text-secondary)] print:text-black print:border-slate-200">
                      <span className="capitalize">{type.replace('_', ' ')}</span>
                      <span className="font-bold text-[var(--text-primary)] print:text-black">
                        {data.count} ({Math.round(data.length).toLocaleString()} ft)
                      </span>
                    </div>
                  ))}
                  {Object.keys(routeTypeBreakdown).length === 0 && (
                    <div className="text-[var(--text-tertiary)] italic">No pathways available</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Filter & Sorting Panel */}
          <div className="mt-6 bg-[var(--surface-1)]/20 border border-[var(--border)] rounded-xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-center no-print">
            <div className="relative w-full sm:w-80">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-tertiary)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input
                type="text"
                placeholder="Search nodes (tag, type, status)..."
                value={nodeSearch}
                onChange={(e) => setNodeSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] placeholder-slate-500 focus:outline-none focus:border-[var(--accent)]/50"
              />
              {nodeSearch && (
                <button
                  onClick={() => setNodeSearch('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>

            <div className="text-[10px] text-[var(--text-secondary)] font-mono">
              Showing {filteredAndSortedNodes.length} of {fiberData.nodes.length} nodes (sorted by <span className="font-bold text-[var(--accent-text)]">{nodeSortField.replace('node_', '')}</span> in <span className="font-bold text-[var(--accent-text)]">{nodeSortDirection}</span>)
            </div>
          </div>

          {/* SECTION 1: FIBER NODES LIST */}
          <div className="mt-8">
            <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider print:text-black">1. Fiber Nodes Listing</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1 print:text-slate-600 no-print">
              Click table headers to sort the nodes list. Search applies to tag, type, and status values.
            </p>
            <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl overflow-hidden mt-3 print:border-none print:bg-white">
              <table className="w-full text-left border-collapse text-xs print-table">
                <thead>
                  <tr className="bg-[var(--surface-2)] text-[var(--text-secondary)] border-b border-[var(--border)] font-mono text-[9px] uppercase tracking-wider print:bg-slate-100 print:text-black">
                    <th
                      onClick={() => handleSort('node_tag')}
                      className="py-3 px-4 cursor-pointer hover:text-[var(--text-primary)] transition-colors no-print select-none"
                    >
                      <div className="flex items-center gap-1">
                        Node Tag
                        {nodeSortField === 'node_tag' && (
                          <span>{nodeSortDirection === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    {/* Print-only Node Tag Header (non-clickable) */}
                    <th className="hidden print:table-cell py-3 px-4 font-bold">Node Tag</th>

                    <th
                      onClick={() => handleSort('node_type')}
                      className="py-3 px-4 cursor-pointer hover:text-[var(--text-primary)] transition-colors no-print select-none"
                    >
                      <div className="flex items-center gap-1">
                        Node Type
                        {nodeSortField === 'node_type' && (
                          <span>{nodeSortDirection === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    {/* Print-only Node Type Header */}
                    <th className="hidden print:table-cell py-3 px-4 font-bold">Node Type</th>

                    <th
                      onClick={() => handleSort('status')}
                      className="py-3 px-4 cursor-pointer hover:text-[var(--text-primary)] transition-colors no-print select-none"
                    >
                      <div className="flex items-center gap-1">
                        Status
                        {nodeSortField === 'status' && (
                          <span>{nodeSortDirection === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    {/* Print-only Status Header */}
                    <th className="hidden print:table-cell py-3 px-4 font-bold">Status</th>

                    <th className="py-3 px-4">Latitude</th>
                    <th className="py-3 px-4">Longitude</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 print:divide-y print:divide-slate-200">
                  {filteredAndSortedNodes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[var(--text-tertiary)] font-mono">
                        No fiber nodes matched the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedNodes.map((node) => (
                      <tr key={node.id} className="hover:bg-[var(--surface-1)]/20 print:hover:bg-transparent">
                        <td className="py-3 px-4 font-bold text-slate-250 print:text-black font-mono">
                          {node.node_tag}
                        </td>
                        <td className="py-3 px-4 font-mono text-[var(--text-secondary)] print:text-black">
                          {node.node_type}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider print:bg-transparent print:border-none print:p-0 print:text-black ${
                              node.status === 'Installed'
                                ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/10'
                                : node.status === 'Existing'
                                ? 'bg-sky-500/10 text-sky-450 border border-sky-500/10'
                                : node.status === 'Planned'
                                ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white/10 text-indigo-405 border border-[var(--accent)]/10'
                                : node.status === 'Blocked'
                                ? 'bg-rose-500/10 text-rose-450 border border-rose-500/10'
                                : 'bg-slate-800 text-[var(--text-secondary)] border border-slate-700/50'
                            }`}
                          >
                            {node.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[var(--text-secondary)] print:text-black">
                          {node.latitude !== null ? node.latitude.toFixed(6) : 'N/A'}
                        </td>
                        <td className="py-3 px-4 font-mono text-[var(--text-secondary)] print:text-black">
                          {node.longitude !== null ? node.longitude.toFixed(6) : 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 2: FIBER PATHWAYS LIST */}
          <div className="mt-8 page-break-before">
            <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider print:text-black">2. Conduit Pathway Routes</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1 print:text-slate-600 no-print">
              Conduit paths connecting active junction points. Length is haversine calculation modified by Slack.
            </p>
            <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl overflow-hidden mt-3 print:border-none print:bg-white">
              <table className="w-full text-left border-collapse text-xs print-table">
                <thead>
                  <tr className="bg-[var(--surface-2)] text-[var(--text-secondary)] border-b border-[var(--border)] font-mono text-[9px] uppercase tracking-wider print:bg-slate-100 print:text-black">
                    <th className="py-3 px-4">Route ID</th>
                    <th className="py-3 px-4">Source Node</th>
                    <th className="py-3 px-4">Destination Node</th>
                    <th className="py-3 px-4">Installation Type</th>
                    <th className="py-3 px-4">Measured Length</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 print:divide-y print:divide-slate-200">
                  {fiberData.routes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[var(--text-tertiary)] font-mono">
                        No conduit routes defined in this project.
                      </td>
                    </tr>
                  ) : (
                    fiberData.routes.map((route) => (
                      <tr key={route.id} className="hover:bg-[var(--surface-1)]/20 print:hover:bg-transparent">
                        <td className="py-3 px-4 font-bold text-slate-250 print:text-black font-mono">
                          {route.route_id_tag}
                        </td>
                        <td className="py-3 px-4 font-mono text-[var(--text-secondary)] print:text-black">
                          {nodeTagMap.get(route.from_node_id) || 'Unknown Node'}
                        </td>
                        <td className="py-3 px-4 font-mono text-[var(--text-secondary)] print:text-black">
                          {nodeTagMap.get(route.to_node_id) || 'Unknown Node'}
                        </td>
                        <td className="py-3 px-4 font-mono text-[var(--text-secondary)] print:text-black capitalize">
                          {route.installation_type.replace('_', ' ')}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-450 print:text-black">
                          {route.measured_length_feet !== null
                            ? `${Math.round(route.measured_length_feet).toLocaleString()} ft`
                            : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-[var(--text-secondary)] print:text-black truncate max-w-[200px]">
                          {route.notes || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
