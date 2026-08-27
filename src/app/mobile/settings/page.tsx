import React from 'react'
import MobileAppShell from '@/components/mobile/MobileAppShell'

export default function MobileSettingsStubPage() {
  return (
    <MobileAppShell title="Configuración" subtitle="Modo Terreno">
      <div className="space-y-4 font-sans">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-bold text-xl flex items-center justify-center mx-auto">
            ⚙️
          </div>
          <h2 className="text-base font-black text-white uppercase tracking-wider">
            Mobile Settings Stub
          </h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            Ajustes del perfil y preferencias de visualización.
          </p>
        </div>
      </div>
    </MobileAppShell>
  )
}
