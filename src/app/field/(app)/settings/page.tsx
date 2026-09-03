import React from 'react'
import FieldAppShell from '@/components/field/FieldAppShell'

export default function FieldSettingsStubPage() {
  return (
    <FieldAppShell title="Settings" subtitle="Field Mode">
      <div className="space-y-4 font-sans">
        <div className="bg-[var(--surface-1)] border border-[var(--border)] p-6 rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white/20 border border-[var(--accent)]/30 text-[var(--accent-text)] font-bold text-xl flex items-center justify-center mx-auto">
            ⚙️
          </div>
          <h2 className="text-base font-black text-[var(--text-primary)] uppercase tracking-wider">
            Field Settings Stub
          </h2>
          <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
            Profile settings and display preferences.
          </p>
        </div>
      </div>
    </FieldAppShell>
  )
}
