import React from 'react'
import clsx from 'clsx'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  label?: string
}

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-4',
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className, label }) => {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-2', className)}>
      <div
        className={clsx(
          'animate-spin rounded-full border-gray-300 border-t-blue-600',
          sizeMap[size]
        )}
      />
      {label && <p className="text-sm text-gray-500">{label}</p>}
    </div>
  )
}

export default Spinner
