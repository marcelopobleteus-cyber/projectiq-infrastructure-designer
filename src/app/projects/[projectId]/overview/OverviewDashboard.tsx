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
  const [activeGroup, setActiveGroup] = useState<WorkflowGroup>('Setup')

  const groups: WorkflowGroup[] = ['Setup', 'Assets', 'Connectivity', 'Infrastructure', 'Execution', 'Validation', 'Delivery']

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

  return (
    <div className="space-y-6 w-full px-6 py-6 font-sans text-[var(--text-primary)] max-w-7xl mx-auto">
      
      {/* 1. Top Hero / Workspace Header */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight leading-none">
              {project.name}
            </h1>
            <span className="text-[9.5px] font-bold uppercase px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--accent-border)] tracking-wider font-mono">
              Engineering Workspace
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] font-medium">
            CCTV + Fiber Infrastructure Design Suite
          </p>
          <div className="text-xs text-[var(--text-tertiary)] font-medium pt-0.5">
            {nextRecommendedStep ? (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                Next recommended step: <strong className="text-[var(--accent-text)]">{nextRecommendedStep.title}</strong>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[var(--success)] font-bold">
                <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
                All engineering milestones completed!
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 shrink-0">
          {/* Progress Indicator */}
          <div className="flex flex-col gap-1.5 w-full sm:w-56">
            <div className="flex justify-between items-end text-xs font-bold">
              <span className="text-[var(--text-tertiary)] uppercase tracking-wider text-[9px]">Project Readiness</span>
              <span className="text-[var(--accent-text)] font-mono text-sm leading-none">{progressPercent}%</span>
            </div>
            <div className="w-full bg-[var(--surface-2)] rounded-full h-2 overflow-hidden border border-[var(--border)]">
              <div
                className="bg-[var(--accent)] h-2 rounded-full transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-[var(--text-tertiary)] font-mono font-medium">
              {completedActiveSteps} of {activeSteps} active phases done
            </span>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {nextRecommendedStep && (
              <Link
                href={`/projects/${project.id}/${nextRecommendedStep.relatedRoute}`}
                className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center gap-1.5"
              >
                Continue Workflow
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
              </Link>
            )}
            <Link
              href={`/projects/${project.id}/maps`}
              className="px-4 py-2 bg-[var(--surface-1)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border)] font-semibold text-xs rounded-lg transition"
            >
              Open Map Workspace
            </Link>
          </div>
        </div>
      </div>

      {/* Portfolio linkage */}
      <PortfolioSection projectId={project.id} portfolio={portfolio} />

      {/* 2. Key Metrics Row (Stat Cards Spec: upper label, mono big number, surface-1 background) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Metric 1: Cameras */}
        <div className="bg-[var(--surface-1)] border border-[var(--border)] p-4 rounded-xl shadow-xs flex flex-col justify-between min-h-[105px]">
          <span className="text-[9.5px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">CCTV Cameras</span>
          <div>
            <span className="text-2xl font-black text-[var(--text-primary)] font-mono leading-none block">
              {stats.camerasCount}
            </span>
            <div className="flex items-center gap-1 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${stats.camerasCount > 0 ? 'bg-[var(--success)]' : 'bg-[var(--warn)]'}`} />
              <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                {stats.camerasCount > 0 ? `${stats.camerasCount} Registered` : 'No cameras'}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Connectivity */}
        <div className="bg-[var(--surface-1)] border border-[var(--border)] p-4 rounded-xl shadow-xs flex flex-col justify-between min-h-[105px]">
          <span className="text-[9.5px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Connectivity</span>
          <div>
            <span className="text-2xl font-black text-[var(--text-primary)] font-mono leading-none block">
              {stats.camerasCount > 0 ? Math.round((stats.camerasWithConnectivityCount / stats.camerasCount) * 100) : 0}%
            </span>
            <div className="flex items-center gap-1 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${stats.camerasCount > 0 && stats.camerasWithConnectivityCount === stats.camerasCount ? 'bg-[var(--success)]' : 'bg-[var(--warn)]'}`} />
              <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                {stats.camerasWithConnectivityCount} of {stats.camerasCount} set
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Fiber Routes */}
        <div className="bg-[var(--surface-1)] border border-[var(--border)] p-4 rounded-xl shadow-xs flex flex-col justify-between min-h-[105px]">
          <span className="text-[9.5px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Fiber Routes</span>
          <div>
            <span className="text-2xl font-black text-[var(--text-primary)] font-mono leading-none block">
              {stats.routesCount}
            </span>
            <div className="flex items-center gap-1 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${stats.routesCount > 0 ? 'bg-[var(--success)]' : 'bg-[var(--pending)]'}`} />
              <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                {stats.routesCount} Runs designed
              </span>
            </div>
          </div>
        </div>

        {/* Metric 4: Network & Power */}
        <div className="bg-[var(--surface-1)] border border-[var(--border)] p-4 rounded-xl shadow-xs flex flex-col justify-between min-h-[105px]">
          <span className="text-[9.5px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Net / Power</span>
          <div>
            <span className="text-2xl font-black text-[var(--text-primary)] font-mono leading-none block">
              {stats.networkDevicesCount}
            </span>
            <div className="flex items-center gap-1 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${stats.networkDevicesCount > 0 ? 'bg-[var(--success)]' : 'bg-[var(--pending)]'}`} />
              <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                {stats.switchesCount} Switches mapped
              </span>
            </div>
          </div>
        </div>

        {/* Metric 5: Field Work */}
        <div className="bg-[var(--surface-1)] border border-[var(--border)] p-4 rounded-xl shadow-xs flex flex-col justify-between min-h-[105px]">
          <span className="text-[9.5px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Field Work</span>
          <div>
            <span className="text-2xl font-black text-[var(--text-primary)] font-mono leading-none block">
              {stats.fieldTasksCount}
            </span>
            <div className="flex items-center gap-1 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${stats.fieldTasksCount > 0 ? 'bg-[var(--success)]' : 'bg-[var(--pending)]'}`} />
              <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                {stats.fieldTasksCount - stats.openIssuesCount} of {stats.fieldTasksCount} done
              </span>
            </div>
          </div>
        </div>

        {/* Metric 6: Delivery (BOM) */}
        <div className="bg-[var(--surface-1)] border border-[var(--border)] p-4 rounded-xl shadow-xs flex flex-col justify-between min-h-[105px]">
          <span className="text-[9.5px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">BOM Delivery</span>
          <div>
            <span className="text-base font-extrabold text-[var(--text-primary)] leading-none block truncate mt-1">
              {stats.hasBOMItems ? 'BOM Ready' : 'BOM Empty'}
            </span>
            <div className="flex items-center gap-1 mt-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${stats.hasBOMItems ? 'bg-[var(--success)]' : 'bg-[var(--pending)]'}`} />
              <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                {stats.hasBOMItems ? 'Parts pricing' : 'No parts listed'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Recommended Action Callout CTA Panel (Spec: --accent-soft bg, --accent-border border, full width orange button) */}
      {nextRecommendedStep ? (
        <div className="bg-[var(--accent-soft)] border border-[var(--accent-border)] rounded-xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-[var(--accent)] text-white tracking-wider">
                Recommended Step
              </span>
              <span className="text-[10px] text-[var(--accent-text)] font-bold uppercase tracking-wider">
                Phase: {nextRecommendedStep.group}
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-[var(--text-primary)] leading-snug">
              {nextRecommendedStep.title}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
              {nextRecommendedStep.description}
            </p>
          </div>

          <div className="shrink-0 w-full md:w-auto">
            <Link
              href={`/projects/${project.id}/${nextRecommendedStep.relatedRoute}`}
              className="w-full md:w-auto inline-flex items-center justify-center px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-xs rounded-lg shadow-xs transition gap-1.5"
            >
              {nextRecommendedStep.nextActionLabel}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-[var(--success-soft)] border border-emerald-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-[var(--success)] flex items-center gap-2">
              <span>✓ All Milestones Completed</span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)] font-medium">
              The project's fiber architecture, switches, power systems, and testing records are fully set up.
            </p>
          </div>
          <Link
            href={`/projects/${project.id}/reports`}
            className="px-5 py-2 bg-[var(--success)] hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition"
          >
            Generate Closeout Package
          </Link>
        </div>
      )}

      {/* 4. Workflow Stepper Section (Spec: numbered circles, current step solid orange, completed green checkmark, pending gray outline) */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider px-1">
          Project Engineering Stepper
        </h3>

        <div className="bg-[var(--surface-1)] p-2 rounded-xl border border-[var(--border)] flex flex-wrap gap-1.5 justify-between shadow-xs">
          {groups.map((group, index) => {
            const isActive = activeGroup === group
            const statusSummary = getGroupStatusSummary(group)
            const warningCount = getGroupWarningCount(group)
            const isComplete = statusSummary === 'Complete'

            return (
              <button
                key={group}
                onClick={() => setActiveGroup(group)}
                className={`flex-1 min-w-[110px] px-3 py-2.5 rounded-lg flex items-center gap-2 transition cursor-pointer select-none text-left ${
                  isActive
                    ? 'bg-[var(--surface-2)] text-[var(--text-primary)] font-bold border border-[var(--accent-border)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] font-medium'
                }`}
              >
                {/* Stepper Circle Spec: Current = solid orange, Completed = solid green checkmark, Pending = gray outline */}
                <div className="flex items-center justify-center shrink-0">
                  {isComplete ? (
                    <div className="w-5 h-5 rounded-full bg-[var(--success)] text-white flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </div>
                  ) : isActive ? (
                    <div className="w-5 h-5 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-[10px] font-mono font-bold">
                      {index + 1}
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-[var(--border-strong)] text-[var(--text-tertiary)] flex items-center justify-center text-[10px] font-mono">
                      {index + 1}
                    </div>
                  )}
                </div>

                {/* Label */}
                <span className="text-xs truncate tracking-tight">{group}</span>

                {/* Alert Count Bubble (Uses --warn amber) */}
                {warningCount > 0 && (
                  <span className="ml-auto bg-[var(--warn)] text-white font-black text-[9px] leading-none px-1.5 py-0.5 rounded-full shrink-0">
                    {warningCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Selected Step Details Panel */}
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5 shadow-xs space-y-4">
          <div className="border-b border-[var(--border)] pb-3 flex justify-between items-center">
            <div>
              <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                {activeGroup} Stage Details
              </h4>
              <p className="text-[11px] text-[var(--text-secondary)] font-medium mt-0.5">
                {WORKFLOW_GROUPS.find((g: { name: string }) => g.name === activeGroup)?.description}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {steps
              .filter(s => s.group === activeGroup)
              .map(step => {
                const isAvailable = step.phaseAvailability === 'Active' || step.phaseAvailability === 'Partial'

                return (
                  <div
                    key={step.id}
                    className={`p-3.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg flex flex-col justify-between min-h-[135px] transition ${
                      isAvailable ? 'hover:border-[var(--border-strong)]' : 'opacity-50'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wider ${
                          step.status === 'Complete'
                            ? 'bg-[var(--success-soft)] text-[var(--success)] border border-emerald-200'
                            : step.status === 'Needs Attention'
                            ? 'bg-[var(--warn-soft)] text-[var(--warn)] border border-amber-200'
                            : 'bg-[var(--surface-1)] text-[var(--text-secondary)] border border-[var(--border)]'
                        }`}>
                          {step.status}
                        </span>
                        <span className="text-[9px] font-mono text-[var(--text-tertiary)]">
                          {step.phaseAvailability}
                        </span>
                      </div>
                      <h5 className="font-bold text-xs text-[var(--text-primary)] tracking-wide truncate">{step.title}</h5>
                      <p className="text-[11px] text-[var(--text-secondary)] leading-normal line-clamp-2">
                        {step.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[var(--border)] mt-2 space-y-1.5">
                      {isAvailable && (
                        <Link
                          href={`/projects/${project.id}/${step.relatedRoute}`}
                          className="w-full inline-flex items-center justify-center text-center py-1.5 bg-[var(--surface-1)] hover:bg-[var(--accent)] hover:text-white text-[var(--text-primary)] border border-[var(--border)] rounded-md font-bold text-[10.5px] transition cursor-pointer"
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

      {/* 5. Critical Warnings Panel (Uses --warn amber soft) */}
      {criticalIssues.length > 0 && (
        <div className="bg-[var(--warn-soft)] border border-amber-200 rounded-xl p-5 shadow-xs space-y-2.5">
          <h3 className="text-xs font-bold text-[var(--warn)] uppercase tracking-wider flex items-center gap-2">
            <span>⚠️</span> Critical Preconditions Checklist ({criticalIssues.length})
          </h3>
          
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 pt-1">
            {criticalIssues.slice(0, 5).map((issue, idx) => (
              <li key={idx} className="flex gap-2 items-start text-xs font-medium text-[var(--text-primary)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--warn)] mt-1.5 shrink-0" />
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 6. Boundary Specifications Block */}
      <div className="border-t border-[var(--border)] pt-5">
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
            <div>
              <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Project Boundary Specifications
              </h3>
              <p className="text-[10px] text-[var(--text-tertiary)] font-medium mt-0.5">
                Target coordinates, default zoom levels, and site parameters
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
            <div className="space-y-0.5">
              <span className="text-[9.5px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">Project Name</span>
              <span className="text-xs font-bold text-[var(--text-primary)] block">{project.name}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9.5px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">Center Coordinate</span>
              <span className="text-xs font-semibold text-[var(--text-primary)] font-mono block">
                {stats.projectHasCoords
                  ? `${Number(project.default_latitude).toFixed(6)}, ${Number(project.default_longitude).toFixed(6)}`
                  : 'Not Configured'}
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9.5px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">Zoom Level</span>
              <span className="text-xs font-bold text-[var(--text-primary)] font-mono block">{project.default_zoom ?? 16}x</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9.5px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">System Status</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[var(--success-soft)] text-[var(--success)] border border-emerald-200 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                Active Workspace
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
