import { Link, Outlet } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useProjectStore } from '../stores/projectStore'
import { useSimulationStore } from '../stores/simulationStore'
import { useEffect } from 'react'
import { EmptyState, Button } from '../components/ui'

export function ProjectLayout() {
  const project = useProjectStore((s) => s.project)
  const loading = useProjectStore((s) => s.loading)
  const error = useProjectStore((s) => s.error)
  const initFromProject = useSimulationStore((s) => s.initFromProject)

  useEffect(() => {
    if (project) initFromProject(project)
  }, [project, initFromProject])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">加载项目中…</div>
    )
  }
  if (error || !project) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={<AlertTriangle size={32} />}
          title={error ?? '项目未加载'}
          action={
            <Link to="/">
              <Button>返回项目列表</Button>
            </Link>
          }
        />
      </div>
    )
  }
  return <Outlet />
}
