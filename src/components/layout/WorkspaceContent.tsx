'use client'

import React from 'react'

export default function WorkspaceContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-950 h-full w-full">
      {children}
    </div>
  )
}
