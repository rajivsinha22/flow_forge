import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import {
  LayoutDashboard,
  GitBranch,
  Play,
  Inbox,
  Webhook,
  Zap,
  Gauge,
  Users,
  Code2,
  Settings,
  CreditCard,
  ChevronDown,
  ChevronRight,
  Sparkles,
  LogOut,
  Database,
  Layers,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import NamespaceSelector from './NamespaceSelector'

interface NavItem {
  label: string
  to?: string
  icon: React.ReactNode
  children?: NavItem[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Models', to: '/models', icon: <Database size={18} /> },
  { label: 'Workflows', to: '/workflows', icon: <GitBranch size={18} /> },
  { label: 'Executions', to: '/executions', icon: <Play size={18} /> },
  {
    label: 'Reliability',
    icon: <Inbox size={18} />,
    children: [
      { label: 'Failed Workflows', to: '/failed-workflows', icon: <Inbox size={16} /> },
      { label: 'Webhook Logs', to: '/webhooks', icon: <Webhook size={16} /> },
    ],
  },
  {
    label: 'Integrations',
    icon: <Zap size={18} />,
    children: [
      { label: 'Event Triggers', to: '/triggers', icon: <Zap size={16} /> },
      { label: 'Rate Limits', to: '/rate-limits', icon: <Gauge size={16} /> },
    ],
  },
  { label: 'Team', to: '/team', icon: <Users size={18} /> },
  { label: 'Namespaces', to: '/namespaces', icon: <Layers size={18} /> },
  { label: 'Developer', to: '/developer', icon: <Code2 size={18} /> },
  { label: 'Settings', to: '/settings', icon: <Settings size={18} /> },
  { label: 'Billing', to: '/billing', icon: <CreditCard size={18} /> },
]

interface NavItemProps {
  item: NavItem
  depth?: number
}

const NavItemComponent: React.FC<NavItemProps> = ({ item, depth = 0 }) => {
  const location = useLocation()
  const hasChildren = item.children && item.children.length > 0
  const isChildActive = item.children?.some(
    (child) => child.to && location.pathname.startsWith(child.to)
  )
  const [open, setOpen] = useState(isChildActive ?? false)

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={clsx(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            isChildActive
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            depth > 0 && 'pl-8'
          )}
        >
          <span className="text-gray-400">{item.icon}</span>
          <span className="flex-1 text-left">{item.label}</span>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {open && (
          <div className="mt-0.5 ml-2">
            {item.children!.map((child) => (
              <NavItemComponent key={child.label} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <NavLink
      to={item.to!}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
          depth > 0 && 'pl-8 text-xs'
        )
      }
    >
      {item.icon}
      {item.label}
    </NavLink>
  )
}

const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore()

  return (
    <aside className="w-[220px] min-h-screen bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg p-1.5">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-gray-900 text-sm">FlowForge</span>
              <span className="text-[9px] font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-1.5 py-0.5 rounded-full leading-none">AI</span>
              {import.meta.env.VITE_DUMMY_MODE === 'true' && (
                <span className="text-[9px] font-bold bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded-full leading-none tracking-wide">DEMO</span>
              )}
            </div>
            {user && (
              <p className="text-xs text-gray-400 truncate max-w-[130px]">
                {user.name || user.email}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Namespace Selector */}
      <NamespaceSelector />

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavItemComponent key={item.label} item={item} />
        ))}
      </nav>

      {/* User profile at bottom */}
      {user && (
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}

export default Sidebar
