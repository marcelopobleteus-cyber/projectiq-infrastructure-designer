import React from 'react'
import MobileAppShell from '@/components/mobile/MobileAppShell'

interface MobileOverviewProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function MobileOverviewStubPage({ params }: MobileOverviewProps) {
  const { projectId } = await params

  return (
    <MobileAppShell
      title="Project Overview"
      subtitle={`ID: ${projectId}`}
      projectId={projectId}
    >
      <div className="space-y-4 font-sans">
        <div className="bg-[var(--surface-1)] border border-[var(--border)] p-6 rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white/20 border border-[var(--accent)]/30 text-[var(--accent-text)] font-bold text-xl flex items-center justify-center mx-auto">
            🏠
          </div>
          <h2 className="text-base font-black text-[var(--text-primary)] uppercase tracking-wider">
            Mobile Overview Stub
          </h2>
          <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
            Vista móvil de resumen del proyecto (<code className="text-[var(--accent-text)] font-mono">{projectId}</code>). El panel adaptado se construirá en la siguiente fase.
          </p>
        </div>
      </div>
    </MobileAppShell>
  )
}
