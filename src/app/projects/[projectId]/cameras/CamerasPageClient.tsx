'use client'

import React, { useMemo, useState } from 'react'
import ProjectMapCanvas from '../ProjectMapCanvas'

/**
 * CCTV module shell. Same three-step shape Marcelo asked every module to
 * follow: a summary of the module's own equipment, then its GIS map, then the
 * equipment list you click through to edit. Models come from the camera
 * catalog (camera_models), and editing happens in the map's existing camera
 * panel rather than in a second, divergent editor.
 *
 * Per claude/plan-separacion-modulos.md the map is scoped to CCTV: fiber and
 * network overlays start off, so this module shows its own discipline.
 */

interface CamerasPageClientProps {
  projectId: string
  cameras: any[]
  cameraModels: any[]
  networkDevices: any[]
  defaultLatitude: number
  defaultLongitude: number
  defaultZoom: number
}

const STATUS_META: Record<string, { label: string; className: string; dot: string }> = {
  planned: {
    label: 'Planned',
    className: 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)]',
    dot: 'bg-[var(--pending)]',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-[var(--accent-soft)] text-[var(--accent-text)] border-[var(--accent-border)]',
    dot: 'bg-[var(--accent)]',
  },
  complete: {
    label: 'Complete',
    className: 'bg-[var(--success-soft)] text-[var(--success)] border-emerald-200',
    dot: 'bg-[var(--success)]',
  },
  issue: {
    label: 'Issue',
    className: 'bg-red-50 text-[var(--danger)] border-red-200',
    dot: 'bg-[var(--danger)]',
  },
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.planned
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${meta.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

export default function CamerasPageClient({
  projectId,
  cameras,
  cameraModels,
  networkDevices,
  defaultLatitude,
  defaultLongitude,
  defaultZoom,
}: CamerasPageClientProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'equipment'>('overview')
  // Set when a row in the equipment list is clicked, so the map opens with
  // that camera already selected and its editor open.
  const [focusCameraId, setFocusCameraId] = useState<string | null>(null)

  const metrics = useMemo(() => {
    const byStatus = new Map<string, number>()
    const byComm = new Map<string, number>()
    const byPower = new Map<string, number>()
    const byModel = new Map<string, number>()

    for (const cam of cameras) {
      byStatus.set(cam.status, (byStatus.get(cam.status) ?? 0) + 1)
      if (cam.communication_type) byComm.set(cam.communication_type, (byComm.get(cam.communication_type) ?? 0) + 1)
      if (cam.power_type) byPower.set(cam.power_type, (byPower.get(cam.power_type) ?? 0) + 1)
      const model = cameraModels.find(m => m.id === cam.camera_model_id)
      const name = model ? `${model.manufacturer} ${model.model_number}` : 'Unassigned model'
      byModel.set(name, (byModel.get(name) ?? 0) + 1)
    }

    const placed = cameras.filter(c => c.latitude !== null && c.longitude !== null).length

    return { byStatus, byComm, byPower, byModel, placed }
  }, [cameras, cameraModels])

  const openInMap = (cameraId: string) => {
    setFocusCameraId(cameraId)
    setActiveTab('map')
  }

  const tabs: { id: 'overview' | 'map' | 'equipment'; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'map', label: 'Map' },
    { id: 'equipment', label: 'Equipment' },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full w-full font-sans bg-[var(--bg)]">
      <div className="bg-[var(--surface-1)] border-b border-[var(--border)] px-6 py-2 flex items-center justify-between no-print shadow-xs">
        <div className="flex items-center gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer border ${
                activeTab === t.id
                  ? 'bg-[var(--surface-2)] text-[var(--text-primary)] border-[var(--accent-border)]'
                  : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-transparent'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-[var(--text-tertiary)] font-mono">CCTV Workspace Mode</div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'overview' && (
          <Overview cameras={cameras} metrics={metrics} onOpenEquipment={() => setActiveTab('equipment')} />
        )}

        {activeTab === 'map' && (
          <div className="h-full w-full flex">
            <ProjectMapCanvas
              projectId={projectId}
              initialCameras={cameras}
              initialNetworkDevices={networkDevices}
              cameraModels={cameraModels}
              defaultLatitude={defaultLatitude}
              defaultLongitude={defaultLongitude}
              defaultZoom={defaultZoom}
              moduleScope="cctv"
              focusCameraId={focusCameraId}
              onFocusHandled={() => setFocusCameraId(null)}
            />
          </div>
        )}

        {activeTab === 'equipment' && (
          <EquipmentList cameras={cameras} cameraModels={cameraModels} onOpen={openInMap} />
        )}
      </div>
    </div>
  )
}

function Overview({
  cameras,
  metrics,
  onOpenEquipment,
}: {
  cameras: any[]
  metrics: {
    byStatus: Map<string, number>
    byComm: Map<string, number>
    byPower: Map<string, number>
    byModel: Map<string, number>
    placed: number
  }
  onOpenEquipment: () => void
}) {
  const statusOrder = ['planned', 'in_progress', 'complete', 'issue']

  return (
    <div className="h-full overflow-y-auto px-6 py-5 space-y-5">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-[var(--text-primary)]">CCTV & Video Surveillance</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Camera count, rollout status and equipment mix for this project.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Cameras" value={String(cameras.length)} />
        <StatCard label="Placed on Map" value={`${metrics.placed} / ${cameras.length}`} />
        <StatCard label="Complete" value={String(metrics.byStatus.get('complete') ?? 0)} tone="success" />
        <StatCard label="Issues" value={String(metrics.byStatus.get('issue') ?? 0)} tone="danger" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Breakdown
          title="By Status"
          rows={statusOrder
            .filter(s => metrics.byStatus.has(s))
            .map(s => [STATUS_META[s]?.label ?? s, metrics.byStatus.get(s) ?? 0])}
        />
        <Breakdown
          title="By Communication"
          rows={Array.from(metrics.byComm.entries()).sort((a, b) => b[1] - a[1])}
        />
        <Breakdown
          title="By Power"
          rows={Array.from(metrics.byPower.entries()).sort((a, b) => b[1] - a[1])}
        />
      </div>

      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            Equipment Mix (from catalog)
          </span>
          <button
            onClick={onOpenEquipment}
            className="text-[10px] font-bold uppercase tracking-wide text-[var(--accent)] hover:underline cursor-pointer"
          >
            View equipment →
          </button>
        </div>
        {metrics.byModel.size === 0 ? (
          <p className="text-[11px] text-[var(--text-tertiary)]">No cameras yet.</p>
        ) : (
          <div className="space-y-1.5">
            {Array.from(metrics.byModel.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([model, count]) => (
                <div key={model} className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--text-primary)] font-semibold">{model}</span>
                  <span className="font-mono text-[var(--text-secondary)]">{count}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'danger' }) {
  const valueClass =
    tone === 'success' ? 'text-[var(--success)]' : tone === 'danger' ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'
  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-3.5">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{label}</span>
      <span className={`text-2xl font-black ${valueClass}`}>{value}</span>
    </div>
  )
}

function Breakdown({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2.5">
        {title}
      </span>
      {rows.length === 0 ? (
        <p className="text-[11px] text-[var(--text-tertiary)]">No data.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map(([label, count]) => (
            <div key={label} className="flex items-center justify-between text-[11px]">
              <span className="capitalize text-[var(--text-secondary)]">{label}</span>
              <span className="font-mono font-bold text-[var(--text-primary)]">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EquipmentList({
  cameras,
  cameraModels,
  onOpen,
}: {
  cameras: any[]
  cameraModels: any[]
  onOpen: (id: string) => void
}) {
  if (cameras.length === 0) {
    return (
      <div className="h-full flex items-center justify-center px-6">
        <div className="border border-dashed border-[var(--border-strong)] rounded-xl p-12 text-center bg-[var(--surface-1)] max-w-xl space-y-3">
          <h3 className="text-xs font-extrabold text-[var(--text-primary)] uppercase tracking-wider">No Cameras Placed</h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
            Switch to the Map tab to place cameras on the site.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto px-6 py-5">
      <p className="text-[11px] text-[var(--text-secondary)] mb-3">
        Click any camera to open it on the map and edit its configuration.
      </p>
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[var(--surface-2)] text-[var(--text-tertiary)] border-b border-[var(--border)] font-mono text-[10px] uppercase tracking-wider">
              <th className="py-2.5 px-6 font-bold">Camera ID</th>
              <th className="py-2.5 px-4 font-bold">Model</th>
              <th className="py-2.5 px-4 font-bold">Status</th>
              <th className="py-2.5 px-4 font-bold">Comm Type</th>
              <th className="py-2.5 px-4 font-bold">Power Type</th>
              <th className="py-2.5 px-4 font-bold">Coordinates (Lat, Lng)</th>
              <th className="py-2.5 px-4 font-bold">Location Reference</th>
              <th className="py-2.5 px-4 font-bold">Updated Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {cameras.map(cam => {
              const model = cameraModels.find(m => m.id === cam.camera_model_id)
              const modelName = model ? `${model.manufacturer} ${model.model_number}` : 'Unknown'
              const coordinates =
                cam.latitude !== null && cam.longitude !== null
                  ? `${Number(cam.latitude).toFixed(6)}, ${Number(cam.longitude).toFixed(6)}`
                  : '—'
              const locationRef = cam.structure_reference || cam.address_reference || '-'
              const dateStr = cam.updated_at || cam.created_at

              return (
                <tr
                  key={cam.id}
                  onClick={() => onOpen(cam.id)}
                  className="hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                >
                  <td className="py-3 px-6 font-bold text-[var(--accent-text)] font-mono">{cam.camera_id_tag}</td>
                  <td className="py-3 px-4 text-[var(--text-primary)] font-semibold">{modelName}</td>
                  <td className="py-3 px-4"><StatusBadge status={cam.status} /></td>
                  <td className="py-3 px-4 capitalize text-[var(--text-secondary)]">{cam.communication_type}</td>
                  <td className="py-3 px-4 uppercase text-[var(--text-secondary)] font-mono">{cam.power_type}</td>
                  <td className="py-3 px-4 font-mono text-[var(--text-secondary)]">{coordinates}</td>
                  <td className="py-3 px-4 text-[var(--text-secondary)]">{locationRef}</td>
                  <td className="py-3 px-4 font-mono text-[var(--text-tertiary)]">
                    {dateStr ? new Date(dateStr).toLocaleDateString() : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
