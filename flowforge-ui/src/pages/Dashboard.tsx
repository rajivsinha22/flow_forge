import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import {
  GitBranch, Play, AlertTriangle, TrendingUp, Plus, Zap,
  RefreshCw, Code2, ArrowRight, Clock, CheckCircle2, Sparkles
} from 'lucide-react'
import { getAnalyticsSummary } from '../api/settings'
import type { AnalyticsSummary, Execution } from '../types'
import MetricCard from '../components/shared/MetricCard'
import StatusBadge from '../components/shared/StatusBadge'
import Spinner from '../components/shared/Spinner'
import { formatDistanceToNow } from 'date-fns'

const MOCK_SUMMARY: AnalyticsSummary = {
  totalWorkflows: 12,
  executionsToday: 847,
  failedToday: 23,
  slaPercentage: 97.3,
  executionsByDay: [
    { date: 'Mar 12', success: 210, failed: 8 },
    { date: 'Mar 13', success: 345, failed: 12 },
    { date: 'Mar 14', success: 289, failed: 5 },
    { date: 'Mar 15', success: 420, failed: 18 },
    { date: 'Mar 16', success: 380, failed: 9 },
    { date: 'Mar 17', success: 512, failed: 21 },
    { date: 'Mar 18', success: 824, failed: 23 },
  ],
  recentExecutions: [
    { id: 'ex-001', workflowName: 'order-processing', workflowVersion: 3, status: 'SUCCESS', triggerType: 'KAFKA', triggeredBy: 'kafka-trigger', startedAt: new Date(Date.now() - 60000).toISOString(), completedAt: new Date(Date.now() - 58000).toISOString(), durationMs: 2100 },
    { id: 'ex-002', workflowName: 'user-onboarding', workflowVersion: 2, status: 'RUNNING', triggerType: 'KAFKA', triggeredBy: 'kafka-trigger', startedAt: new Date(Date.now() - 30000).toISOString(), durationMs: undefined },
    { id: 'ex-003', workflowName: 'invoice-sync', workflowVersion: 1, status: 'FAILED', triggerType: 'CRON', triggeredBy: 'cron-trigger', startedAt: new Date(Date.now() - 300000).toISOString(), completedAt: new Date(Date.now() - 298000).toISOString(), durationMs: 1500 },
    { id: 'ex-004', workflowName: 'order-processing', workflowVersion: 3, status: 'SUCCESS', triggerType: 'API', triggeredBy: 'admin@acme.com', startedAt: new Date(Date.now() - 600000).toISOString(), completedAt: new Date(Date.now() - 597000).toISOString(), durationMs: 3200 },
    { id: 'ex-005', workflowName: 'notification-dispatch', workflowVersion: 1, status: 'PAUSED', triggerType: 'API', triggeredBy: 'manual', startedAt: new Date(Date.now() - 900000).toISOString(), durationMs: undefined },
  ],
  activeDlqCount: 7,
}

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await getAnalyticsSummary()
        setSummary(data)
      } catch {
        setSummary(MOCK_SUMMARY)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSummary()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <Spinner size="lg" label="Loading dashboard..." />
      </div>
    )
  }

  const data = summary || MOCK_SUMMARY

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Your workflow orchestration overview</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/workflows/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            <Plus size={16} /> New Workflow
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <MetricCard
          label="Total Workflows"
          value={data.totalWorkflows}
          icon={<GitBranch size={20} />}
          color="blue"
          trend={8}
          trendLabel="this month"
        />
        <MetricCard
          label="Executions Today"
          value={data.executionsToday.toLocaleString()}
          icon={<Play size={20} />}
          color="green"
          trend={12}
          trendLabel="vs yesterday"
        />
        <MetricCard
          label="Failed Today"
          value={data.failedToday}
          icon={<AlertTriangle size={20} />}
          color="red"
          trend={-5}
          trendLabel="vs yesterday"
        />
        <MetricCard
          label="SLA Compliance"
          value={`${data.slaPercentage}%`}
          icon={<TrendingUp size={20} />}
          color="purple"
          trend={0.3}
          trendLabel="this week"
        />
      </div>

      {/* Chart + Failed Workflows widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Execution Trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-gray-900">Execution Trends (Last 7 Days)</h2>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">Daily breakdown</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.executionsByDay} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="success" name="Success" fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Failed Workflows Widget */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Failed Workflows</h2>
            <Link to="/failed-workflows" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all <ArrowRight size={10} />
            </Link>
          </div>

          {data.activeDlqCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 size={32} className="text-green-400 mb-2" />
              <p className="text-sm text-gray-500">No pending messages</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle size={18} className="text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-700">{data.activeDlqCount}</p>
                  <p className="text-xs text-red-500">Pending messages</p>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => navigate('/failed-workflows')}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <RefreshCw size={14} /> Replay All Pending
                </button>
                <Link
                  to="/failed-workflows"
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ArrowRight size={14} /> View Failed Workflows
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent Executions + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Executions */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900">Recent Executions</h2>
            <Link to="/executions" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all <ArrowRight size={10} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recentExecutions.map((exec: Execution) => (
              <div
                key={exec.id}
                className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => navigate(`/executions/${exec.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{exec.workflowName}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-400">v{exec.workflowVersion}</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={10} />
                      {formatDistanceToNow(new Date(exec.startedAt), { addSuffix: true })}
                    </span>
                    {exec.durationMs && (
                      <span className="text-xs text-gray-400">{exec.durationMs}ms</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                    {exec.triggerType}
                  </span>
                  <StatusBadge status={exec.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-2.5">
            <Link
              to="/workflows/new"
              className="flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl transition-colors group"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Plus size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">New Workflow</p>
                <p className="text-xs text-blue-500">Design a new workflow</p>
              </div>
              <ArrowRight size={14} className="ml-auto text-blue-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              to="/triggers"
              className="flex items-center gap-3 px-4 py-3 bg-purple-50 hover:bg-purple-100 border border-purple-100 rounded-xl transition-colors group"
            >
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-900">Add Trigger</p>
                <p className="text-xs text-purple-500">Connect an event source</p>
              </div>
              <ArrowRight size={14} className="ml-auto text-purple-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              to="/failed-workflows"
              className="flex items-center gap-3 px-4 py-3 bg-orange-50 hover:bg-orange-100 border border-orange-100 rounded-xl transition-colors group"
            >
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <RefreshCw size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-900">Failed Workflows</p>
                <p className="text-xs text-orange-500">{data.activeDlqCount} pending messages</p>
              </div>
              <ArrowRight size={14} className="ml-auto text-orange-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              to="/executions?status=FAILED"
              className="flex items-center gap-3 px-4 py-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl transition-colors group"
            >
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-indigo-900">AI Analyst</p>
                <p className="text-xs text-indigo-500">Explain failed executions</p>
              </div>
              <ArrowRight size={14} className="ml-auto text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              to="/developer"
              className="flex items-center gap-3 px-4 py-3 bg-teal-50 hover:bg-teal-100 border border-teal-100 rounded-xl transition-colors group"
            >
              <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Code2 size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-teal-900">Developer Portal</p>
                <p className="text-xs text-teal-500">API docs, keys & sandbox</p>
              </div>
              <ArrowRight size={14} className="ml-auto text-teal-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
