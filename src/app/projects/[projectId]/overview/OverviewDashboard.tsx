'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import OverviewEditPanel from './OverviewEditPanel'
import PortfolioSection from './PortfolioSection'
import { WorkflowStep, WorkflowGroup, WORKFLOW_GROUPS } from '@/lib/workflow/projectWorkflowRegistry'
import type { PortfolioData } from '../../actions'

interface ProjectData {
  id: string
  name: string
  description: string | null
  default_latitude: number
  default_longitude: number
  default_zoom: number
}

interface OverviewDashboardProps {
  project: ProjectData
  stats: {
    camerasCount: number
    camerasWithConnectivityCount: number
    nodesCount: number
    routesCount: number
    cablesCount: number
    enclosuresCount: number
    networkDevicesCount: number
    switchesCount: number
    powerPointsCount: number
    fieldTasksCount: number
    openIssuesCount: number
    projectHasCoords: boolean
    hasBOMItems: boolean
    hasDocuments: boolean
  }
  steps: WorkflowStep[]
  criticalIssues: string[]
  progressPercent: number
  completedActiveSteps: number
  activeSteps: number
  nextRecommendedStep: WorkflowStep | undefined
  googleMapsApiKey: string | undefined
  portfolio: PortfolioData
}

export default function OverviewDashboard({
  project,
  stats,
  steps,
  criticalIssues,
  progressPercent,
  completedActiveSteps,
  activeSteps,
  nextRecommendedStep,
  googleMapsApiKey,
  portfolio,
}: OverviewDashboardProps) {
  // Client state to track the active stepper group
  const [activeGroup, setActiveGroup] = useState<WorkflowGroup>('Setup')

  // Group steps by group
  const groups: WorkflowGroup[] = ['Setup', 'Assets', 'Connectivity', 'Infrastructure', 'Execution', 'Validation', 'Delivery']

  // Helper to map status to color classes
  const getStatusDotColor = (status: string) => {
    if (status === 'Complete') return 'bg-emerald-550 dark:bg-emerald-500'
    if (status === 'In Progress') return 'bg-blue-500'
    if (status === 'Needs Attention') return 'bg-amber-500'
    if (status === 'Planned') return 'bg-purple-500'
    return 'bg-slate-300 dark:bg-slate-700'
  }

  // Calculate dynamic warning counts per group for the stepper
  const getGroupWarningCount = (groupName: WorkflowGroup): number => {
    let count = 0
    if (groupName === 'Setup' && !stats.projectHasCoords) count++
    if (groupName === 'Assets' && stats.camerasCount === 0) count++
    if (groupName === 'Connectivity' && stats.camerasCount > 0 && stats.camerasWithConnectivityCount < stats.camerasCount) {
      count += (stats.camerasCount - stats.camerasWithConnectivityCount)
    }
    if (groupName === 'Infrastructure') {
      if (stats.camerasCount > 0 && stats.routesCount === 0) count++
      if (stats.routesCount > 0 && stats.cablesCount === 0) count++
    }
    if (groupName === 'Execution' && stats.fieldTasksCount === 0) count++
    if (groupName === 'Delivery' && !stats.hasBOMItems) count++
    return count
  }

  // Get active step status helper
  const getGroupStatusSummary = (groupName: WorkflowGroup) => {
    const groupSteps = steps.filter(s => s.group === groupName)
    const active = groupSteps.filter(s => s.phaseAvailability === 'Active' || s.phaseAvailability === 'Partial')
    if (active.length === 0) return 'Planned'
    const completed = active.filter(s => s.status === 'Complete')
    if (completed.length === active.length) return 'Complete'
    if (active.some(s => s.status === 'Needs Attention')) return 'Needs Attention'
    if (completed.length > 0 || active.some(s => s.status === 'In Progress')) return 'In Progress'
    return 'Not Started'
  }

  return (
    <div className="space-y-8 w-full px-6 py-8 font-sans text-slate-800 dark:text-slate-250 max-w-7xl mx-auto transition-colors duration-150">
      
      {/* 1. Top Hero / Command Center Header */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850/40 rounded-3xl p-6 md:p-8 shadow-sm dark:shadow-none flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2.5xl font-black text-[#0A1F44] dark:text-white tracking-tight leading-none">
              {project.name}
            </h1>
            <span className="text-[9px] font-black uppercase px-2.5 py-0.75 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border border-indigo-150/40 dark:border-indigo-900/30 tracking-wider">
              Command Center
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            CCTV + Fiber Infrastructure Design Workspace
          </p>
          <div className="text-xs text-slate-400 dark:text-slate-500 font-medium pt-0.5">
            {nextRecommendedStep ? (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                Next recommended step: <strong className="text-indigo-650 dark:text-indigo-400">{nextRecommendedStep.title}</strong>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-450">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                All engineering milestones completed!
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 shrink-0">
          {/* Progress Indicator */}
          <div className="flex flex-col gap-2 w-full sm:w-56">
            <div className="flex justify-between items-end text-xs font-bold">
              <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[9px]">Project Readiness</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-mono text-sm leading-none">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-2">
              <div
                className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold">
              {completedActiveSteps} of {activeSteps} active phases done
            </span>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {nextRecommendedStep && (
              <Link
                href={`/projects/${project.id}/${nextRecommendedStep.relatedRoute}`}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow active:scale-[0.98] transition flex items-center gap-2"
              >
                Continue Workflow
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
              </Link>
            )}
            <Link
              href={`/projects/${project.id}/maps`}
              className="px-5 py-2.5 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-850/60 text-slate-700 dark:text-slate-300 border border-slate-150 dark:border-slate-800/30 font-bold text-xs rounded-xl active:scale-[0.98] transition flex items-center gap-2"
            >
              Open Map Workspace
            </Link>
          </div>
        </div>
      </div>

      {/* 1.5. Portfolio linkage — parent breadcrumb, consolidated rollup, or link control */}
      <PortfolioSection projectId={project.id} portfolio={portfolio} />

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Metric 1: Cameras */}
        <div className="bg-white dark:bg-slate-900/20 border border-slate-100 dark:border-slate-850/30 p-4.5 rounded-2xl shadow-sm hover:shadow transition flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">CCTV Cameras</span>
            <span className="text-xs">📸</span>
          </div>
          <div>
            <span className="text-2.5xl font-black text-[#0A1F44] dark:text-white font-mono leading-none block">
              {stats.camerasCount}
            </span>
            <div className="flex items-center gap-1 mt-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${stats.camerasCount > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400">
                {stats.camerasCount > 0 ? `${stats.camerasCount} Registered` : 'No cameras placed'}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Connectivity */}
        <div className="bg-white dark:bg-slate-900/20 border border-slate-100 dark:border-slate-850/30 p-4.5 rounded-2xl shadow-sm hover:shadow transition flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Connectivity</span>
            <span className="text-xs">⚡</span>
          </div>
          <div>
            <span className="text-2.5xl font-black text-[#0A1F44] dark:text-white font-mono leading-none block">
              {stats.camerasCount > 0 ? Math.round((stats.camerasWithConnectivityCount / stats.camerasCount) * 100) : 0}%
            </span>
            <div className="flex items-center gap-1 mt-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${stats.camerasCount > 0 && stats.camerasWithConnectivityCount === stats.camerasCount ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400">
                {stats.camerasWithConnectivityCount} of {stats.camerasCount} configured
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Fiber Routes */}
        <div className="bg-white dark:bg-slate-900/20 border border-slate-100 dark:border-slate-850/30 p-4.5 rounded-2xl shadow-sm hover:shadow transition flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Fiber Routes</span>
            <span className="text-xs">🧬</span>
          </div>
          <div>
            <span className="text-2.5xl font-black text-[#0A1F44] dark:text-white font-mono leading-none block">
              {stats.routesCount}
            </span>
            <div className="flex items-center gap-1 mt-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${stats.routesCount > 0 ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400">
                {stats.routesCount} Path runs designed
              </span>
            </div>
          </div>
        </div>

        {/* Metric 4: Network & Power */}
        <div className="bg-white dark:bg-slate-900/20 border border-slate-100 dark:border-slate-850/30 p-4.5 rounded-2xl shadow-sm hover:shadow transition flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Net / Power</span>
            <span className="text-xs">🔌</span>
          </div>
          <div>
            <span className="text-2.5xl font-black text-[#0A1F44] dark:text-white font-mono leading-none block">
              {stats.networkDevicesCount}
            </span>
            <div className="flex items-center gap-1 mt-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${stats.networkDevicesCount > 0 ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400">
                {stats.switchesCount} Active Switches mapped
              </span>
            </div>
          </div>
        </div>

        {/* Metric 5: Field Work */}
        <div className="bg-white dark:bg-slate-900/20 border border-slate-100 dark:border-slate-850/30 p-4.5 rounded-2xl shadow-sm hover:shadow transition flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Field Work</span>
            <span className="text-xs">👷</span>
          </div>
          <div>
            <span className="text-2.5xl font-black text-[#0A1F44] dark:text-white font-mono leading-none block">
              {stats.fieldTasksCount}
            </span>
            <div className="flex items-center gap-1 mt-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${stats.fieldTasksCount > 0 ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400">
                {stats.fieldTasksCount - stats.openIssuesCount} of {stats.fieldTasksCount} tasks complete
              </span>
            </div>
          </div>
        </div>

        {/* Metric 6: Delivery */}
        <div className="bg-white dark:bg-slate-900/20 border border-slate-100 dark:border-slate-850/30 p-4.5 rounded-2xl shadow-sm hover:shadow transition flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">BOM Delivery</span>
            <span className="text-xs">📦</span>
          </div>
          <div>
            <span className="text-lg font-black text-[#0A1F44] dark:text-white leading-none block truncate mt-1">
              {stats.hasBOMItems ? 'BOM Ready' : 'BOM Empty'}
            </span>
            <div className="flex items-center gap-1 mt-2">
              <span className={`w-1.5 h-1.5 rounded-full ${stats.hasBOMItems ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 font-sans">
                {stats.hasBOMItems ? 'Parts pricing generated' : 'No parts listed'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Next Recommended Action Panel */}
      {nextRecommendedStep ? (
        <div className="bg-gradient-to-r from-indigo-50/50 via-slate-50 to-indigo-50/20 dark:from-indigo-950/20 dark:via-slate-900/10 dark:to-indigo-950/5 border border-indigo-100 dark:border-indigo-900/30 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/[0.03] dark:bg-indigo-500/[0.02] rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-2.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-[8.5px] font-black uppercase px-2 py-0.5 rounded bg-indigo-600 text-white tracking-widest leading-none">
                Next Step
              </span>
              <span className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">
                Category: {nextRecommendedStep.group}
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-[#0A1F44] dark:text-white leading-snug">
              {nextRecommendedStep.title}
            </h3>
            <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed font-medium">
              {nextRecommendedStep.description}
            </p>
            <div className="text-[11px] text-indigo-700 dark:text-indigo-400 font-bold flex items-start gap-1">
              <span className="text-xs mt-0.5">💡</span>
              <div>
                <span className="underline">Required criteria:</span> {nextRecommendedStep.completionCriteria}
              </div>
            </div>
          </div>

          <div className="shrink-0 w-full md:w-auto">
            <Link
              href={`/projects/${project.id}/${nextRecommendedStep.relatedRoute}`}
              className="w-full md:w-auto inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow hover:shadow-md transition duration-150 gap-2 cursor-pointer"
            >
              {nextRecommendedStep.nextActionLabel}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-500/[0.04] dark:bg-emerald-500/[0.02] border border-emerald-250 dark:border-emerald-500/20 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left space-y-1">
            <h3 className="text-lg font-black text-emerald-800 dark:text-emerald-450 flex items-center gap-2 justify-center md:justify-start">
              <span>✓ All Milestones Completed</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              The project's fiber architecture, connectivity, switches, power systems, and testing records are fully set up.
            </p>
          </div>
          <Link
            href={`/projects/${project.id}/reports`}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition"
          >
            Generate Closeout Package
          </Link>
        </div>
      )}

      {/* 4. Workflow Stepper & Selected Step Details Section */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-[#0A1F44] dark:text-indigo-400 uppercase tracking-widest px-1">
          Project Engineering Stepper
        </h3>

        {/* Stepper buttons container */}
        <div className="bg-slate-50 dark:bg-slate-900/30 p-2 rounded-2xl border border-slate-100 dark:border-slate-850/30 flex flex-wrap gap-1.5 justify-between">
          {groups.map((group, index) => {
            const isActive = activeGroup === group
            const statusSummary = getGroupStatusSummary(group)
            const warningCount = getGroupWarningCount(group)

            return (
              <button
                key={group}
                onClick={() => setActiveGroup(group)}
                className={`flex-1 min-w-[120px] px-3.5 py-3 rounded-xl flex items-center gap-2.5 transition cursor-pointer select-none text-left ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-650 dark:text-indigo-400 font-extrabold'
                    : 'text-slate-500 dark:text-slate-450 hover:bg-white/40 dark:hover:bg-slate-800/30 hover:text-slate-800 dark:hover:text-slate-200 font-semibold'
                }`}
              >
                {/* Step Index & Status Dot */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono opacity-60">0{index + 1}</span>
                  <span className={`w-2 h-2 rounded-full ${getStatusDotColor(statusSummary)}`} />
                </div>

                {/* Label */}
                <span className="text-xs truncate tracking-tight">{group}</span>

                {/* Alert Count Bubble */}
                {warningCount > 0 && (
                  <span className="ml-auto bg-amber-500 text-white font-black text-[9px] leading-none px-1.5 py-0.75 rounded-full shrink-0">
                    {warningCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* 5. Selected Step Details Panel (Progressive Disclosure) */}
        <div className="bg-white dark:bg-slate-900/20 border border-slate-100 dark:border-slate-850/20 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-850/60 pb-3 flex justify-between items-center">
            <div>
              <h4 className="text-sm font-black text-[#0A1F44] dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span>{activeGroup} Stage Details</span>
              </h4>
              <p className="text-[11px] text-slate-450 dark:text-slate-500 font-medium mt-0.5">
                {WORKFLOW_GROUPS.find((g: { name: string }) => g.name === activeGroup)?.description}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {steps
              .filter(s => s.group === activeGroup)
              .map(step => {
                const isAvailable = step.phaseAvailability === 'Active' || step.phaseAvailability === 'Partial'

                const getStatusBadgeStyle = (statusStr: string) => {
                  if (statusStr === 'Complete') return 'bg-emerald-50 dark:bg-emerald-950/25 text-emerald-650 dark:text-emerald-450 border border-emerald-150/40 dark:border-emerald-900/20'
                  if (statusStr === 'In Progress') return 'bg-blue-50 dark:bg-blue-950/25 text-blue-650 dark:text-blue-400 border border-blue-150/40 dark:border-blue-900/20'
                  if (statusStr === 'Needs Attention') return 'bg-amber-55/60 dark:bg-amber-950/25 text-amber-650 dark:text-amber-400 border border-amber-150/40 dark:border-amber-900/20'
                  if (statusStr === 'Planned') return 'bg-purple-50 dark:bg-purple-950/25 text-purple-650 dark:text-purple-400 border border-purple-150/40 dark:border-purple-900/20'
                  return 'bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800'
                }

                return (
                  <div
                    key={step.id}
                    className={`p-4 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850/40 rounded-2xl flex flex-col justify-between min-h-[145px] transition ${
                      isAvailable ? 'hover:border-slate-200 dark:hover:border-slate-800' : 'opacity-50'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[8.5px] uppercase font-black px-2 py-0.5 rounded-full tracking-wider ${getStatusBadgeStyle(step.status)}`}>
                          {step.status}
                        </span>
                        <span className="text-[8.5px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
                          {step.phaseAvailability}
                        </span>
                      </div>
                      <h5 className="font-bold text-xs text-slate-800 dark:text-white tracking-wide truncate">{step.title}</h5>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-normal line-clamp-2">
                        {step.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-850/40 mt-3 space-y-2">
                      {step.message && (
                        <p className="text-[9.5px] text-indigo-650 dark:text-indigo-400 italic font-bold leading-tight">
                          💡 {step.message}
                        </p>
                      )}
                      {isAvailable && (
                        <Link
                          href={`/projects/${project.id}/${step.relatedRoute}`}
                          className="w-full inline-flex items-center justify-center text-center py-1.5 bg-white dark:bg-slate-950 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-900 rounded-xl font-bold text-[10px] tracking-wide transition"
                        >
                          {step.nextActionLabel}
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* 6. Critical Warnings Panel (Subtle card, no nested boxes) */}
      {criticalIssues.length > 0 && (
        <div className="bg-amber-500/[0.02] border border-amber-250/60 dark:border-amber-500/20 rounded-3xl p-6 shadow-sm space-y-3">
          <h3 className="text-xs font-black text-amber-600 dark:text-amber-500 uppercase tracking-wider flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2500/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Critical Preconditions Checklist ({criticalIssues.length})
          </h3>
          
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 pt-1.5">
            {criticalIssues.slice(0, 5).map((issue, idx) => (
              <li key={idx} className="flex gap-2 items-start text-xs font-medium text-slate-600 dark:text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0 animate-pulse" />
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 7. Boundary Specifications Block */}
      <div className="border-t border-slate-100 dark:border-slate-850/60 pt-6">
        <div className="bg-white dark:bg-slate-900/20 border border-slate-100 dark:border-slate-850/20 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850/60 pb-3">
            <div>
              <h3 className="text-xs font-black text-[#0A1F44] dark:text-indigo-400 uppercase tracking-widest">
                Project Boundary Specifications
              </h3>
              <p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold mt-0.5">
                Target coordinates, default zoom levels, and notes reference details
              </p>
            </div>
            <OverviewEditPanel
              project={{
                id: project.id,
                name: project.name,
                description: project.description ?? null,
                default_latitude: Number(project.default_latitude),
                default_longitude: Number(project.default_longitude),
                default_zoom: project.default_zoom,
              }}
              googleMapsApiKey={googleMapsApiKey}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-medium">
            <div className="space-y-1">
              <span className="text-slate-450 dark:text-slate-500 block font-bold uppercase tracking-wider text-[9px]">Project Name</span>
              <span className="text-sm font-bold text-slate-800 dark:text-white leading-tight block">{project.name}</span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-450 dark:text-slate-500 block font-bold uppercase tracking-wider text-[9px]">Center Coordinate</span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono block">
                {stats.projectHasCoords
                  ? `${Number(project.default_latitude).toFixed(6)}, ${Number(project.default_longitude).toFixed(6)}`
                  : 'Not Configured'}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-450 dark:text-slate-500 block font-bold uppercase tracking-wider text-[9px]">Zoom Level</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">{project.default_zoom ?? 16}x</span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-450 dark:text-slate-500 block font-bold uppercase tracking-wider text-[9px]">System Status</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 dark:bg-emerald-950/20 text-emerald-650 dark:text-emerald-450 border border-emerald-150/40 dark:border-emerald-900/20 uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active Workspace
              </span>
            </div>
          </div>

          {project.description && (
            <div className="bg-slate-50/50 dark:bg-slate-950/30 p-3.5 border border-slate-100 dark:border-slate-850/40 rounded-2xl">
              <span className="text-slate-450 dark:text-slate-500 block font-bold uppercase tracking-wider text-[9px] mb-1">
                Workspace Description
              </span>
              <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed font-semibold italic">
                {project.description}
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
