import React from 'react'

interface UnderConstructionProps {
  icon: string
  title: string
  subtitle: string
  sectionLabel: string
}

/**
 * Shared stub screen for disciplines that are named/visible in the product
 * (create-project flow, sidebar) but don't have a real work module built yet.
 * Keeps the scope visible to prospective buyers instead of hiding it, per
 * product decision — see claude/plan-secciones-its-fiber-wireless.md.
 */
export default function UnderConstruction({ icon, title, subtitle, sectionLabel }: UnderConstructionProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-10">
      <div className="max-w-lg w-full text-center space-y-5">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-3xl">
          {icon}
        </div>
        <div>
          <span className="inline-block text-[10px] font-black uppercase tracking-widest text-[var(--warn)] bg-[var(--warn-soft)] border border-amber-200 rounded-full px-2.5 py-0.5 mb-2">
            Under Construction
          </span>
          <h2 className="text-lg font-extrabold text-[var(--text-primary)]">{title}</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">{subtitle}</p>
        </div>
        <div className="text-[11px] text-[var(--text-tertiary)] border-t border-[var(--border)] pt-4">
          This module is part of the <span className="font-bold text-[var(--text-secondary)]">{sectionLabel}</span> scope
          and is on the roadmap. The workspace for it hasn&apos;t been built yet — check back soon.
        </div>
      </div>
    </div>
  )
}
