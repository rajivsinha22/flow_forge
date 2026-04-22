import React, { useEffect, useState } from 'react'
import { FileText, Sparkles, Loader2, Edit3, Save, X, RefreshCw, AlertCircle } from 'lucide-react'
import { getDocs, generateDocs, updateDocs, type WorkflowDoc } from '../../api/workflowDocs'
import ConfirmModal from '../shared/ConfirmModal'
import { formatDistanceToNow } from 'date-fns'

interface WorkflowDocsTabProps {
  workflowId: string
}

function renderMarkdown(md: string): React.ReactNode {
  // Lightweight markdown renderer — supports headings, bold, italic, code, lists, links, paragraphs.
  const lines = md.split('\n')
  const out: React.ReactNode[] = []
  let listBuffer: string[] = []
  let codeBuffer: string[] = []
  let inCode = false

  const flushList = () => {
    if (listBuffer.length === 0) return
    out.push(
      <ul key={`ul-${out.length}`} className="list-disc pl-6 my-2 space-y-1 text-sm text-gray-700">
        {listBuffer.map((it, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(it) }} />
        ))}
      </ul>
    )
    listBuffer = []
  }

  const flushCode = () => {
    if (codeBuffer.length === 0) return
    out.push(
      <pre key={`code-${out.length}`} className="bg-gray-900 text-gray-100 rounded-lg p-3 my-3 text-xs font-mono overflow-x-auto">
        <code>{codeBuffer.join('\n')}</code>
      </pre>
    )
    codeBuffer = []
  }

  function inlineFormat(s: string): string {
    // escape first
    let str = s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    // inline code
    str = str.replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-pink-700 px-1 rounded text-[0.9em] font-mono">$1</code>')
    // bold
    str = str.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    // italic
    str = str.replace(/(^|\s)\*([^*]+)\*/g, '$1<em>$2</em>')
    // links
    str = str.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 underline" target="_blank" rel="noreferrer">$1</a>')
    return str
  }

  for (const raw of lines) {
    const line = raw

    if (line.trim().startsWith('```')) {
      if (inCode) {
        flushCode()
        inCode = false
      } else {
        flushList()
        inCode = true
      }
      continue
    }

    if (inCode) {
      codeBuffer.push(line)
      continue
    }

    if (/^#{1,6}\s/.test(line)) {
      flushList()
      const level = (line.match(/^#+/)?.[0].length) ?? 1
      const text = line.replace(/^#+\s*/, '')
      const cls =
        level === 1 ? 'text-xl font-bold text-gray-900 mt-4 mb-2' :
        level === 2 ? 'text-lg font-bold text-gray-900 mt-4 mb-2' :
        level === 3 ? 'text-base font-semibold text-gray-900 mt-3 mb-1.5' :
        'text-sm font-semibold text-gray-900 mt-3 mb-1'
      out.push(React.createElement(`h${Math.min(level, 6)}`, { key: out.length, className: cls, dangerouslySetInnerHTML: { __html: inlineFormat(text) } }))
      continue
    }

    if (/^\s*[-*]\s+/.test(line)) {
      listBuffer.push(line.replace(/^\s*[-*]\s+/, ''))
      continue
    }

    flushList()

    if (line.trim() === '') {
      continue
    }

    out.push(
      <p key={out.length} className="text-sm text-gray-700 leading-relaxed my-2"
        dangerouslySetInnerHTML={{ __html: inlineFormat(line) }}
      />
    )
  }

  flushList()
  flushCode()
  return out
}

const WorkflowDocsTab: React.FC<WorkflowDocsTabProps> = ({ workflowId }) => {
  const [doc, setDoc] = useState<WorkflowDoc | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showRegenConfirm, setShowRegenConfirm] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      setIsLoading(true)
      setError(null)
      try {
        const d = await getDocs(workflowId)
        if (active) setDoc(d)
      } catch (err: any) {
        if (active) setError(err?.response?.data?.message || 'Failed to load documentation.')
      } finally {
        if (active) setIsLoading(false)
      }
    })()
    return () => { active = false }
  }, [workflowId])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)
    try {
      const d = await generateDocs(workflowId)
      setDoc(d)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to generate documentation.')
    } finally {
      setIsGenerating(false)
      setShowRegenConfirm(false)
    }
  }

  const handleStartEdit = () => {
    if (!doc) return
    setDraft(doc.markdown)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setDraft('')
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const d = await updateDocs(workflowId, draft)
      setDoc(d)
      setIsEditing(false)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save documentation.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Loader2 size={22} className="animate-spin mr-2" />
        <span className="text-sm">Loading documentation...</span>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mb-4">
          <FileText size={24} className="text-violet-600" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">No documentation yet</h3>
        <p className="text-sm text-gray-500 max-w-md mb-5">
          Use AI to automatically generate a first draft of documentation for this workflow based on its steps and configuration.
        </p>
        {error && (
          <div className="mb-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <AlertCircle size={14} /> {error}
          </div>
        )}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50"
        >
          {isGenerating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          Generate Documentation
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Metadata bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4 pb-4 border-b border-gray-100">
        <div className="text-xs text-gray-500 space-y-0.5">
          <div>
            Last generated:{' '}
            <span className="text-gray-700 font-medium">
              {formatDistanceToNow(new Date(doc.generatedAt), { addSuffix: true })}
            </span>
          </div>
          {doc.editedBy && doc.editedAt && (
            <div>
              Last edited by <span className="text-gray-700 font-medium">{doc.editedBy}</span>{' '}
              {formatDistanceToNow(new Date(doc.editedAt), { addSuffix: true })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={handleStartEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Edit3 size={13} /> Edit
              </button>
              <button
                onClick={() => setShowRegenConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                <RefreshCw size={13} /> Regenerate
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <X size={13} /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Save
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {isEditing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full min-h-[500px] font-mono text-xs border border-gray-300 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Write markdown here..."
        />
      ) : (
        <div className="prose prose-sm max-w-none">
          {renderMarkdown(doc.markdown)}
        </div>
      )}

      <ConfirmModal
        isOpen={showRegenConfirm}
        title="Regenerate documentation?"
        message="This will overwrite your edits. Continue?"
        confirmLabel="Regenerate"
        variant="warning"
        onConfirm={handleGenerate}
        onCancel={() => setShowRegenConfirm(false)}
        isLoading={isGenerating}
      />
    </div>
  )
}

export default WorkflowDocsTab
