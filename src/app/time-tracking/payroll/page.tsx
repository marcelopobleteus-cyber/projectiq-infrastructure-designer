import { redirect } from 'next/navigation'
import { getCachedUser } from '@/utils/supabase/cached'
import { BYPASS_AUTH } from '@/config/auth'
import PayrollClient from './PayrollClient'

export default async function PayrollPage() {
  const user = await getCachedUser()
  if (!user && !BYPASS_AUTH) redirect('/login')

  return <PayrollClient />
}
