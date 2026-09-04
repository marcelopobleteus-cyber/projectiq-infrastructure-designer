'use client'

import React, { useState } from 'react'
import FieldHeader from './FieldHeader'
import FieldDrawer from './FieldDrawer'
import FieldBottomTabs from './FieldBottomTabs'

interface FieldAppShellProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  projectId?: string
  projectName?: string
}

export default function FieldAppShell({
  children,
  title,
  subtitle,
  projectId,
  projectName,
}: FieldAppShellProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  return (
    <div className="flex flex-col min-h-screen w-full bg-[var(--bg)] text-[var(--text-primary)] font-sans pb-16 selection:bg-[var(--accent)] selection:text-white">
      {/* Top field header */}
      <FieldHeader
        title={title}
        subtitle={subtitle}
        onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
        isDrawerOpen={isDrawerOpen}
      />

      {/* Main Page Area */}
      <main className="flex-1 w-full flex flex-col p-4 overflow-y-auto">
        <div className="w-full max-w-md mx-auto flex flex-col flex-1">
          {children}
        </div>
      </main>

      {/* Bottom Quick-Tab Bar */}
      <FieldBottomTabs
        projectId={projectId}
        onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
        isDrawerOpen={isDrawerOpen}
      />

      {/* Slide-over Menu Drawer */}
      <FieldDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        projectId={projectId}
        projectName={projectName}
      />
    </div>
  )
}
