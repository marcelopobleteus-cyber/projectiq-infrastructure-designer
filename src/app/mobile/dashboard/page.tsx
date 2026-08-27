import React from 'react'
import MobileAppShell from '@/components/mobile/MobileAppShell'

export default function MobileDashboardStubPage() {
  return (
    <MobileAppShell title="Dashboard General" subtitle="Modo Terreno">
      <div className="space-y-4 font-sans">
        <div className="bg-[var(--surface-1)] border border-[var(--border)] p-6 rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white/20 border border-[var(--accent)]/30 text-[var(--accent-text)] font-bold text-xl flex items-center justify-center mx-auto">
            📊
          </div>
          <h2 className="text-base font-black text-[var(--text-primary)] uppercase tracking-wider">
            Mobile Dashboard Stub
          </h2>
          <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
            Métricas generales de la organización optimizadas para dispositivos móviles.
          </p>
        </div>
      </div>
    </MobileAppShell>
  )
}
