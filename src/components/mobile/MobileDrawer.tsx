'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  projectId?: string
  projectName?: string
}

export default function MobileDrawer({
  isOpen,
  onClose,
  projectId,
  projectName = 'Proyecto',
}: MobileDrawerProps) {
  const pathname = usePathname()
  const router = useRouter()

  if (!isOpen) return null

  // Switch to desktop version manual override handler
  const handleSwitchToDesktop = () => {
    try {
      localStorage.setItem('projectiq_prefer_desktop', 'true')
    } catch (e) {}

    // Map current mobile route to desktop equivalent
    let targetDesktopPath = '/projects'
    if (projectId) {
      if (pathname.includes('/cameras')) targetDesktopPath = `/projects/${projectId}/cameras`
      else if (pathname.includes('/tasks')) targetDesktopPath = `/projects/${projectId}/tasks`
      else if (pathname.includes('/overview')) targetDesktopPath = `/projects/${projectId}/overview`
      else if (pathname.includes('/bom')) targetDesktopPath = `/projects/${projectId}/bom`
      else if (pathname.includes('/fiber')) targetDesktopPath = `/projects/${projectId}/fiber`
      else targetDesktopPath = `/projects/${projectId}/overview`
    } else if (pathname.includes('/dashboard')) {
      targetDesktopPath = '/dashboard'
    } else if (pathname.includes('/reports')) {
      targetDesktopPath = '/reports'
    } else if (pathname.includes('/settings')) {
      targetDesktopPath = '/settings'
    }

    onClose()
    router.push(targetDesktopPath)
  }

  const globalNav = [
    { label: 'Dashboard General', href: '/mobile/dashboard', icon: '📊' },
    { label: 'Lista de Proyectos', href: '/mobile/projects', icon: '📁' },
    { label: 'Reportes Ejecutivos', href: '/mobile/reports', icon: '📈' },
    { label: 'Configuración', href: '/mobile/settings', icon: '⚙️' },
  ]

  const projectNav = projectId
    ? [
        { label: 'Overview del Proyecto', href: `/mobile/projects/${projectId}/overview`, icon: '🏠' },
        { label: 'Cámaras (CCTV)', href: `/mobile/projects/${projectId}/cameras`, icon: '📸' },
        { label: 'Fibra Óptica (OSP/ISP)', href: `/mobile/projects/${projectId}/fiber`, icon: '🧬' },
        { label: 'Networking & Switches', href: `/mobile/projects/${projectId}/network`, icon: '🔌' },
        { label: 'Cómputo Métrico (BOM)', href: `/mobile/projects/${projectId}/bom`, icon: '📦' },
        { label: 'Órdenes de Trabajo (Tasks)', href: `/mobile/projects/${projectId}/tasks`, icon: '📋' },
      ]
    : []

  return (
    <div className="fixed inset-0 z-50 flex font-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Sheet Container */}
      <div className="relative w-4/5 max-w-xs bg-slate-900 border-r border-slate-800 flex flex-col h-full z-10 shadow-2xl overflow-hidden">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
          <div>
            <span className="text-xs font-black text-indigo-400 tracking-wider block">NextQ Mobile</span>
            <span className="text-[10px] text-slate-400 font-medium truncate block">
              {projectId ? projectName : 'Navegación Terreno'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
          {/* Active Project Navigation (if inside project) */}
          {projectId && (
            <div className="space-y-1.5">
              <span className="text-[9px] font-extrabold text-indigo-400 uppercase tracking-widest block px-2">
                Módulos del Proyecto
              </span>
              <div className="space-y-1">
                {projectNav.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                        isActive
                          ? 'bg-indigo-600/20 border-indigo-500/30 text-white font-bold'
                          : 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <span className="text-sm">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Global Navigation */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block px-2">
              Navegación General
            </span>
            <div className="space-y-1">
              {globalNav.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                      isActive
                        ? 'bg-indigo-600/20 border-indigo-500/30 text-white font-bold'
                        : 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40'
                    }`}
                  >
                    <span className="text-sm">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Manual Version Override Switcher */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block px-2">
              Modo de Visualización
            </span>
            <button
              type="button"
              onClick={handleSwitchToDesktop}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-bold transition active:scale-98 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              Ver versión de escritorio
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
