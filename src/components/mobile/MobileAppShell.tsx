'use client'

import React, { useState } from 'react'
import MobileHeader from './MobileHeader'
import MobileDrawer from './MobileDrawer'
import MobileBottomTabs from './MobileBottomTabs'

interface MobileAppShellProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  projectId?: string
  projectName?: string
}

export default function MobileAppShell({
  children,
  title,
  subtitle,
  projectId,
  projectName,
}: MobileAppShellProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground font-sans pb-16 selection:bg-indigo-500 selection:text-white">
      {/* Top Mobile Header */}
      <MobileHeader
        title={title}
        subtitle={subtitle}
        onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
        isDrawerOpen={isDrawerOpen}
      />

      {/* Main Page Area */}
      <main className="flex-1 w-full flex flex-col p-4 overflow-y-auto">
        {children}
      </main>

      {/* Bottom Quick-Tab Bar */}
      <MobileBottomTabs
        projectId={projectId}
        onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
        isDrawerOpen={isDrawerOpen}
      />

      {/* Slide-over Menu Drawer */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        projectId={projectId}
        projectName={projectName}
      />
    </div>
  )
}
