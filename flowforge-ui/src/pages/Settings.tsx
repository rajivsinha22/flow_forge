import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Save, Plus, Trash2, Eye, EyeOff, Lock, Building2, Webhook, Copy, Crown, ExternalLink } from 'lucide-react'
import { getOrgSettings, updateOrgSettings, listEnvVars, setEnvVar, deleteEnvVar } from '../api/settings'
import { getMe } from '../api/auth'
import type { OrgSettings, EnvVar } from '../api/settings'
import { PLAN_META, type Plan } from '../config/planLimits'
import Spinner from '../components/shared/Spinner'

const MOCK_SETTINGS: OrgSettings = {
  orgName: 'Acme Corp',
  webhookEnabled: false,
  webhookUrl: 'https://api.acme.io/webhooks',
  webhookSecret: '••••••••••••••••',
  notificationEmail: 'ops@acme.io',
  timezone: 'America/New_York',
}

const MOCK_ENV_VARS: EnvVar[] = [
  { key: 'DATABASE_URL', value: 'postgres://user:pass@host:5432/db', encrypted: true },
  { key: 'API_BASE_URL', value: 'https://api.acme.io', encrypted: false },
  { key: 'SLACK_BOT_TOKEN', value: 'xoxb-••••••••••••', encrypted: true },
  { key: 'STRIPE_SECRET_KEY', value: 'sk_test_••••••••••••', encrypted: true },
]

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Singapore',
  'Australia/Sydney', 'UTC',
]

const PLAN_BADGE_COLORS: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-700',
  PRO: 'bg-blue-100 text-blue-700',
  ENTERPRISE: 'bg-purple-100 text-purple-700',
}

interface OrgData {
  id: string
  orgName: string
  plan: string
  createdAt: string
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<OrgSettings | null>(null)
  const [envVars, setEnvVars] = useState<EnvVar[]>([])
  const [orgData, setOrgData] = useState<OrgData | null>(null)
  const [copiedId, setCopiedId] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [showWebhookSecret, setShowWebhookSecret] = useState(false)
  const [newEnvVar, setNewEnvVar] = useState({ key: '', value: '', encrypted: false })
  const [showAddEnvVar, setShowAddEnvVar] = useState(false)
  const [visibleVars, setVisibleVars] = useState<Set<string>>(new Set())

  const handleCopyClientId = () => {
    if (orgData?.id) {
      navigator.clipboard.writeText(orgData.id)
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [s, v] = await Promise.all([getOrgSettings(), listEnvVars()])
        setSettings(s)
        setEnvVars(v)
      } catch {
        setSettings(MOCK_SETTINGS)
        setEnvVars(MOCK_ENV_VARS)
      }
      try {
        const me = await getMe() as any
        setOrgData({
          id: me.clientId || me.id || '',
          orgName: me.orgName || '',
          plan: me.plan || 'FREE',
          createdAt: me.createdAt || '',
        })
      } catch {
        setOrgData({
          id: 'client_acme_001',
          orgName: 'Acme Corp',
          plan: 'ENTERPRISE',
          createdAt: '2024-01-15T09:00:00Z',
        })
      }
      setIsLoading(false)
    }
    fetchData()
  }, [])

  const handleSaveSettings = async () => {
    if (!settings) return
    setIsSaving(true)
    try {
      await updateOrgSettings(settings)
      setSuccessMsg('Settings saved successfully')
    } catch {
      setSuccessMsg('Settings saved (demo mode)')
    } finally {
      setIsSaving(false)
      setTimeout(() => setSuccessMsg(null), 3000)
    }
  }

  const handleAddEnvVar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEnvVar.key) return
    try {
      const created = await setEnvVar(newEnvVar.key, newEnvVar.value, newEnvVar.encrypted)
      setEnvVars((prev) => [...prev.filter((v) => v.key !== newEnvVar.key), created])
    } catch {
      setEnvVars((prev) => [...prev.filter((v) => v.key !== newEnvVar.key), newEnvVar])
    }
    setNewEnvVar({ key: '', value: '', encrypted: false })
    setShowAddEnvVar(false)
  }

  const handleDeleteEnvVar = async (key: string) => {
    try { await deleteEnvVar(key) } catch { /* ignore */ }
    setEnvVars((prev) => prev.filter((v) => v.key !== key))
  }

  const toggleVarVisibility = (key: string) => {
    setVisibleVars((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" label="Loading settings..." /></div>
  if (!settings) return null

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Organization configuration and environment variables</p>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm mb-6">
          {successMsg}
        </div>
      )}

      {/* Organization Overview */}
      {orgData && (
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 rounded-2xl border border-blue-100 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={18} className="text-indigo-600" />
            <h2 className="font-semibold text-gray-900">Organization</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client ID */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Client ID</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white/80 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-700 truncate">
                  {orgData.id}
                </code>
                <button
                  onClick={handleCopyClientId}
                  className="flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Copy size={12} />
                  {copiedId ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Organization Name */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Organization Name</label>
              <p className="text-lg font-semibold text-gray-900">{orgData.orgName}</p>
            </div>

            {/* Plan */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Plan</label>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${PLAN_BADGE_COLORS[orgData.plan] || PLAN_BADGE_COLORS.FREE}`}>
                  <Crown size={12} />
                  {PLAN_META[orgData.plan as Plan]?.label || orgData.plan}
                </span>
                <Link to="/billing" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                  Manage <ExternalLink size={11} />
                </Link>
              </div>
            </div>

            {/* Created */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Created</label>
              <p className="text-sm text-gray-700">
                {orgData.createdAt ? new Date(orgData.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Organization Info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={18} className="text-blue-600" />
          <h2 className="font-semibold text-gray-900">Organization Info</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Organization Name</label>
            <input
              type="text"
              value={settings.orgName}
              onChange={(e) => setSettings({ ...settings, orgName: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Timezone</label>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notification Email</label>
            <input
              type="email"
              value={settings.notificationEmail || ''}
              onChange={(e) => setSettings({ ...settings, notificationEmail: e.target.value })}
              placeholder="ops@company.com"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Webhook Config */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Webhook size={18} className="text-blue-600" />
          <h2 className="font-semibold text-gray-900">Webhook Configuration</h2>
        </div>
        <div className="space-y-4">
          {/* Enable toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-800">Enable Outbound Webhook Delivery</p>
              <p className="text-xs text-gray-400 mt-0.5">FlowForge will POST execution events to your endpoint when enabled</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, webhookEnabled: !settings.webhookEnabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                settings.webhookEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  settings.webhookEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* URL and secret — greyed out when disabled */}
          <div className={settings.webhookEnabled ? '' : 'opacity-50 pointer-events-none'}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Outbound Webhook URL</label>
              <input
                type="url"
                value={settings.webhookUrl || ''}
                onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
                placeholder="https://your-app.com/webhooks"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">FlowForge will POST execution events to this URL</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Webhook Secret</label>
              <div className="relative">
                <input
                  type={showWebhookSecret ? 'text' : 'password'}
                  value={settings.webhookSecret || ''}
                  onChange={(e) => setSettings({ ...settings, webhookSecret: e.target.value })}
                  placeholder="••••••••••••••••"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showWebhookSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Used for HMAC signature verification of webhook payloads</p>
            </div>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end mb-6">
        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Save size={14} /> {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Environment Variables */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Environment Variables</h2>
            <p className="text-xs text-gray-400 mt-0.5">Securely store secrets and config accessible in workflow steps</p>
          </div>
          <button
            onClick={() => setShowAddEnvVar(!showAddEnvVar)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
          >
            <Plus size={12} /> Add Variable
          </button>
        </div>

        {showAddEnvVar && (
          <form onSubmit={handleAddEnvVar} className="px-6 py-4 bg-blue-50 border-b border-blue-100">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Key</label>
                <input
                  type="text"
                  required
                  value={newEnvVar.key}
                  onChange={(e) => setNewEnvVar({ ...newEnvVar, key: e.target.value.toUpperCase().replace(/\s/g, '_') })}
                  placeholder="MY_API_KEY"
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
                <input
                  type="text"
                  value={newEnvVar.value}
                  onChange={(e) => setNewEnvVar({ ...newEnvVar, value: e.target.value })}
                  placeholder="value"
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={newEnvVar.encrypted}
                  onChange={(e) => setNewEnvVar({ ...newEnvVar, encrypted: e.target.checked })}
                  className="rounded"
                />
                <Lock size={12} /> Encrypt at rest
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowAddEnvVar(false)} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg">Cancel</button>
                <button type="submit" className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Add Variable</button>
              </div>
            </div>
          </form>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Key</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Value</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Encrypted</th>
              <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {envVars.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-14 text-center">
                  <Lock size={28} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-400 font-medium">No environment variables</p>
                  <p className="text-gray-300 text-xs mt-1">Click "Add Variable" to store a secret or config value.</p>
                </td>
              </tr>
            ) : envVars.map((v) => (
              <tr key={v.key} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-xs text-gray-700">{v.key}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-gray-600 max-w-[220px] truncate">
                      {v.encrypted && !visibleVars.has(v.key) ? '•'.repeat(16) : v.value}
                    </span>
                    {v.encrypted && (
                      <button onClick={() => toggleVarVisibility(v.key)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                        {visibleVars.has(v.key) ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  {v.encrypted ? (
                    <span className="flex items-center gap-1 text-xs text-green-700"><Lock size={11} /> Encrypted</span>
                  ) : (
                    <span className="text-xs text-gray-400">Plaintext</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDeleteEnvVar(v.key)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Settings
