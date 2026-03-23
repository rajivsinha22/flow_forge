import React, { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'

interface JsonViewerProps {
  data: unknown
  depth?: number
  initialExpanded?: boolean
}

const JsonValue: React.FC<{ value: unknown; depth: number; initialExpanded: boolean }> = ({
  value,
  depth,
  initialExpanded,
}) => {
  const [expanded, setExpanded] = useState(initialExpanded && depth < 3)

  if (value === null) return <span className="text-gray-400">null</span>
  if (value === undefined) return <span className="text-gray-400">undefined</span>
  if (typeof value === 'boolean')
    return <span className="text-purple-600">{value.toString()}</span>
  if (typeof value === 'number') return <span className="text-blue-600">{value}</span>
  if (typeof value === 'string')
    return <span className="text-green-700">"{value}"</span>

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-gray-600">[]</span>
    return (
      <span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center text-gray-500 hover:text-gray-700"
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="text-gray-600 text-xs ml-0.5">[{value.length}]</span>
        </button>
        {expanded && (
          <div className="ml-4 border-l border-gray-200 pl-2">
            {value.map((item, i) => (
              <div key={i} className="flex gap-1">
                <span className="text-gray-400 text-xs select-none">{i}:</span>
                <JsonValue value={item} depth={depth + 1} initialExpanded={initialExpanded} />
              </div>
            ))}
          </div>
        )}
      </span>
    )
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>)
    if (keys.length === 0) return <span className="text-gray-600">{'{}'}</span>
    return (
      <span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center text-gray-500 hover:text-gray-700"
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="text-gray-600 text-xs ml-0.5">{`{${keys.length}}`}</span>
        </button>
        {expanded && (
          <div className="ml-4 border-l border-gray-200 pl-2">
            {keys.map((key) => (
              <div key={key} className="flex gap-1 flex-wrap">
                <span className="text-red-700 text-xs font-medium">"{key}":</span>
                <JsonValue
                  value={(value as Record<string, unknown>)[key]}
                  depth={depth + 1}
                  initialExpanded={initialExpanded}
                />
              </div>
            ))}
          </div>
        )}
      </span>
    )
  }

  return <span className="text-gray-700">{String(value)}</span>
}

const JsonViewer: React.FC<JsonViewerProps> = ({ data, depth = 0, initialExpanded = true }) => {
  return (
    <div className="font-mono text-xs leading-5 bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-96">
      <JsonValue value={data} depth={depth} initialExpanded={initialExpanded} />
    </div>
  )
}

export default JsonViewer
