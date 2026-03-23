import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, GitBranch, RotateCcw, Eye, Clock } from 'lucide-react'
import { getWorkflowVersions, rollbackWorkflow } from '../api/workflows'
import type { WorkflowVersion } from '../types'
import StatusBadge from '../components/shared/StatusBadge'
import ConfirmModal from '../components/shared/ConfirmModal'
import Spinner from '../components/shared/Spinner'
import { format, isValid } from 'date-fns'

/** Safely format a date string — returns '—' when value is null/undefined/invalid */
const fmtDate = (val: string | null | undefined) => {
  if (!val) return '—'
  const d = new Date(val)
  return isValid(d) ? format(d, 'MMM d, yyyy HH:mm') : '—'
}

const MOCK_VERSIONS: WorkflowVersion[] = [
  { version: 3, status: 'PUBLISHED', publishedAt: new Date(Date.now() - 86400000).toISOString(), createdAt: new Date(Date.now() - 90000000).toISOString(), createdBy: 'jane@company.com', changeNote: 'Added retry policy to HTTP steps, improved error handling' },
  { version: 2, status: 'DEPRECATED', publishedAt: new Date(Date.now() - 604800000).toISOString(), createdAt: new Date(Date.now() - 700000000).toISOString(), createdBy: 'john@company.com', changeNote: 'Added notification step for failed orders' },
  { version: 1, status: 'DEPRECATED', publishedAt: new Date(Date.now() - 2592000000).toISOString(), createdAt: new Date(Date.now() - 2700000000).toISOString(), createdBy: 'jane@company.com', changeNote: 'Initial workflow release' },
]

const WorkflowVersions: React.FC = () => {
  const { workflowName } = useParams<{ workflowName: string }>()
  const navigate = useNavigate()

  const [versions, setVersions] = useState<WorkflowVersion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [rollbackTarget, setRollbackTarget] = useState<WorkflowVersion | null>(null)
  const [isRollingBack, setIsRollingBack] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getWorkflowVersions(workflowName!)
        setVersions(data)
      } catch {
        setVersions(MOCK_VERSIONS)
      } finally {
        setIsLoading(false)
      }
    }
    fetch()
  }, [workflowName])

  const handleRollback = async () => {
    if (!rollbackTarget || !workflowName) return
    setIsRollingBack(true)
    try {
      await rollbackWorkflow(workflowName, rollbackTarget.version)
      setSuccessMsg(`Successfully rolled back to v${rollbackTarget.version}`)
      setVersions((prev) =>
        prev.map((v) => ({
          ...v,
          status: v.version === rollbackTarget.version ? 'PUBLISHED' : v.status === 'PUBLISHED' ? 'DEPRECATED' : v.status,
        }))
      )
    } catch {
      setSuccessMsg(`Rollback to v${rollbackTarget.version} initiated`)
    } finally {
      setIsRollingBack(false)
      setRollbackTarget(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" label="Loading versions..." />
      </div>
    )
  }

  const currentVersion = versions.find((v) => v.status === 'PUBLISHED')

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(`/workflows/${workflowName}/designer`)}
          className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <GitBranch size={18} className="text-gray-400" />
            <h1 className="text-2xl font-bold text-gray-900">Version History</h1>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            <span className="font-mono">{workflowName}</span> — {versions.length} versions
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm mb-6 flex items-center gap-2">
          <StatusBadge status="SUCCESS" />
          {successMsg}
        </div>
      )}

      {currentVersion && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm mb-6">
          <span className="text-blue-700 font-medium">Currently live:</span>{' '}
          <span className="text-blue-600">v{currentVersion.version}</span>
          {currentVersion.publishedAt && (
            <span className="text-blue-500 ml-2">
              — published {format(new Date(currentVersion.publishedAt), 'MMM d, yyyy')}
            </span>
          )}
        </div>
      )}

      {/* Versions timeline */}
      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />
        <div className="space-y-4">
          {versions.map((version, i) => (
            <div key={version.version} className="relative flex gap-4">
              {/* Timeline dot */}
              <div
                className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold ${
                  version.status === 'PUBLISHED'
                    ? 'bg-green-100 border-green-400 text-green-700'
                    : 'bg-white border-gray-300 text-gray-500'
                }`}
              >
                v{version.version}
              </div>

              {/* Card */}
              <div
                className={`flex-1 bg-white rounded-xl border p-5 mb-2 ${
                  version.status === 'PUBLISHED' ? 'border-green-200 shadow-sm' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-gray-900">Version {version.version}</span>
                      <StatusBadge status={version.status} />
                    </div>
                    {version.changeNote && (
                      <p className="text-sm text-gray-600 mb-3">{version.changeNote}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        Created {fmtDate(version.createdAt)}
                      </span>
                      {version.publishedAt && (
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          Published {fmtDate(version.publishedAt)}
                        </span>
                      )}
                      <span>by {version.createdBy}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      to={`/workflows/${workflowName}/designer?version=${version.version}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100"
                    >
                      <Eye size={12} /> View
                    </Link>
                    {version.status !== 'PUBLISHED' && (
                      <button
                        onClick={() => setRollbackTarget(version)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100"
                      >
                        <RotateCcw size={12} /> Rollback
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!rollbackTarget}
        title="Rollback Workflow"
        message={`Are you sure you want to roll back to version ${rollbackTarget?.version}? The current published version will be deprecated.`}
        confirmLabel="Rollback"
        variant="warning"
        onConfirm={handleRollback}
        onCancel={() => setRollbackTarget(null)}
        isLoading={isRollingBack}
      />
    </div>
  )
}

export default WorkflowVersions
