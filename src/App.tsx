import { HashRouter, Navigate, NavLink, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { BarChart3, Clapperboard, Eye, GitCompare, LayoutGrid, Menu, X, Monitor, Settings as SettingsIcon, Home as HomeIcon } from 'lucide-react'
import { clsx } from 'clsx'
import { ProjectLayout } from './pages/ProjectLayout'
import { HomePage } from './pages/HomePage'
import { ProjectEditorPage } from './pages/editor/ProjectEditorPage'
import { SimulatorPage } from './pages/SimulatorPage'
import { BlindTestPage } from './pages/BlindTestPage'
import { FindTargetPage } from './pages/FindTargetPage'
import { ABComparePage } from './pages/ABComparePage'
import { ResultsPage } from './pages/ResultsPage'
import { SettingsPage } from './pages/SettingsPage'
import { useToastStore } from './stores/toastStore'
import { useProjectStore } from './stores/projectStore'
import { useSettingsStore } from './stores/settingsStore'
import { useEffect, useState } from 'react'

function ToastHost() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[100] flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={clsx(
            'pointer-events-auto animate-fade-in rounded-lg border px-3.5 py-2 text-[13px] shadow-lg',
            t.kind === 'error' && 'border-red-500/40 bg-[#2a1418] text-red-300',
            t.kind === 'success' && 'border-emerald-500/40 bg-[#12211a] text-emerald-300',
            t.kind === 'info' && 'border-[#2f323c] bg-[#1c1e25] text-zinc-200',
          )}
        >
          {t.text}
        </button>
      ))}
    </div>
  )
}

const PROJECT_NAV = [
  { to: 'editor', label: '项目编辑器', icon: LayoutGrid },
  { to: 'simulator', label: '信息流模拟', icon: Monitor },
  { to: 'blind', label: '盲测', icon: Eye },
  { to: 'find', label: '找目标', icon: BarChart3 },
  { to: 'ab', label: 'A/B 对比', icon: GitCompare },
  { to: 'results', label: '测试结果', icon: BarChart3 },
]

function BrandMark() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
        <Clapperboard size={18} />
      </div>
      <div>
        <div className="text-sm font-bold text-zinc-100">FeedLab</div>
        <div className="text-[10px] text-zinc-500">封面标题信息流盲测</div>
      </div>
    </div>
  )
}

function NavList({ projectId, includeSettings, onNavigate }: { projectId: string | null; includeSettings?: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5 px-2" onClick={onNavigate}>
      <SidebarLink to="/" icon={<HomeIcon size={15} />} label="项目列表" end />
      {projectId ? (
        <>
          <div className="mt-3 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">当前项目</div>
          {PROJECT_NAV.map((item) => (
            <SidebarLink key={item.to} to={`/project/${projectId}/${item.to}`} icon={<item.icon size={15} />} label={item.label} />
          ))}
        </>
      ) : null}
      {includeSettings ? (
        <div className="mt-3 lg:hidden">
          <SidebarLink to="/settings" icon={<SettingsIcon size={15} />} label="设置" />
        </div>
      ) : null}
    </nav>
  )
}

function AppShell() {
  const { pathname } = useLocation()
  const match = /^\/project\/([^/]+)/.exec(pathname)
  const projectId = match?.[1] ?? null
  const [menuOpen, setMenuOpen] = useState(false)

  // 路由变化时收起移动端抽屉
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  return (
    <div className="flex h-full flex-col">
      {/* 移动端顶栏 */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#1e2027] bg-[#0d0f13] px-3 lg:hidden">
        <BrandMark />
        <button
          className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 hover:bg-[#1c1e25] hover:text-zinc-100"
          onClick={() => setMenuOpen(true)}
          aria-label="打开菜单"
        >
          <Menu size={20} />
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-52 shrink-0 flex-col border-r border-[#1e2027] bg-[#0d0f13] lg:flex">
          <div className="px-4 py-4">
            <BrandMark />
          </div>
          <NavList projectId={projectId} />
          <div className="mt-auto px-2 pb-3">
            <SidebarLink to="/settings" icon={<SettingsIcon size={15} />} label="设置" />
          </div>
        </aside>

        {/* 移动端抽屉 */}
        {menuOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
            <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-[#1e2027] bg-[#0d0f13]">
              <div className="flex items-center justify-between px-4 py-4">
                <BrandMark />
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-[#1c1e25] hover:text-zinc-100"
                  onClick={() => setMenuOpen(false)}
                  aria-label="关闭菜单"
                >
                  <X size={16} />
                </button>
              </div>
              <NavList projectId={projectId} includeSettings onNavigate={() => setMenuOpen(false)} />
            </aside>
          </div>
        ) : null}

        <main className="min-w-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
      <ToastHost />
    </div>
  )
}

function SidebarLink({ to, icon, label, end }: { to: string; icon?: React.ReactNode; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors',
          isActive ? 'bg-[#1c1e25] text-zinc-100' : 'text-zinc-500 hover:bg-[#16181e] hover:text-zinc-300',
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}

function SettingsWatcher() {
  const load = useProjectStore((s) => s.loadProject)
  const { projectId } = useParams()
  useEffect(() => {
    if (projectId) void load(projectId)
  }, [projectId, load])
  return null
}

export default function App() {
  useEffect(() => {
    void useSettingsStore.getState().load()
  }, [])
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route
            path="/project/:projectId"
            element={
              <>
                <SettingsWatcher />
                <ProjectLayout />
              </>
            }
          >
            <Route index element={<Navigate to="editor" replace />} />
            <Route path="editor" element={<ProjectEditorPage />} />
            <Route path="simulator" element={<SimulatorPage />} />
            <Route path="blind" element={<BlindTestPage />} />
            <Route path="find" element={<FindTargetPage />} />
            <Route path="ab" element={<ABComparePage />} />
            <Route path="results" element={<ResultsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
