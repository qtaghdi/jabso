'use server'

import { redirect } from 'next/navigation'
import { requireOwner } from '@/lib/auth'
import { createProject, setActiveProject } from '@/lib/projects'

export const createProjectAction = async (formData: FormData) => {
  await requireOwner()
  const name = String(formData.get('name') ?? '').trim()
  if (!name || name.length > 80) redirect('/projects?error=invalid-name')
  const project = await createProject(name)
  await setActiveProject(project.dsnProjectId)
  redirect('/')
}

export const selectProjectAction = async (formData: FormData) => {
  await requireOwner()
  const dsnProjectId = String(formData.get('project-id') ?? '')
  await setActiveProject(dsnProjectId)
  redirect('/')
}
