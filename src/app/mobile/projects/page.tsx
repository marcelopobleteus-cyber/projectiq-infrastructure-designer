import React from 'react'
import MobileAppShell from '@/components/mobile/MobileAppShell'

export default function MobileProjectsStubPage() {
  return (
    <MobileAppShell title="Lista de Proyectos" subtitle="Modo Terreno">
      <div className="space-y-4 font-sans">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-bold text-xl flex items-center justify-center mx-auto">
            📱
          </div>
          <h2 className="text-base font-black text-white uppercase tracking-wider">
            Mobile Projects List Stub
          </h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            Esta es la estructura base de la vista móvil. La lista completa de proyectos optimizada para pantallas táctiles se implementará en la siguiente tarea.
          </p>
        </div>
      </div>
    </MobileAppShell>
  )
}
