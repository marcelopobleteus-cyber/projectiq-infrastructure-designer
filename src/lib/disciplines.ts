/**
 * Catalogo compartido de secciones de proyecto ("verticales" del producto) y
 * disciplinas/modulos dentro de cada una.
 *
 * Antes esta lista vivia duplicada en 4 archivos distintos (DISCIPLINE_OPTIONS
 * en /projects/create, CANONICAL_DISCIPLINES en actions.ts, ALL_DISCIPLINES en
 * ProjectSidebar.tsx, DISCIPLINE_LABELS en overview/PortfolioSection.tsx) que
 * habia que mantener sincronizados a mano. Unica fuente de verdad ahora.
 *
 * Las 3 secciones (its / fiber / tower) reflejan como el mercado real
 * organiza este trabajo (NGT Group y otros contratistas ITS/telecom/torres
 * investigados en 2026-09-11 — ver claude/plan-secciones-its-fiber-wireless.md
 * en el proyecto de Claude): CCTV vive DENTRO de ITS/Traffic Signal, nunca
 * como categoria aparte ("TSA" no es un termino estandar de la industria).
 *
 * OJO con el id de la seccion "tower": la disciplina existente 'wireless'
 * (enlaces punto a punto / PTP) ya esta en produccion con ese id guardado en
 * filas reales de `projects.disciplines` — por eso la seccion de Wireless &
 * Tower Construction usa el id 'tower', no 'wireless', para no chocar.
 */

export type ProjectSection = 'its' | 'fiber' | 'tower'

export interface ProjectSectionMeta {
  id: ProjectSection
  title: string
  subtitle: string
  icon: string
}

export const PROJECT_SECTIONS: ProjectSectionMeta[] = [
  {
    id: 'its',
    title: 'ITS & Traffic Signal Systems',
    subtitle: 'CCTV, traffic signal design, vehicle detection and ITS networking',
    icon: '🚦',
  },
  {
    id: 'fiber',
    title: 'Fiber & Outside Plant',
    subtitle: 'Fiber optic routes, conduit, duct bank and structured cabling',
    icon: '🌐',
  },
  {
    id: 'tower',
    title: 'Wireless & Tower Construction',
    subtitle: 'Cell tower builds, equipment upgrades, modifications and maintenance',
    icon: '📡',
  },
]

export const DEFAULT_PROJECT_SECTION: ProjectSection = 'its'

export interface Discipline {
  id: string
  /** A discipline can be offered under more than one section (e.g. Power). */
  sections: ProjectSection[]
  /** Sub-group used only for the Wireless & Tower Construction section today. */
  group?: 'construction' | 'maintenance'
  title: string
  /** Compact label for small pill badges — falls back to `title` if unset. */
  shortTitle?: string
  subtitle: string
  icon: string
  color: string
  ready: boolean
  /** Route slug under /projects/[projectId]/<href> */
  href: string
}

export const DISCIPLINES: Discipline[] = [
  // ── ITS & Traffic Signal Systems ──────────────────────────────────────
  {
    id: 'cctv',
    sections: ['its'],
    title: 'CCTV & Video Surveillance',
    shortTitle: 'CCTV',
    subtitle: '4K PTZ cameras, LPR, VLANs, NVRs and FOV coverage',
    icon: '📹',
    color: 'border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--accent-text)]',
    ready: true,
    href: 'cameras',
  },
  {
    id: 'networking',
    sections: ['its'],
    title: 'Networking & Switches',
    shortTitle: 'Networking',
    subtitle: 'Industrial PoE switches, racks, patch cords & ports',
    icon: '🖧',
    color: 'border-purple-500/50 bg-purple-500/10 text-purple-400',
    ready: true,
    href: 'network',
  },
  {
    id: 'traffic_signal',
    sections: ['its'],
    title: 'Traffic Signal Design',
    shortTitle: 'Traffic Signal',
    subtitle: 'Signal poles, heads, controllers and timing plans',
    icon: '🚥',
    color: 'border-orange-500/50 bg-orange-500/10 text-orange-400',
    ready: false,
    href: 'traffic-signal',
  },
  {
    id: 'lighting',
    sections: ['its'],
    title: 'Public & Private Lighting',
    shortTitle: 'Lighting',
    subtitle: 'Smart lighting, poles, LED luminaires and photocells',
    icon: '💡',
    color: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400',
    ready: false,
    href: 'lighting',
  },

  // ── Fiber & Outside Plant ──────────────────────────────────────────────
  {
    id: 'fiber',
    sections: ['fiber'],
    title: 'Fiber Optic (OSP / ISP)',
    shortTitle: 'Fiber',
    subtitle: 'SMF 24F/48F routes, manholes, splices and FDUs',
    icon: '🌐',
    color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
    ready: true,
    href: 'fiber',
  },
  {
    id: 'conduit',
    sections: ['fiber'],
    title: 'Conduit & Duct Bank',
    shortTitle: 'Conduit',
    subtitle: 'Duct bank, PVC/HDPE pipe and handholes',
    icon: '🏗️',
    color: 'border-amber-500/50 bg-amber-500/10 text-amber-400',
    ready: false,
    href: 'fiber',
  },

  // ── Wireless & Tower Construction ───────────────────────────────────────
  {
    id: 'wireless',
    sections: ['tower'],
    title: 'Wireless Links & PTP',
    shortTitle: 'Wireless PTP',
    subtitle: 'Point-to-point antennas, PtMP, line of sight and Wi-Fi coverage',
    icon: '📡',
    color: 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400',
    ready: true,
    href: 'wireless',
  },
  {
    id: 'tower_base',
    sections: ['tower'],
    group: 'construction',
    title: 'Base & Foundation Construction',
    shortTitle: 'Base Construction',
    subtitle: 'Foundation, grounding ring and compound civil work',
    icon: '🧱',
    color: 'border-stone-500/50 bg-stone-500/10 text-stone-400',
    ready: false,
    href: 'tower/base',
  },
  {
    id: 'tower_build',
    sections: ['tower'],
    group: 'construction',
    title: 'Tower Construction',
    shortTitle: 'Tower Build',
    subtitle: 'New monopole, self-support or guyed tower build',
    icon: '🗼',
    color: 'border-sky-500/50 bg-sky-500/10 text-sky-400',
    ready: false,
    href: 'tower/build',
  },
  {
    id: 'tower_equipment',
    sections: ['tower'],
    group: 'construction',
    title: 'Equipment Upgrade & Installation',
    shortTitle: 'Equipment Upgrade',
    subtitle: 'New carrier co-location, antenna swaps and RRU/RF installs',
    icon: '📶',
    color: 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400',
    ready: false,
    href: 'tower/equipment',
  },
  {
    id: 'tower_modifications',
    sections: ['tower'],
    group: 'construction',
    title: 'Tower Modifications',
    shortTitle: 'Modifications',
    subtitle: 'Structural mods, mount changes and reinforcement',
    icon: '🔧',
    color: 'border-rose-500/50 bg-rose-500/10 text-rose-400',
    ready: false,
    href: 'tower/modifications',
  },
  {
    id: 'tower_maint_equipment',
    sections: ['tower'],
    group: 'maintenance',
    title: 'Tower-Mounted Equipment Maintenance',
    shortTitle: 'Tower Maintenance',
    subtitle: 'Antennas, RRUs, cabling and tower-top hardware upkeep',
    icon: '🛠️',
    color: 'border-teal-500/50 bg-teal-500/10 text-teal-400',
    ready: false,
    href: 'tower/maintenance-equipment',
  },
  {
    id: 'tower_maint_ground',
    sections: ['tower'],
    group: 'maintenance',
    title: 'Ground Equipment Maintenance',
    shortTitle: 'Ground Maintenance',
    subtitle: 'Generators, shelters, HVAC and ground-level compound gear',
    icon: '⚙️',
    color: 'border-lime-500/50 bg-lime-500/10 text-lime-400',
    ready: false,
    href: 'tower/maintenance-ground',
  },
  {
    id: 'power',
    sections: ['its', 'tower'],
    title: 'Power & Substations',
    shortTitle: 'Power',
    subtitle: 'AC services, transformers, UPS and wattage load',
    icon: '⚡',
    color: 'border-red-500/50 bg-red-500/10 text-red-400',
    ready: true,
    href: 'power',
  },
]

export const CANONICAL_DISCIPLINE_IDS = DISCIPLINES.map(d => d.id)

export function disciplinesForSection(section: ProjectSection): Discipline[] {
  return DISCIPLINES.filter(d => d.sections.includes(section))
}

export function getDiscipline(id: string): Discipline | undefined {
  return DISCIPLINES.find(d => d.id === id)
}

export function getSectionMeta(id: string | null | undefined): ProjectSectionMeta {
  return PROJECT_SECTIONS.find(s => s.id === id) || PROJECT_SECTIONS[0]
}

export const DISCIPLINE_LABELS: Record<string, string> = Object.fromEntries(
  DISCIPLINES.map(d => [d.id, d.title])
)

/** Compact labels for small pill badges (e.g. overview portfolio cards). */
export const DISCIPLINE_SHORT_LABELS: Record<string, string> = Object.fromEntries(
  DISCIPLINES.map(d => [d.id, d.shortTitle || d.title])
)
