import { redirect } from 'next/navigation'
import { getCachedUser } from '@/utils/supabase/cached'
import { BYPASS_AUTH } from '@/config/auth'
import { getGlobalFinancials } from './actions'
import FinancialOverviewClient from './FinancialOverviewClient'

export default async function FinancialOverviewPage() {
  const user = await getCachedUser()
  if (!user && !BYPASS_AUTH) redirect('/login')

  const data = await getGlobalFinancials()
  return <FinancialOverviewClient data={data} />
}
