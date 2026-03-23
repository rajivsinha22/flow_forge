import React, { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Plus, Trash2, Code2, Database, Globe, BookOpen,
  Copy, CheckCheck, ChevronDown, ChevronRight,
  Settings2, Zap, AlertCircle, Hash,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HttpService {
  id: string
  name: string
  baseUrl: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers: Record<string, string>
  authType: 'NONE' | 'BEARER' | 'BASIC' | 'API_KEY'
  authValue?: string
  apiKeyHeader?: string
}

export interface DbConnection {
  id: string
  name: string
  type: 'MONGODB' | 'MYSQL'
  host: string
  port: number
  database: string
  username?: string
  passwordEnvVar?: string
  collection?: string
}

export interface ScriptStepConfigShape {
  script?: string
  timeout?: number
  httpServices?: HttpService[]
  dbConnections?: DbConnection[]
  outputMapping?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_SCRIPT = `// Workflow context is available via 'ctx'
// HTTP services are accessible via 'http'
// Database connections are accessible via 'db'
// Return an object — it becomes this step's output

const input = ctx.input
const prevOutput = ctx.steps['prev-step-id']?.output

// Example: call a configured HTTP service
// const res = await http.services.myApi.get('/users/' + input.userId)

// Example: query MongoDB
// const user = await db.connections.myMongo.findOne('users', { _id: input.userId })

// Example: query MySQL
// const rows = await db.connections.myDb.query('SELECT * FROM orders WHERE id = ?', [input.orderId])

return {
  processed: true,
  data: input,
}`

const CONTEXT_SNIPPETS = [
  { label: 'Workflow Input',       code: 'ctx.input',                           desc: 'The workflow trigger payload'        },
  { label: 'Previous Step Output', code: "ctx.steps['step-id'].output",         desc: 'Output from a prior step'           },
  { label: 'All Step Outputs',     code: 'ctx.steps',                           desc: 'Map of stepId → step result'        },
  { label: 'Script Variable',      code: "ctx.variables['MY_VAR']",             desc: 'SCRIPT_MY_VAR env variable'         },
  { label: 'Execution ID',         code: 'ctx.executionId',                     desc: 'Current execution identifier'       },
  { label: 'Workflow Name',        code: 'ctx.workflowName',                    desc: 'Name of this workflow'              },
]

const HTTP_SNIPPETS = [
  { label: 'GET',          code: "const res = await http.services.myApi.get('/path')\nconst data = res.data",                                 desc: 'GET from a configured service'  },
  { label: 'POST',         code: "const res = await http.services.myApi.post('/path', { key: 'value' })\nconst data = res.data",              desc: 'POST JSON body'                 },
  { label: 'Error handle', code: "try {\n  const res = await http.services.myApi.get('/path')\n  return { ok: true, data: res.data }\n} catch (err) {\n  return { ok: false, error: err.message }\n}", desc: 'With try/catch' },
]

const DB_SNIPPETS = [
  { label: 'Mongo findOne',   code: "const doc = await db.connections.myMongo.findOne(\n  'users',\n  { _id: ctx.input.id }\n)",                                               desc: 'Single MongoDB doc'    },
  { label: 'Mongo find',      code: "const docs = await db.connections.myMongo.find(\n  'orders',\n  { status: 'active' },\n  { limit: 50 }\n)",                               desc: 'Multiple MongoDB docs' },
  { label: 'Mongo insert',    code: "const result = await db.connections.myMongo.insertOne(\n  'events',\n  { type: 'LOGIN', ts: new Date() }\n)",                             desc: 'Insert MongoDB doc'    },
  { label: 'MySQL SELECT',    code: "const rows = await db.connections.myDb.query(\n  'SELECT * FROM users WHERE status = ? AND org = ?',\n  ['active', ctx.input.orgId]\n)", desc: 'MySQL SELECT rows'     },
  { label: 'MySQL INSERT',    code: "const r = await db.connections.myDb.execute(\n  'INSERT INTO events (type, payload) VALUES (?, ?)',\n  [ctx.triggeredBy, JSON.stringify(ctx.input)]\n)", desc: 'MySQL INSERT' },
  { label: 'MySQL UPDATE',    code: "await db.connections.myDb.execute(\n  'UPDATE users SET status = ? WHERE id = ?',\n  ['active', ctx.input.userId]\n)",                   desc: 'MySQL UPDATE'          },
]

const EXAMPLE_SCRIPTS = [
  {
    title: 'Transform & Enrich',
    description: 'Reshape previous step output and add computed fields',
    code: `const orders = ctx.steps['fetch-orders'].output.items ?? []

const enriched = orders.map(order => ({
  ...order,
  totalValue: order.quantity * order.unitPrice,
  isHighValue: order.quantity * order.unitPrice > 1000,
  processedAt: new Date().toISOString(),
}))

return {
  count: enriched.length,
  highValueCount: enriched.filter(o => o.isHighValue).length,
  items: enriched,
}`,
  },
  {
    title: 'HTTP + DB Lookup',
    description: 'Fetch user from API, cross-reference with database',
    code: `const userId = ctx.input.userId

// Fetch from external API
const apiRes = await http.services.userApi.get('/users/' + userId)
const user = apiRes.data

// Cross-reference with internal DB
const dbUser = await db.connections.mainDb.findOne('users', { externalId: userId })

return {
  userId,
  externalProfile: user,
  internalRecord: dbUser,
  isSynced: dbUser?.email === user.email,
}`,
  },
  {
    title: 'Conditional Logic',
    description: 'Return different outputs based on runtime data',
    code: `const { status, amount, region } = ctx.input

if (!status || !amount) {
  return { valid: false, reason: 'Missing required fields' }
}

const isHighRisk = amount > 50000 || region === 'RESTRICTED'

return {
  valid: true,
  needsApproval: isHighRisk,
  riskLevel: isHighRisk ? 'HIGH' : 'STANDARD',
  nextAction: isHighRisk ? 'ROUTE_TO_APPROVAL' : 'AUTO_PROCESS',
}`,
  },
  {
    title: 'Batch DB Write',
    description: 'Process a list and persist results to MySQL',
    code: `const records = ctx.steps['parse-csv'].output.rows ?? []
const inserted = []

for (const row of records) {
  const result = await db.connections.analyticsDb.execute(
    'INSERT INTO metrics (event_type, value, ts) VALUES (?, ?, NOW())',
    [row.event, row.value]
  )
  inserted.push(result.insertId)
}

return { written: inserted.length, insertedIds: inserted }`,
  },
]

// ─── Utility ──────────────────────────────────────────────────────────────────

const CopyBtn: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1600) }}
      className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors"
      title="Copy"
    >
      {copied ? <CheckCheck size={11} className="text-green-400" /> : <Copy size={11} />}
    </button>
  )
}

// ─── Code Editor (line numbers + tab support) ─────────────────────────────────

const CodeEditor: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const taRef   = useRef<HTMLTextAreaElement>(null)
  const numRef  = useRef<HTMLDivElement>(null)
  const lines   = (value.match(/\n/g) || []).length + 1

  const syncScroll = () => {
    if (taRef.current && numRef.current) numRef.current.scrollTop = taRef.current.scrollTop
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Tab') return
    e.preventDefault()
    const ta = e.currentTarget
    const s = ta.selectionStart, end = ta.selectionEnd
    const next = value.substring(0, s) + '  ' + value.substring(end)
    onChange(next)
    requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2 })
  }

  return (
    <div className="flex h-full overflow-hidden rounded-xl border border-gray-700/60"
         style={{ fontFamily: "'Fira Code','Cascadia Code','Consolas',monospace", fontSize: 13, lineHeight: '1.65' }}>
      {/* Line numbers */}
      <div ref={numRef}
           className="select-none overflow-hidden bg-gray-900 text-gray-600 text-right px-3 pt-3 pb-3 shrink-0 min-w-[2.8rem]"
           style={{ fontSize: 13, lineHeight: '1.65', pointerEvents: 'none' }}
           aria-hidden>
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} style={{ lineHeight: '1.65' }}>{i + 1}</div>
        ))}
      </div>
      {/* Textarea */}
      <textarea
        ref={taRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onScroll={syncScroll}
        onKeyDown={onKeyDown}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        className="flex-1 resize-none bg-gray-950 text-gray-100 px-4 pt-3 pb-3 focus:outline-none"
        style={{ fontSize: 13, lineHeight: '1.65', caretColor: '#60a5fa' }}
      />
    </div>
  )
}

// ─── HTTP Service Form ────────────────────────────────────────────────────────

const HttpServiceForm: React.FC<{ svc: HttpService; onChange: (s: HttpService) => void; onDelete: () => void }> = ({ svc, onChange, onDelete }) => {
  const [open, setOpen]         = useState(true)
  const [showAuth, setShowAuth] = useState(false)
  const entries = Object.entries(svc.headers || {})

  const addHeader    = () => onChange({ ...svc, headers: { ...svc.headers, '': '' } })
  const updateHeader = (old: string, k: string, v: string) => { const h = { ...svc.headers }; delete h[old]; h[k] = v; onChange({ ...svc, headers: h }) }
  const removeHeader = (k: string) => { const h = { ...svc.headers }; delete h[k]; onChange({ ...svc, headers: h }) }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
          <span className="text-xs font-semibold text-gray-800 truncate">{svc.name || 'Unnamed Service'}</span>
          <span className="text-[10px] text-gray-400 font-mono shrink-0 truncate max-w-[160px]">{svc.method} {svc.baseUrl || '—'}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1 text-gray-400 hover:text-red-500 rounded"><Trash2 size={12} /></button>
          {open ? <ChevronDown size={13} className="text-gray-400" /> : <ChevronRight size={13} className="text-gray-400" />}
        </div>
      </div>

      {open && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Service Name <span className="text-red-400">*</span></label>
              <input value={svc.name} placeholder="myApi" onChange={e => onChange({ ...svc, name: e.target.value.replace(/\s/g, '') })}
                className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-[10px] text-gray-400 mt-0.5">Access as <code className="bg-gray-100 px-0.5 rounded">http.services.<span className="text-blue-600">{svc.name || 'name'}</span></code></p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Default Method</label>
              <select value={svc.method} onChange={e => onChange({ ...svc, method: e.target.value as HttpService['method'] })}
                className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['GET','POST','PUT','PATCH','DELETE'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Base URL <span className="text-red-400">*</span></label>
            <input value={svc.baseUrl} placeholder="https://api.example.com" onChange={e => onChange({ ...svc, baseUrl: e.target.value })}
              className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-600">Auth</label>
              <button onClick={() => setShowAuth(!showAuth)} className="text-[10px] text-blue-600 hover:text-blue-700">{showAuth ? 'Hide' : 'Configure'}</button>
            </div>
            <select value={svc.authType} onChange={e => onChange({ ...svc, authType: e.target.value as HttpService['authType'] })}
              className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="NONE">No Auth</option>
              <option value="BEARER">Bearer Token</option>
              <option value="BASIC">Basic Auth</option>
              <option value="API_KEY">API Key Header</option>
            </select>
            {showAuth && svc.authType !== 'NONE' && (
              <div className="mt-2 space-y-2">
                {svc.authType === 'API_KEY' && (
                  <input placeholder="Header name (e.g. X-Api-Key)" value={svc.apiKeyHeader || ''} onChange={e => onChange({ ...svc, apiKeyHeader: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                )}
                <input type="password" placeholder={svc.authType === 'BASIC' ? 'user:password (Base64)' : 'Token value'} value={svc.authValue || ''} onChange={e => onChange({ ...svc, authValue: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <p className="text-[10px] text-amber-600 flex items-center gap-1"><AlertCircle size={10} /> Use <code className="bg-amber-50 px-0.5 rounded font-mono">{'${SCRIPT_MY_TOKEN}'}</code> instead of raw secrets.</p>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-600">Default Headers</label>
              <button onClick={addHeader} className="text-[10px] text-blue-600 hover:text-blue-700 flex items-center gap-0.5"><Plus size={10} /> Add</button>
            </div>
            {entries.length === 0 && <p className="text-[10px] text-gray-400 italic">No headers configured</p>}
            <div className="space-y-1.5">
              {entries.map(([k, v], i) => (
                <div key={i} className="flex gap-1.5">
                  <input placeholder="Key" value={k} onChange={e => updateHeader(k, e.target.value, v)} className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  <input placeholder="Value" value={v} onChange={e => updateHeader(k, k, e.target.value)} className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  <button onClick={() => removeHeader(k)} className="text-red-400 hover:text-red-600"><Trash2 size={11} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── DB Connection Form ───────────────────────────────────────────────────────

const DbConnectionForm: React.FC<{ conn: DbConnection; onChange: (c: DbConnection) => void; onDelete: () => void }> = ({ conn, onChange, onDelete }) => {
  const [open, setOpen] = useState(true)
  const isMongo = conn.type === 'MONGODB'

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-2 h-2 rounded-full shrink-0 ${isMongo ? 'bg-green-500' : 'bg-blue-500'}`} />
          <span className="text-xs font-semibold text-gray-800 truncate">{conn.name || 'Unnamed Connection'}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${isMongo ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{isMongo ? 'MongoDB' : 'MySQL'}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1 text-gray-400 hover:text-red-500 rounded"><Trash2 size={12} /></button>
          {open ? <ChevronDown size={13} className="text-gray-400" /> : <ChevronRight size={13} className="text-gray-400" />}
        </div>
      </div>

      {open && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Connection Name <span className="text-red-400">*</span></label>
              <input value={conn.name} placeholder="mainDb" onChange={e => onChange({ ...conn, name: e.target.value.replace(/\s/g, '') })}
                className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-[10px] text-gray-400 mt-0.5">Access as <code className="bg-gray-100 px-0.5 rounded">db.connections.<span className="text-blue-600">{conn.name || 'name'}</span></code></p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">DB Type</label>
              <select value={conn.type} onChange={e => onChange({ ...conn, type: e.target.value as DbConnection['type'] })}
                className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="MONGODB">MongoDB</option>
                <option value="MYSQL">MySQL</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Host</label>
              <input value={conn.host} placeholder={isMongo ? 'localhost' : 'db.example.com'} onChange={e => onChange({ ...conn, host: e.target.value })}
                className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Port</label>
              <input type="number" value={conn.port || (isMongo ? 27017 : 3306)} onChange={e => onChange({ ...conn, port: parseInt(e.target.value) })}
                className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Database</label>
              <input value={conn.database} placeholder={isMongo ? 'myDatabase' : 'my_database'} onChange={e => onChange({ ...conn, database: e.target.value })}
                className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
              <input value={conn.username || ''} placeholder="dbuser" onChange={e => onChange({ ...conn, username: e.target.value })}
                className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Password Env Var</label>
            <input value={conn.passwordEnvVar || ''} placeholder="SCRIPT_DB_PASSWORD" onChange={e => onChange({ ...conn, passwordEnvVar: e.target.value })}
              className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1"><AlertCircle size={10} className="text-amber-500" /> Set env var prefixed with <code className="bg-gray-100 px-0.5 rounded font-mono">SCRIPT_</code> in Settings → Env Variables.</p>
          </div>

          {isMongo && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Default Collection <span className="text-gray-400 font-normal">(optional)</span></label>
              <input value={conn.collection || ''} placeholder="users" onChange={e => onChange({ ...conn, collection: e.target.value })}
                className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

type ModalTab = 'code' | 'services' | 'database' | 'settings'
type HelperTab = 'Context' | 'HTTP' | 'DB' | 'Examples'

const ScriptModal: React.FC<{
  config: ScriptStepConfigShape
  onChange: (c: ScriptStepConfigShape) => void
  onClose: () => void
}> = ({ config, onChange, onClose }) => {
  const [tab, setTab]           = useState<ModalTab>('code')
  const [helperTab, setHelperTab] = useState<HelperTab>('Context')
  const [helperOpen, setHelperOpen] = useState(true)

  const script        = config.script        ?? DEFAULT_SCRIPT
  const httpServices  = config.httpServices  ?? []
  const dbConnections = config.dbConnections ?? []

  const update = (patch: Partial<ScriptStepConfigShape>) => onChange({ ...config, ...patch })

  const lineCount = (script.match(/\n/g) || []).length + 1
  const charCount = script.length

  // Insert snippet at cursor position inside the CodeEditor textarea
  const insertSnippet = useCallback((code: string) => {
    const ta = document.querySelector<HTMLTextAreaElement>('.script-modal-editor textarea')
    if (!ta) { update({ script: (script ? script + '\n\n' : '') + code }); return }
    const s = ta.selectionStart ?? script.length
    const e = ta.selectionEnd   ?? script.length
    update({ script: script.substring(0, s) + code + script.substring(e) })
    requestAnimationFrame(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = s + code.length })
  }, [script, config, onChange])

  const addHttpService = () => {
    const svc: HttpService = { id: crypto.randomUUID(), name: `service${httpServices.length + 1}`, baseUrl: '', method: 'GET', headers: {}, authType: 'NONE' }
    update({ httpServices: [...httpServices, svc] })
  }
  const addDbConnection = () => {
    const conn: DbConnection = { id: crypto.randomUUID(), name: `db${dbConnections.length + 1}`, type: 'MONGODB', host: '', port: 27017, database: '' }
    update({ dbConnections: [...dbConnections, conn] })
  }

  const TABS: { id: ModalTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'code',     label: 'Code',         icon: <Code2 size={13} /> },
    { id: 'services', label: 'HTTP Services', icon: <Globe size={13} />,    badge: httpServices.length  },
    { id: 'database', label: 'Database',      icon: <Database size={13} />, badge: dbConnections.length },
    { id: 'settings', label: 'Settings',      icon: <Settings2 size={13} /> },
  ]

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-0 bg-gray-900 border-b border-gray-800 shrink-0" style={{ minHeight: 52 }}>
        {/* Left: badge + tabs */}
        <div className="flex items-center gap-0">
          {/* Title badge */}
          <div className="flex items-center gap-2 pr-5 mr-1 border-r border-gray-800">
            <div className="flex items-center gap-1.5 bg-green-500/15 border border-green-500/25 rounded-lg px-2.5 py-1">
              <Code2 size={13} className="text-green-400" />
              <span className="text-xs font-bold text-green-300 tracking-wide">Script Step</span>
            </div>
          </div>
          {/* Tab buttons */}
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 h-[52px] text-xs font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-green-500 text-green-400 bg-gray-800/50'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.icon}
              {t.label}
              {t.badge != null && t.badge > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                  tab === t.id ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'
                }`}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Right: helper toggle + close */}
        <div className="flex items-center gap-2">
          {tab === 'code' && (
            <button
              onClick={() => setHelperOpen(!helperOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                helperOpen ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <BookOpen size={12} /> Helper
            </button>
          )}
          <button onClick={onClose} className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700 transition-colors">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── CODE TAB ──────────────────────────────────────────────────────── */}
        {tab === 'code' && (
          <>
            {/* Editor */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="script-modal-editor flex-1 p-4 overflow-hidden" style={{ minHeight: 0 }}>
                <CodeEditor value={script} onChange={v => update({ script: v })} />
              </div>
              {/* Editor footer */}
              <div className="flex items-center justify-between px-5 py-2.5 bg-gray-900 border-t border-gray-800 shrink-0">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Hash size={10} /> {lineCount} lines · {charCount} chars</span>
                  <span className="text-gray-700">|</span>
                  <span>Timeout: <strong className="text-gray-400">{config.timeout ?? 30}s</strong></span>
                  {config.outputMapping && <span>Output key: <code className="text-gray-400 font-mono">{config.outputMapping}</code></span>}
                </div>
                <button onClick={onClose}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-semibold transition-colors">
                  <CheckCheck size={12} /> Save & Close
                </button>
              </div>
            </div>

            {/* Helper sidebar */}
            {helperOpen && (
              <div className="w-72 flex flex-col border-l border-gray-800 bg-gray-900 shrink-0 overflow-hidden">
                {/* Helper tab bar */}
                <div className="flex border-b border-gray-800 shrink-0">
                  {(['Context','HTTP','DB','Examples'] as HelperTab[]).map(ht => (
                    <button key={ht} onClick={() => setHelperTab(ht)}
                      className={`flex-1 py-2 text-[11px] font-medium transition-colors ${
                        helperTab === ht ? 'text-blue-400 border-b-2 border-blue-500 bg-gray-800' : 'text-gray-600 hover:text-gray-400'
                      }`}>{ht}</button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
                  <p className="text-[10px] text-gray-600 mb-2 px-1">Click any snippet to insert at cursor</p>

                  {helperTab === 'Context' && CONTEXT_SNIPPETS.map(s => (
                    <div key={s.label} onClick={() => insertSnippet(s.code)}
                      className="group cursor-pointer rounded-lg border border-gray-700/60 hover:border-blue-500/50 bg-gray-800/60 hover:bg-gray-800 p-2.5 transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-gray-200">{s.label}</span>
                        <Zap size={10} className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <code className="text-[11px] text-green-400 font-mono block mb-0.5">{s.code}</code>
                      <span className="text-[10px] text-gray-500">{s.desc}</span>
                    </div>
                  ))}

                  {helperTab === 'HTTP' && HTTP_SNIPPETS.map(s => (
                    <div key={s.label} onClick={() => insertSnippet(s.code)}
                      className="group cursor-pointer rounded-lg border border-gray-700/60 hover:border-blue-500/50 bg-gray-800/60 hover:bg-gray-800 p-2.5 transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-gray-200">{s.label}</span>
                        <Zap size={10} className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <pre className="text-[10px] text-green-400 font-mono whitespace-pre-wrap mb-0.5">{s.code}</pre>
                      <span className="text-[10px] text-gray-500">{s.desc}</span>
                    </div>
                  ))}

                  {helperTab === 'DB' && DB_SNIPPETS.map(s => (
                    <div key={s.label} onClick={() => insertSnippet(s.code)}
                      className="group cursor-pointer rounded-lg border border-gray-700/60 hover:border-blue-500/50 bg-gray-800/60 hover:bg-gray-800 p-2.5 transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-gray-200">{s.label}</span>
                        <Zap size={10} className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <pre className="text-[10px] text-green-400 font-mono whitespace-pre-wrap mb-0.5">{s.code}</pre>
                      <span className="text-[10px] text-gray-500">{s.desc}</span>
                    </div>
                  ))}

                  {helperTab === 'Examples' && EXAMPLE_SCRIPTS.map(ex => (
                    <div key={ex.title} className="rounded-lg border border-gray-700/60 bg-gray-800/60 overflow-hidden">
                      <div className="flex items-start justify-between gap-2 px-3 py-2 border-b border-gray-700/60">
                        <div>
                          <p className="text-[11px] font-semibold text-gray-200">{ex.title}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{ex.description}</p>
                        </div>
                        <button onClick={() => update({ script: ex.code })}
                          className="shrink-0 text-[10px] px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors">
                          Use
                        </button>
                      </div>
                      <pre className="text-[10px] text-gray-500 font-mono p-2.5 overflow-x-auto whitespace-pre max-h-28 overflow-y-auto">{ex.code}</pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── SERVICES TAB ──────────────────────────────────────────────────── */}
        {tab === 'services' && (
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">HTTP Services</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Configure external APIs accessible in your script via <code className="bg-gray-100 text-blue-600 px-1 rounded font-mono">http.services.name</code></p>
                </div>
                <button onClick={addHttpService}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors">
                  <Plus size={12} /> Add Service
                </button>
              </div>
              {httpServices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-200 rounded-2xl bg-white">
                  <Globe size={28} className="text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-400">No HTTP services configured</p>
                  <p className="text-xs text-gray-300 mt-1">Add a service to call external APIs from your script</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {httpServices.map(svc => (
                    <HttpServiceForm key={svc.id} svc={svc}
                      onChange={s => update({ httpServices: httpServices.map(x => x.id === svc.id ? s : x) })}
                      onDelete={() => update({ httpServices: httpServices.filter(x => x.id !== svc.id) })} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── DATABASE TAB ──────────────────────────────────────────────────── */}
        {tab === 'database' && (
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Database Connections</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Connect MongoDB or MySQL, accessible via <code className="bg-gray-100 text-blue-600 px-1 rounded font-mono">db.connections.name</code></p>
                </div>
                <button onClick={addDbConnection}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors">
                  <Plus size={12} /> Add Connection
                </button>
              </div>
              {dbConnections.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-200 rounded-2xl bg-white">
                  <Database size={28} className="text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-400">No database connections</p>
                  <p className="text-xs text-gray-300 mt-1">Add MongoDB or MySQL connections to query from your script</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dbConnections.map(conn => (
                    <DbConnectionForm key={conn.id} conn={conn}
                      onChange={c => update({ dbConnections: dbConnections.map(x => x.id === conn.id ? c : x) })}
                      onDelete={() => update({ dbConnections: dbConnections.filter(x => x.id !== conn.id) })} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SETTINGS TAB ──────────────────────────────────────────────────── */}
        {tab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            <div className="max-w-xl mx-auto space-y-5">
              <h3 className="text-sm font-semibold text-gray-900">Script Settings</h3>

              {/* Timeout */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <label className="block text-sm font-semibold text-gray-800 mb-1">Execution Timeout</label>
                <div className="flex items-center gap-3">
                  <input type="number" min={1} max={60} value={config.timeout ?? 30}
                    onChange={e => update({ timeout: parseInt(e.target.value) || 30 })}
                    className="w-24 text-sm border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <span className="text-sm text-gray-500">seconds <span className="text-gray-400">(max 60)</span></span>
                </div>
                <p className="text-xs text-gray-400 mt-2">Script is forcefully terminated if it exceeds this duration. All open DB connections are closed automatically.</p>
              </div>

              {/* Output key */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <label className="block text-sm font-semibold text-gray-800 mb-1">Output Mapping Key <span className="text-gray-400 font-normal">(optional)</span></label>
                <input value={config.outputMapping ?? ''} placeholder="Defaults to the step ID"
                  onChange={e => update({ outputMapping: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-gray-400 mt-2">The key under which this step's return value is stored in <code className="bg-gray-100 px-1 rounded">ctx.steps</code>.</p>
              </div>

              {/* Runtime API reference */}
              <div className="rounded-2xl bg-gray-950 border border-gray-800 p-5">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Runtime API</p>
                <div className="space-y-2">
                  {[
                    { obj: 'ctx.input',                     desc: 'Workflow trigger payload'                    },
                    { obj: "ctx.steps['id'].output",         desc: 'Output from a previous step'                },
                    { obj: "ctx.variables['MY_VAR']",        desc: 'SCRIPT_MY_VAR env variable (prefix removed)' },
                    { obj: 'http.services.name.get(path)',   desc: 'GET via a configured HTTP service'           },
                    { obj: 'http.services.name.post(path,body)', desc: 'POST via a configured HTTP service'      },
                    { obj: 'db.connections.name.findOne(…)', desc: 'MongoDB — find single document'             },
                    { obj: 'db.connections.name.find(…)',    desc: 'MongoDB — find multiple documents'          },
                    { obj: 'db.connections.name.query(…)',   desc: 'MySQL — parameterised SELECT'               },
                    { obj: 'db.connections.name.execute(…)', desc: 'MySQL — INSERT / UPDATE / DELETE'           },
                  ].map(r => (
                    <div key={r.obj} className="flex items-start gap-2 py-1.5 border-b border-gray-800/50 last:border-0">
                      <code className="text-[11px] text-green-400 font-mono shrink-0">{r.obj}</code>
                      <span className="text-[10px] text-gray-600 mt-0.5">{r.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security note */}
              <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5">
                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-800">Security notice</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Scripts run in a Groovy sandbox. OS commands, file access, and reflection are blocked.
                    Only <code className="bg-amber-100 px-0.5 rounded font-mono">SCRIPT_*</code> prefixed environment variables are visible.
                    DB passwords are resolved server-side and never sent to the browser.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

// ─── Main Component (side-panel entry point) ──────────────────────────────────

const ScriptStepConfig: React.FC<{
  config: Record<string, unknown>
  onChange: (c: Record<string, unknown>) => void
}> = ({ config, onChange }) => {
  const [open, setOpen] = useState(false)

  const sc             = config as ScriptStepConfigShape
  const lineCount      = ((sc.script ?? '').match(/\n/g) || []).length + 1
  const serviceCount   = (sc.httpServices  ?? []).length
  const dbCount        = (sc.dbConnections ?? []).length
  const hasScript      = (sc.script ?? '').trim().length > 0

  return (
    <>
      {/* ── Single button shown in the step config panel ──────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {/* Status strip */}
        {hasScript && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-950 border-b border-gray-800">
            <span className="text-[11px] text-gray-500 font-mono">{lineCount} lines</span>
            {serviceCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-900/50 text-blue-400 font-semibold">
                {serviceCount} HTTP
              </span>
            )}
            {dbCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-900/50 text-green-400 font-semibold">
                {dbCount} DB
              </span>
            )}
          </div>
        )}

        {/* Open button */}
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-4 bg-gray-950 hover:bg-gray-900 transition-colors group"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-green-500/15 border border-green-500/25 group-hover:bg-green-500/25 transition-colors">
            <Code2 size={15} className="text-green-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-200">
              {hasScript ? 'Open Script Editor' : 'Write Script'}
            </p>
            <p className="text-[11px] text-gray-600">
              {hasScript ? 'Edit code, services & database' : 'Click to open the script editor'}
            </p>
          </div>
        </button>
      </div>

      {/* ── Full-screen modal ──────────────────────────────────────────────── */}
      {open && (
        <ScriptModal
          config={sc}
          onChange={c => onChange(c as Record<string, unknown>)}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

export default ScriptStepConfig
