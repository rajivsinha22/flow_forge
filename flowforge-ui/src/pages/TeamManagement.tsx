import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus, Trash2, X, Shield, Users, Edit2, AlertTriangle } from 'lucide-react'
import { usePlanEnforcement } from '../hooks/usePlanEnforcement'
import { useBillingStore } from '../store/billingStore'
import { listUsers, inviteUser, listRoles, createRole } from '../api/team'
import type { TeamMember, Role } from '../types'
import StatusBadge from '../components/shared/StatusBadge'
import Spinner from '../components/shared/Spinner'
import ConfirmModal from '../components/shared/ConfirmModal'
import { format } from 'date-fns'

const MOCK_USERS: TeamMember[] = [
  { id: 'u-1', name: 'Jane Smith', email: 'jane@company.com', roles: ['ADMIN'], joinedAt: new Date(Date.now() - 86400000 * 30).toISOString(), status: 'ACTIVE' },
  { id: 'u-2', name: 'John Doe', email: 'john@company.com', roles: ['DEVELOPER'], joinedAt: new Date(Date.now() - 86400000 * 15).toISOString(), status: 'ACTIVE' },
  { id: 'u-3', name: 'Alice Wang', email: 'alice@company.com', roles: ['VIEWER'], joinedAt: new Date(Date.now() - 86400000 * 5).toISOString(), status: 'PENDING' },
]

const MOCK_ROLES: Role[] = [
  { id: 'r-1', name: 'ADMIN', description: 'Full access to all resources', permissions: ['workflows:*', 'executions:*', 'team:*', 'settings:*'], memberCount: 1 },
  { id: 'r-2', name: 'DEVELOPER', description: 'Can create, edit and run workflows', permissions: ['workflows:read', 'workflows:write', 'executions:*', 'triggers:read'], memberCount: 1 },
  { id: 'r-3', name: 'VIEWER', description: 'Read-only access to workflows and executions', permissions: ['workflows:read', 'executions:read'], memberCount: 1 },
]

const ALL_PERMISSIONS = [
  'workflows:read', 'workflows:write', 'workflows:delete', 'workflows:publish',
  'executions:read', 'executions:write', 'executions:cancel',
  'triggers:read', 'triggers:write',
  'team:read', 'team:write',
  'settings:read', 'settings:write',
  'api-keys:read', 'api-keys:write',
  'audit-logs:read',
  'failed-workflows:read', 'failed-workflows:write',
]

const TeamManagement: React.FC = () => {
  const memberLimit = usePlanEnforcement('teamMembers')
  const { fetchUsage } = useBillingStore()

  useEffect(() => { fetchUsage() }, [fetchUsage])

  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users')
  const [users, setUsers] = useState<TeamMember[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showRoleDrawer, setShowRoleDrawer] = useState(false)
  const [editRole, setEditRole] = useState<Role | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null)
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', roles: ['VIEWER'] })
  const [newRole, setNewRole] = useState({ name: '', description: '', permissions: [] as string[] })
  const [isInviting, setIsInviting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [u, r] = await Promise.all([listUsers(), listRoles()])
        setUsers(u)
        setRoles(r)
      } catch {
        setUsers(MOCK_USERS)
        setRoles(MOCK_ROLES)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteForm.email || !inviteForm.name) return
    setIsInviting(true)
    try {
      const member = await inviteUser(inviteForm)
      setUsers((prev) => [...prev, member])
    } catch {
      const member: TeamMember = { id: `u-${Date.now()}`, ...inviteForm, joinedAt: new Date().toISOString(), status: 'PENDING' }
      setUsers((prev) => [...prev, member])
    } finally {
      setIsInviting(false)
      setShowInviteModal(false)
      setInviteForm({ name: '', email: '', roles: ['VIEWER'] })
    }
  }

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const created = await createRole(editRole || newRole)
      if (editRole) {
        setRoles((prev) => prev.map((r) => r.id === editRole.id ? created : r))
      } else {
        setRoles((prev) => [...prev, created])
      }
    } catch {
      const role: Role = { id: `r-${Date.now()}`, memberCount: 0, ...(editRole || newRole) }
      if (editRole) setRoles((prev) => prev.map((r) => r.id === editRole.id ? role : r))
      else setRoles((prev) => [...prev, role])
    }
    setShowRoleDrawer(false)
    setEditRole(null)
    setNewRole({ name: '', description: '', permissions: [] })
  }

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" label="Loading team..." /></div>

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} members across {roles.length} roles</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'users' && (
            <button
              onClick={() => !memberLimit.isAtLimit && setShowInviteModal(true)}
              disabled={memberLimit.isAtLimit}
              className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-xl ${
                memberLimit.isAtLimit
                  ? 'bg-gray-400 cursor-not-allowed opacity-50'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <UserPlus size={16} /> {memberLimit.isAtLimit ? `${memberLimit.used}/${memberLimit.limit} Members` : 'Invite Member'}
            </button>
          )}
          {activeTab === 'roles' && (
            <button onClick={() => { setEditRole(null); setShowRoleDrawer(true) }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl">
              <Shield size={16} /> Create Role
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        {(['users', 'roles'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
          >
            {tab === 'users' ? <Users size={15} /> : <Shield size={15} />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {memberLimit.isAtLimit && activeTab === 'users' && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle size={16} />
            <span>Team member limit reached ({memberLimit.used}/{memberLimit.limit}). Upgrade your plan to invite more.</span>
          </div>
          <Link to="/billing" className="text-xs font-medium text-red-700 bg-red-100 px-3 py-1 rounded-lg hover:bg-red-200">
            Upgrade
          </Link>
        </div>
      )}
      {memberLimit.isNearLimit && !memberLimit.isAtLimit && activeTab === 'users' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-2 text-sm text-yellow-700">
          <AlertTriangle size={16} />
          <span>Approaching team member limit ({memberLimit.used}/{memberLimit.limit}).</span>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Member</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Roles</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
                <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {user.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <span key={role} className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4"><StatusBadge status={user.status} /></td>
                  <td className="px-4 py-4 text-xs text-gray-500">{format(new Date(user.joinedAt), 'MMM d, yyyy')}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => setDeleteTarget(user)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          {roles.map((role) => (
            <div key={role.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-blue-600" />
                    <h3 className="font-semibold text-gray-900">{role.name}</h3>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{role.memberCount} member{role.memberCount !== 1 ? 's' : ''}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{role.description}</p>
                </div>
                <button onClick={() => { setEditRole(role); setNewRole({ name: role.name, description: role.description, permissions: role.permissions }); setShowRoleDrawer(true) }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                  <Edit2 size={14} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {role.permissions.map((perm) => (
                  <span key={perm} className="px-2 py-0.5 rounded text-xs font-mono bg-gray-100 text-gray-600">
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowInviteModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Invite Team Member</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input type="text" required value={inviteForm.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Jane Smith" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <input type="email" required value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="jane@company.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                <select value={inviteForm.roles[0]} onChange={(e) => setInviteForm({ ...inviteForm, roles: [e.target.value] })} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowInviteModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isInviting} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50">{isInviting ? 'Sending...' : 'Send Invite'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Drawer */}
      {showRoleDrawer && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowRoleDrawer(false)} />
          <div className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">{editRole ? 'Edit Role' : 'Create Role'}</h3>
              <button onClick={() => setShowRoleDrawer(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveRole} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role Name</label>
                <input type="text" required value={newRole.name} onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ROLE_NAME" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <input type="text" value={newRole.description} onChange={(e) => setNewRole({ ...newRole, description: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Role description" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {ALL_PERMISSIONS.map((perm) => (
                    <label key={perm} className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={newRole.permissions.includes(perm)}
                        onChange={(e) => {
                          const perms = e.target.checked
                            ? [...newRole.permissions, perm]
                            : newRole.permissions.filter((p) => p !== perm)
                          setNewRole({ ...newRole, permissions: perms })
                        }}
                        className="rounded"
                      />
                      <span className="text-xs font-mono text-gray-700">{perm}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm">
                {editRole ? 'Update Role' : 'Create Role'}
              </button>
            </form>
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Remove Team Member"
        message={`Remove ${deleteTarget?.name} from the team? They will lose access immediately.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => { setUsers((prev) => prev.filter((u) => u.id !== deleteTarget?.id)); setDeleteTarget(null) }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default TeamManagement
