import { addProject, createProjectFailure, createProjectStart, createProjectSuccess } from '@/redux/slices/projects'
import { useAppDispatch, useAppSelector } from '@/redux/store'
import { toast } from '@/components/ui/toast'
import { useMutation } from 'convex/react'
import { useRouter } from 'next/navigation'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'

const generateGradientThumbnail = () => {
  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  ]

  const randomGradient = gradients[Math.floor(Math.random() * gradients.length)]
  const svgContent = `
    <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${randomGradient.match(/#[a-fA-F0-9]{6}/g)?.[0] || '#667eea'}" />
          <stop offset="100%" style="stop-color:${randomGradient.match(/#[a-fA-F0-9]{6}/g)?.[1] || '#764ba2'}" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)" />
      <circle cx="150" cy="100" r="30" fill="white" opacity="0.8" />
      <path d="M140 90 L160 90 L160 110 L140 110 Z" fill="white" opacity="0.6" />
    </svg>
  `

  return `data:image/svg+xml;base64,${btoa(svgContent)}`
}

export const useProjectCreation = () => {
  const dispatch = useAppDispatch()
  const router = useRouter()
  // NOTE: same bug as before — `state.profile` is `{ user: Profile | null }`,
  // so the id/name are under `.user`, not directly on this object.
  const profile = useAppSelector((state) => state.profile)
  const projectsState = useAppSelector((state) => state.projects)
  // The real `shapes` slice (src/redux/slices/shapes/index.ts) was
  // already on disk but wasn't registered in the store yet — added it
  // to src/redux/slices/index.ts so this selector actually works.
  const shapesState = useAppSelector((state) => state.shapes)
  const createProjectMutation = useMutation(api.projects.createProject)

  // TODO: `name` wasn't defined anywhere in your screenshot either —
  // added it as an optional param here so callers can pass a custom
  // name later; CreateProject currently just calls createProject() with
  // none, which falls back to the mutation's auto "Untitled Project N".
  const createProject = async (name?: string) => {
    if (!profile.user?.id) {
      toast.add({ title: 'Please sign in to create projects', type: 'error' })
      return
    }
    dispatch(createProjectStart())
    try {
      const thumbnail = generateGradientThumbnail()

      // NOTE: your screenshot used `fetchMutation` (from convex/nextjs),
      // which is meant for server-side code (Server Components/Actions) —
      // it can't reliably run inside a 'use client' hook like this one, and
      // has no way to read your auth cookie from the browser. Using the
      // client-side `useMutation` (from convex/react) instead, which is
      // what CreateProject was already set up with.
      const result = await createProjectMutation({
        userId: profile.user.id as Id<'users'>,
        name: name || undefined,
        sketchesData: {
          shapes: shapesState.shapes,
          tool: shapesState.tool,
          selected: shapesState.selected,
          frameCounter: shapesState.frameCounter,
        },
        thumbnail,
      })

      // NOTE: your screenshot used `result.projectId` here, but our
      // convex/projects.ts createProject mutation returns `_id` (not
      // `projectId`) — using `result._id` to match what it actually
      // returns, same as the router.push below already did.
      dispatch(
        addProject({
          _id: result._id,
          name: result.name,
          projectNumber: result.projectNumber,
          thumbnail,
          lastModified: Date.now(),
          createdAt: Date.now(),
          isPublic: false,
        })
      )
      dispatch(createProjectSuccess())
      // NOTE: your screenshot used `toast.success(...)`/`toast.error(...)`
      // (sonner-style shorthand) — this project's toast lib is
      // @base-ui/react/toast, exported as `toast` from
      // @/components/ui/toast, whose API is `.add({ title, type })`, not
      // `.success()/.error()`. Using that instead, like the sign-in check
      // above already does.
      toast.add({ title: 'Project created successfully!', type: 'success' })
      router.push(
        `/dashboard/${profile.user.name}/canvas?project=${result._id}`
      )
    } catch (error) {
      dispatch(createProjectFailure('Failed to create project'))
      toast.add({ title: 'Failed to create project', type: 'error' })
    }
  }


  return {
    createProject,
    isCreating: projectsState.isCreating,
    projects: projectsState.projects,
    projectsTotal: projectsState.total,
    canCreate: !!profile.user?.id,
  }
}
