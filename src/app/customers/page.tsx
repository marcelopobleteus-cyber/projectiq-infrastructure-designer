import { redirect } from 'next/navigation'
import { getCachedUser } from '@/utils/supabase/cached'
import { BYPASS_AUTH } from '@/config/auth'
import { getCustomers } from './actions'
import CustomersClient from './CustomersClient'

export default async function CustomersPage() {
  const user = await getCachedUser()
  if (!user && !BYPASS_AUTH) redirect('/login')

  const { customers, canWrite } = await getCustomers()
  return <CustomersClient initialCustomers={customers} canWrite={canWrite} />
}
