import React from 'react'
import clsx from 'clsx'

interface StatusBadgeProps {
  status: string
  className?: string
}

const statusConfig: Record<string, { label: string; classes: string; pulse?: boolean }> = {
  SUCCESS: { label: 'Success', classes: 'bg-green-100 text-green-800' },
  COMPLETED: { label: 'Completed', classes: 'bg-green-100 text-green-800' },
  RUNNING: { label: 'Running', classes: 'bg-blue-100 text-blue-800', pulse: true },
  IN_PROGRESS: { label: 'In Progress', classes: 'bg-blue-100 text-blue-800', pulse: true },
  FAILED: { label: 'Failed', classes: 'bg-red-100 text-red-800' },
  ERROR: { label: 'Error', classes: 'bg-red-100 text-red-800' },
  PENDING: { label: 'Pending', classes: 'bg-yellow-100 text-yellow-800' },
  WAITING: { label: 'Waiting', classes: 'bg-yellow-100 text-yellow-800' },
  DRAFT: { label: 'Draft', classes: 'bg-gray-100 text-gray-700' },
  PUBLISHED: { label: 'Published', classes: 'bg-green-100 text-green-800' },
  DEPRECATED: { label: 'Deprecated', classes: 'bg-gray-100 text-gray-500' },
  PAUSED: { label: 'Paused', classes: 'bg-orange-100 text-orange-800' },
  CANCELLED: { label: 'Cancelled', classes: 'bg-gray-100 text-gray-600' },
  SKIPPED: { label: 'Skipped', classes: 'bg-gray-100 text-gray-500' },
  ACTIVE: { label: 'Active', classes: 'bg-green-100 text-green-800' },
  INACTIVE: { label: 'Inactive', classes: 'bg-gray-100 text-gray-600' },
  REPLAYED: { label: 'Replayed', classes: 'bg-blue-100 text-blue-800' },
  DISCARDED: { label: 'Discarded', classes: 'bg-gray-100 text-gray-500' },
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config = statusConfig[status?.toUpperCase()] ?? {
    label: status ?? 'Unknown',
    classes: 'bg-gray-100 text-gray-600',
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.classes,
        className
      )}
    >
      {config.pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
        </span>
      )}
      {config.label}
    </span>
  )
}

export default StatusBadge
