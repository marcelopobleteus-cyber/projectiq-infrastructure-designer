/**
 * Simbolo corporativo NextQ.
 *
 * Va en linea y no como <img src="/brand/...svg"> a proposito: el simbolo
 * aparece en la barra lateral, en la barra superior y en el modulo de terreno,
 * o sea en el primer render de casi toda pantalla. Un <img> ahi es una peticion
 * mas que llega despues del HTML y produce un parpadeo en el lugar mas visible
 * de la interfaz. El dibujo son dos paths; pesa menos que la peticion.
 *
 * Los archivos de /public/brand quedan igual, para lo que si necesita URL:
 * favicons, metadatos de Open Graph, PDFs y correos.
 */

type Variant = 'color' | 'reverse' | 'mono'

interface NextQMarkProps {
  /** Lado del cuadrado en px. */
  size?: number
  /**
   * 'color'   — carbon + naranja. Para fondos claros.
   * 'reverse' — hueso + naranja. OBLIGATORIO sobre fondo oscuro: la cara
   *             izquierda es del mismo carbon que el fondo de la barra, asi
   *             que con 'color' esa mitad desaparece y queda medio simbolo.
   * 'mono'    — las dos caras con currentColor, para fondos de color solido
   *             (el azul del modulo de terreno) donde ni una ni otra
   *             version a dos colores tiene contraste suficiente.
   */
  variant?: Variant
  className?: string
}

/** Carbon corporativo. No es negro puro: #000 sobre blanco vibra. */
const CARBON = '#1C1B19'
/** Hueso: la cara clara en la version sobre fondo oscuro. */
const BONE = '#F5F4F1'
/** Naranja corporativo. */
const ORANGE = '#FF6A13'

export default function NextQMark({ size = 24, variant = 'color', className }: NextQMarkProps) {
  const left =
    variant === 'mono' ? 'currentColor' : variant === 'reverse' ? BONE : CARBON
  const right = variant === 'mono' ? 'currentColor' : ORANGE

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="NextQ Technology"
    >
      {/* Cara izquierda */}
      <path d="M60 6 L66.1 9.52 L46.73 106.35 L13.2 87 L13.2 33 Z" fill={left} />
      {/* Cara derecha */}
      <path d="M73.27 13.65 L106.8 33 L106.8 87 L60 114 L53.9 110.48 Z" fill={right} />
    </svg>
  )
}
