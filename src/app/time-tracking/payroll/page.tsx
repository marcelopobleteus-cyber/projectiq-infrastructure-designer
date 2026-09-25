import { redirect } from 'next/navigation'
import { getCachedUser } from '@/utils/supabase/cached'
import { BYPASS_AUTH } from '@/config/auth'
import PayrollClient from './PayrollClient'

/**
 * El rango puede venir por querystring: el historial de facturas enlaza aqui
 * con el periodo exacto que cobro, para comprobar cada cifra contra las
 * tarjetas. Se lee en el servidor y se pasa como prop en vez de usar
 * useSearchParams, que obligaria a envolver el cliente en un Suspense.
 */
const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const user = await getCachedUser()
  if (!user && !BYPASS_AUTH) redirect('/login')

  const { from, to } = await searchParams

  return (
    <PayrollClient
      initialFrom={isDay(from) ? from : undefined}
      initialTo={isDay(to) ? to : undefined}
    />
  )
}
