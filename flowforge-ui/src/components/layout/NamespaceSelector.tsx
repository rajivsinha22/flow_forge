import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Layers } from 'lucide-react'
import { useNamespaceStore } from '../../store/namespaceStore'

const NamespaceSelector: React.FC = () => {
  const { namespaces, currentNamespace, setCurrentNamespace, fetchNamespaces } = useNamespaceStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchNamespaces() }, [fetchNamespaces])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const currentDisplay = namespaces.find(n => n.name === currentNamespace)?.displayName || currentNamespace

  return (
    <div ref={ref} className="relative px-3 py-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors text-xs"
      >
        <Layers size={12} className="text-gray-400 flex-shrink-0" />
        <span className="flex-1 text-left text-gray-700 font-medium truncate">{currentDisplay}</span>
        <ChevronDown size={12} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-50 py-1 max-h-48 overflow-y-auto">
          {namespaces.map((ns) => (
            <button
              key={ns.name}
              onClick={() => { setCurrentNamespace(ns.name); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${
                ns.name === currentNamespace ? 'text-blue-600 font-medium' : 'text-gray-700'
              }`}
            >
              <span className="flex-1 text-left truncate">{ns.displayName}</span>
              {ns.name === currentNamespace && <Check size={12} className="text-blue-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default NamespaceSelector
