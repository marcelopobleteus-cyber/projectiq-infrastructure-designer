'use client'

import React from 'react'

interface MissingLocationEnclosuresSectionProps {
  fiberEnclosures: any[]
  fiberNodes: any[]
  setSelectedEnclosure: (enclosure: any) => void
}

export default function MissingLocationEnclosuresSection({
  fiberEnclosures,
  fiberNodes,
  setSelectedEnclosure
}: MissingLocationEnclosuresSectionProps) {
  const missing = fiberEnclosures.filter(e => {
    const hasDirect = e.latitude !== null && e.longitude !== null
    const hostNode = fiberNodes.find(n => n.id === e.node_id)
    const hasHost = hostNode && hostNode.latitude !== null && hostNode.longitude !== null
    return !hasDirect && !hasHost
  })

  if (missing.length === 0) {
    return <div className="text-[10px] text-[var(--text-tertiary)] italic">None cataloged. All enclosures have mapped coordinates.</div>
  }

  return (
    <div className="space-y-1.5 max-h-24 overflow-y-auto scrollbar-thin pr-1">
      {missing.map(e => (
        <div 
          key={e.id} 
          onClick={() => setSelectedEnclosure(e)}
          className="bg-red-950/10 hover:bg-red-950/20 px-2 py-1.5 rounded-lg border border-red-900/25 text-[10px] flex justify-between items-center cursor-pointer transition-colors"
        >
          <span className="text-red-400 font-semibold">{e.enclosure_tag}</span>
          <span className="text-[8.5px] text-[var(--text-tertiary)] italic">No coordinates</span>
        </div>
      ))}
    </div>
  )
}
