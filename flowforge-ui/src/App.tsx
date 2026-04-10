import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

// Layout
import AppLayout from './components/layout/AppLayout'

// Public pages
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'

// Protected pages
import Dashboard from './pages/Dashboard'
import WorkflowList from './pages/WorkflowList'
import WorkflowDesigner from './pages/WorkflowDesigner'
import WorkflowVersions from './pages/WorkflowVersions'
import ExecutionList from './pages/ExecutionList'
import ExecutionDetail from './pages/ExecutionDetail'
import FailedWorkflows from './pages/FailedWorkflows'
import EventTriggers from './pages/EventTriggers'
import WebhookLogs from './pages/WebhookLogs'
import RateLimits from './pages/RateLimits'
import TeamManagement from './pages/TeamManagement'
import DeveloperPortal from './pages/DeveloperPortal'
import AuditLogs from './pages/AuditLogs'
import Settings from './pages/Settings'
import Models from './pages/Models'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes inside AppLayout */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Workflow routes */}
        <Route path="/workflows" element={<WorkflowList />} />
        <Route path="/workflows/:workflowName/designer" element={<WorkflowDesigner />} />
        <Route path="/workflows/:workflowName/versions" element={<WorkflowVersions />} />

        {/* Execution routes */}
        <Route path="/executions" element={<ExecutionList />} />
        <Route path="/executions/:executionId" element={<ExecutionDetail />} />

        {/* Reliability routes */}
        <Route path="/failed-workflows" element={<FailedWorkflows />} />
        <Route path="/webhooks" element={<WebhookLogs />} />

        {/* Integration routes */}
        <Route path="/triggers" element={<EventTriggers />} />
        <Route path="/rate-limits" element={<RateLimits />} />

        {/* Admin routes */}
        <Route path="/team" element={<TeamManagement />} />
        <Route path="/developer" element={<DeveloperPortal />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/models" element={<Models />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
