import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { projectId } = await params
  redirect(`/projects/${projectId}/overview`)
}
