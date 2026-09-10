import SharedProjectClient from './SharedProjectClient'

/**
 * Vista publica de un proyecto, protegida por contrasena.
 *
 * No lleva guardia de sesion a proposito: el destinatario es un cliente que
 * NO tiene cuenta. Toda la validacion vive en openSharedProject (token +
 * contrasena + caducidad) y la lectura se hace con service role recien
 * despues de validar.
 */

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function SharedProjectPage({ params }: PageProps) {
  const { token } = await params
  return <SharedProjectClient token={token} />
}
