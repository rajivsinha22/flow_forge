import React from 'react'
import { Globe, GitBranch, RefreshCw, Clock, Code2, Bell, Layers, Pause, Sparkles } from 'lucide-react'

const stepTypes = [
  {
    type: 'HTTP_REQUEST',
    label: 'HTTP Request',
    icon: <Globe size={16} />,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    description: 'Call an external API',
  },
  {
    type: 'CONDITION',
    label: 'Condition',
    icon: <GitBranch size={16} />,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    description: 'Branch based on expression',
  },
  {
    type: 'LOOP',
    label: 'Loop',
    icon: <RefreshCw size={16} />,
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    description: 'Iterate over a list',
  },
  {
    type: 'DELAY',
    label: 'Delay',
    icon: <Clock size={16} />,
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    description: 'Wait for a duration',
  },
  {
    type: 'SCRIPT',
    label: 'Script',
    icon: <Code2 size={16} />,
    color: 'bg-green-100 text-green-700 border-green-200',
    description: 'Run custom code',
  },
  {
    type: 'NOTIFY',
    label: 'Notify',
    icon: <Bell size={16} />,
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    description: 'Send Slack/email alert',
  },
  {
    type: 'SUB_WORKFLOW',
    label: 'Sub-Workflow',
    icon: <Layers size={16} />,
    color: 'bg-teal-100 text-teal-700 border-teal-200',
    description: 'Invoke another workflow',
  },
  {
    type: 'WAIT',
    label: 'Wait / Pause',
    icon: <Pause size={16} />,
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    description: 'Pause execution until resumed externally',
  },
  {
    type: 'AI_CALL',
    label: 'AI Call',
    icon: <Sparkles size={16} />,
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    description: 'Call Claude AI with a dynamic prompt',
  },
]

interface StepPaletteProps {
  onDragStart?: (type: string) => void
}

const StepPalette: React.FC<StepPaletteProps> = ({ onDragStart }) => {
  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, type: string) => {
    event.dataTransfer.setData('application/flowforge-step-type', type)
    event.dataTransfer.effectAllowed = 'move'
    onDragStart?.(type)
  }

  return (
    <div className="space-y-1.5">
      {stepTypes.map((step) => (
        <div
          key={step.type}
          draggable
          onDragStart={(e) => handleDragStart(e, step.type)}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-grab active:cursor-grabbing transition-all hover:shadow-sm select-none ${step.color}`}
          title={step.description}
        >
          <span className="flex-shrink-0">{step.icon}</span>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{step.label}</p>
            <p className="text-xs opacity-70 truncate">{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default StepPalette
