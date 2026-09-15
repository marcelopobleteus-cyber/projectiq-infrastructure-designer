import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getCachedProject, getCachedUser } from '@/utils/supabase/cached'
import { BYPASS_AUTH } from '@/config/auth'
import { getProjectFinancials } from './actions'
import FinancialClient from './FinancialClient'

interface PageProps {
  params: Promise<{ projectId: string }>
}

export default async function ProjectFinancialPage({ params }: PageProps) {
  const { projectId } = await params

  const user = await getCachedUser()
  if (!user && !BYPASS_AUTH) {
    redirect('/login')
  }

  const project = await getCachedProject(projectId)
  const data = await getProjectFinancials(projectId)

  let customerName: string | null = null
  if (project?.customer_id) {
    const supabase = await createClient()
    const { data: customer } = await supabase
      .from('customers')
      .select('name')
      .eq('id', project.customer_id)
      .maybeSingle()
    customerName = customer?.name ?? null
  }

  return (
    <FinancialClient
      projectId={projectId}
      projectName={project?.name ?? 'Project'}
      jobNumber={project?.job_number ?? null}
      customerName={customerName}
      data={data}
    />
  )
}
