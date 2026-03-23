import React from 'react'
import clsx from 'clsx'

interface MetricCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  trend?: number
  trendLabel?: string
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange'
  className?: string
}

const colorMap = {
  blue: 'bg-blue-50 text-blue-600 border-blue-100',
  green: 'bg-green-50 text-green-600 border-green-100',
  red: 'bg-red-50 text-red-600 border-red-100',
  yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
  purple: 'bg-purple-50 text-purple-600 border-purple-100',
  orange: 'bg-orange-50 text-orange-600 border-orange-100',
}

const iconColorMap = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  red: 'bg-red-100 text-red-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  purple: 'bg-purple-100 text-purple-600',
  orange: 'bg-orange-100 text-orange-600',
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon,
  trend,
  trendLabel,
  color = 'blue',
  className,
}) => {
  return (
    <div
      className={clsx(
        'bg-white rounded-xl border p-5 shadow-sm flex items-start gap-4',
        colorMap[color],
        className
      )}
    >
      {icon && (
        <div className={clsx('p-2.5 rounded-lg flex-shrink-0', iconColorMap[color])}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 font-medium truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {trend !== undefined && (
          <p className={clsx('text-xs mt-1 font-medium', trend >= 0 ? 'text-green-600' : 'text-red-600')}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%{trendLabel ? ` ${trendLabel}` : ''}
          </p>
        )}
      </div>
    </div>
  )
}

export default MetricCard
