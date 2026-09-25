import { redirect } from 'next/navigation'
import { getCachedUser } from '@/utils/supabase/cached'
import { BYPASS_AUTH } from '@/config/auth'
import InvoicesClient from './InvoicesClient'

export default async function LaborInvoicesPage() {
  const user = await getCachedUser()
  if (!user && !BYPASS_AUTH) redirect('/login')

  return <InvoicesClient />
}
