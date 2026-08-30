import React from 'react'

export const metadata = {
  title: 'Platform Admin | ProjectIQ',
  description: 'Global SaaS tenant administration, metrics, user directory, and platform governance.',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full h-full flex flex-col bg-[var(--bg)] text-[var(--text-primary)] font-sans overflow-hidden">
      {children}
    </div>
  )
}
