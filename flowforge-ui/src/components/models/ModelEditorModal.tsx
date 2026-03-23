import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Plus, Trash2, ChevronDown, ChevronUp, CheckCircle2,
  AlertTriangle, Copy, Eye, Code2, List, FlaskConical,
  Braces, SquareStack, ChevronRight,
} from 'lucide-react'
import {
  type SchemaField, type DataModel, type DataModelRequest, type FieldType,
  type ArrayItemsDef,
  fieldsToJsonSchema, jsonSchemaToFields,
} from '../../api/models'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

interface ModelEditorModalProps {
  model?: DataModel | null
  onSave: (req: DataModelRequest) => Promise<void>
  onClose: () => void
}

export const FIELD_TYPES: { value: FieldType; label: string; color: string; bg: string }[] = [
  { value: 'string',  label: 'string',  color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  { value: 'number',  label: 'number',  color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200' },
  { value: 'integer', label: 'integer', color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200' },
  { value: 'boolean', label: 'boolean', color: 'text-violet-700',  bg: 'bg-violet-50 border-violet-200' },
  { value: 'object',  label: 'object',  color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
  { value: 'array',   label: 'array',   color: 'text-orange-700',  bg: 'bg-orange-50 border-orange-200' },
]

const STRING_FORMATS = ['', 'email', 'uuid', 'uri', 'date', 'date-time', 'time', 'ipv4', 'ipv6']

const emptyField = (): SchemaField => ({ name: '', type: 'string', required: false })

type Tab = 'builder' | 'json' | 'preview' | 'test'

// ─────────────────────────────────────────────────────────────────────────────
// TypeBadge
// ─────────────────────────────────────────────────────────────────────────────

const TypeBadge: React.FC<{ type: FieldType; size?: 'sm' | 'xs' }> = ({ type, size = 'sm' }) => {
  const info = FIELD_TYPES.find(t => t.value === type)
  return (
    <span className={`inline-flex items-center gap-0.5 border rounded font-mono font-semibold flex-shrink-0 ${
      info ? `${info.color} ${info.bg}` : 'text-gray-600 bg-gray-100 border-gray-200'
    } ${size === 'xs' ? 'text-[9px] px-1 py-0' : 'text-[10px] px-1.5 py-0.5'}`}>
      {(type === 'object') && <Braces size={size === 'xs' ? 8 : 9} />}
      {(type === 'array')  && <SquareStack size={size === 'xs' ? 8 : 9} />}
      {type}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// NestedFieldsEditor — renders a compact list of sub-fields
// ─────────────────────────────────────────────────────────────────────────────

interface NestedFieldsEditorProps {
  fields: SchemaField[]
  onChange: (fields: SchemaField[]) => void
  title: string
  accent?: 'amber' | 'orange' | 'blue'
  depth?: number
}

const NestedFieldsEditor: React.FC<NestedFieldsEditorProps> = ({
  fields, onChange, title, accent = 'blue', depth = 0,
}) => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const accentStyle = {
    amber:  { border: 'border-amber-200',  bg: 'bg-amber-50',  header: 'text-amber-700 bg-amber-100', dot: 'bg-amber-400' },
    orange: { border: 'border-orange-200', bg: 'bg-orange-50', header: 'text-orange-700 bg-orange-100', dot: 'bg-orange-400' },
    blue:   { border: 'border-blue-200',   bg: 'bg-blue-50',   header: 'text-blue-700 bg-blue-100',   dot: 'bg-blue-400' },
  }[accent]

  const addField = () => {
    onChange([...fields, emptyField()])
    setExpandedIdx(fields.length)
  }
  const removeField = (i: number) => {
    onChange(fields.filter((_, idx) => idx !== i))
    if (expandedIdx === i) setExpandedIdx(null)
    else if (expandedIdx !== null && expandedIdx > i) setExpandedIdx(expandedIdx - 1)
  }
  const updateField = (i: number, patch: Partial<SchemaField>) =>
    onChange(fields.map((f, idx) => idx === i ? { ...f, ...patch } : f))

  return (
    <div className={`rounded-xl border ${accentStyle.border} overflow-hidden`}>
      {/* Section header */}
      <div className={`flex items-center gap-2 px-3 py-2 ${accentStyle.bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${accentStyle.dot}`} />
        <span className={`text-[11px] font-semibold ${accentStyle.header.split(' ')[0]}`}>{title}</span>
        <span className="ml-auto text-[10px] text-gray-400">{fields.length} {fields.length === 1 ? 'property' : 'properties'}</span>
      </div>

      <div className="divide-y divide-gray-100">
        {fields.map((field, i) => (
          <SubFieldRow
            key={i}
            field={field}
            expanded={expandedIdx === i}
            onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
            onChange={patch => updateField(i, patch)}
            onRemove={() => removeField(i)}
            depth={depth}
          />
        ))}
      </div>

      <div className="px-3 py-2 bg-white border-t border-dashed border-gray-200">
        <button
          type="button"
          onClick={addField}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-400 hover:text-blue-500 transition-colors"
        >
          <Plus size={12} /> Add Property
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SubFieldRow — a compact, expandable row for nested fields
// ─────────────────────────────────────────────────────────────────────────────

interface SubFieldRowProps {
  field: SchemaField
  expanded: boolean
  onToggle: () => void
  onChange: (patch: Partial<SchemaField>) => void
  onRemove: () => void
  depth?: number
}

const MAX_NESTING_DEPTH = 2

const SubFieldRow: React.FC<SubFieldRowProps> = ({
  field, expanded, onToggle, onChange, onRemove, depth = 0,
}) => {
  const canNestFurther = depth < MAX_NESTING_DEPTH

  const handleItemsTypeChange = (newType: FieldType) => {
    onChange({
      items: {
        type: newType,
        objectFields: newType === 'object' ? (field.items?.objectFields ?? []) : undefined,
      } as ArrayItemsDef,
    })
  }

  return (
    <div className={`${expanded ? 'bg-white' : ''}`}>
      {/* Compact header row */}
      <div
        className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
          expanded ? 'bg-gray-50 border-b border-gray-100' : ''
        }`}
        onClick={onToggle}
      >
        <TypeBadge type={field.type} size="xs" />

        <input
          type="text"
          value={field.name}
          onChange={e => { e.stopPropagation(); onChange({ name: e.target.value }) }}
          onClick={e => e.stopPropagation()}
          placeholder="fieldName"
          className="flex-1 min-w-0 text-xs font-mono text-gray-800 bg-transparent border-0 border-b border-transparent focus:border-blue-300 focus:outline-none px-0.5 py-0"
        />

        {field.required && (
          <span className="text-[9px] font-bold text-red-500 flex-shrink-0">REQ</span>
        )}

        {/* Show indicator if field has nested content */}
        {field.type === 'object' && (field.objectFields?.length ?? 0) > 0 && (
          <span className="text-[9px] text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded flex-shrink-0">
            {field.objectFields!.length} props
          </span>
        )}
        {field.type === 'array' && field.items && (
          <span className="text-[9px] text-orange-600 bg-orange-50 border border-orange-200 px-1 rounded flex-shrink-0 font-mono">
            {field.items.type}[]
            {field.items.type === 'object' && field.items.objectFields?.length
              ? ` · ${field.items.objectFields.length}p` : ''}
          </span>
        )}

        <button
          type="button"
          onClick={e => { e.stopPropagation(); onRemove() }}
          className="p-0.5 text-gray-300 hover:text-red-500 rounded transition-colors flex-shrink-0"
        >
          <Trash2 size={11} />
        </button>
        <span className="text-gray-300 flex-shrink-0">
          {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </span>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 py-3 space-y-3 bg-white">
          {/* Row 1: type + required */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 mb-1">Type</label>
              <select
                value={field.type}
                onChange={e => onChange({ type: e.target.value as FieldType, objectFields: undefined, items: undefined })}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={e => onChange({ required: e.target.checked })}
                  className="rounded accent-blue-600"
                />
                <span className="text-gray-700 font-medium">Required</span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Description</label>
            <input
              type="text"
              value={field.description ?? ''}
              onChange={e => onChange({ description: e.target.value || undefined })}
              placeholder="What does this field represent?"
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* String constraints */}
          {field.type === 'string' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-1">Format</label>
                <select
                  value={field.format ?? ''}
                  onChange={e => onChange({ format: e.target.value || undefined })}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {STRING_FORMATS.map(f => <option key={f} value={f}>{f || '(none)'}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-1">Pattern</label>
                <input
                  type="text"
                  value={field.pattern ?? ''}
                  onChange={e => onChange({ pattern: e.target.value || undefined })}
                  placeholder="^[a-z]+$"
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-1">Min Length</label>
                <input type="number" min={0} value={field.minLength ?? ''}
                  onChange={e => onChange({ minLength: e.target.value ? +e.target.value : undefined })}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-1">Max Length</label>
                <input type="number" min={0} value={field.maxLength ?? ''}
                  onChange={e => onChange({ maxLength: e.target.value ? +e.target.value : undefined })}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
          )}

          {/* Number constraints */}
          {(field.type === 'number' || field.type === 'integer') && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-1">Minimum</label>
                <input type="number" value={field.minimum ?? ''}
                  onChange={e => onChange({ minimum: e.target.value ? +e.target.value : undefined })}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-1">Maximum</label>
                <input type="number" value={field.maximum ?? ''}
                  onChange={e => onChange({ maximum: e.target.value ? +e.target.value : undefined })}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
          )}

          {/* Object: nested properties */}
          {field.type === 'object' && (
            canNestFurther ? (
              <NestedFieldsEditor
                title="Object Properties"
                accent="amber"
                fields={field.objectFields ?? []}
                onChange={objectFields => onChange({ objectFields })}
                depth={depth + 1}
              />
            ) : (
              <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Use the JSON Editor tab for deeper nesting beyond {MAX_NESTING_DEPTH} levels.
              </p>
            )
          )}

          {/* Array: item type + constraints + optional object properties */}
          {field.type === 'array' && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-1">Item Type</label>
                  <select
                    value={field.items?.type ?? 'string'}
                    onChange={e => handleItemsTypeChange(e.target.value as FieldType)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-1">Min Items</label>
                  <input type="number" min={0} value={field.minItems ?? ''}
                    onChange={e => onChange({ minItems: e.target.value ? +e.target.value : undefined })}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-1">Max Items</label>
                  <input type="number" min={0} value={field.maxItems ?? ''}
                    onChange={e => onChange({ maxItems: e.target.value ? +e.target.value : undefined })}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-600">
                <input type="checkbox" checked={field.uniqueItems ?? false}
                  onChange={e => onChange({ uniqueItems: e.target.checked || undefined })}
                  className="rounded accent-orange-500" />
                Unique items only
              </label>
              {field.items?.type === 'object' && (
                canNestFurther ? (
                  <NestedFieldsEditor
                    title="Item Object Properties"
                    accent="orange"
                    fields={field.items.objectFields ?? []}
                    onChange={objectFields => onChange({ items: { type: 'object', objectFields } })}
                    depth={depth + 1}
                  />
                ) : (
                  <p className="text-[10px] text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                    Use the JSON Editor tab for deeper nesting.
                  </p>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FieldRow — top-level expandable field editor
// ─────────────────────────────────────────────────────────────────────────────

interface FieldRowProps {
  field: SchemaField
  idx: number
  total: number
  expanded: boolean
  onToggle: () => void
  onChange: (patch: Partial<SchemaField>) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
}

const FieldRow: React.FC<FieldRowProps> = ({
  field, idx, total, expanded, onToggle, onChange, onRemove, onMove,
}) => {
  const handleItemsTypeChange = (newType: FieldType) => {
    onChange({
      items: {
        type: newType,
        objectFields: newType === 'object' ? (field.items?.objectFields ?? []) : undefined,
      } as ArrayItemsDef,
    })
  }

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      expanded ? 'border-blue-300 shadow-sm' : 'border-gray-150 hover:border-gray-300'
    }`}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none ${
          expanded ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
        }`}
        onClick={onToggle}
      >
        {/* Move buttons */}
        <div className="flex flex-col gap-0.5 flex-shrink-0">
          <button type="button" onClick={e => { e.stopPropagation(); onMove(-1) }} disabled={idx === 0}
            className="text-gray-300 hover:text-gray-500 disabled:opacity-20 leading-none">
            <ChevronUp size={12} />
          </button>
          <button type="button" onClick={e => { e.stopPropagation(); onMove(1) }} disabled={idx === total - 1}
            className="text-gray-300 hover:text-gray-500 disabled:opacity-20 leading-none">
            <ChevronDown size={12} />
          </button>
        </div>

        <TypeBadge type={field.type} />

        <span className="text-sm font-medium text-gray-800 font-mono flex-1 truncate">
          {field.name || <span className="text-gray-300 italic font-sans text-xs">unnamed field</span>}
        </span>

        {/* Inline summary badges */}
        {field.type === 'object' && (field.objectFields?.length ?? 0) > 0 && (
          <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
            {field.objectFields!.length} props
          </span>
        )}
        {field.type === 'array' && field.items && (
          <span className="text-[10px] text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full font-mono flex-shrink-0">
            {field.items.type}[]
            {field.items.type === 'object' && field.items.objectFields?.length
              ? ` · ${field.items.objectFields.length}p` : ''}
          </span>
        )}

        {field.required && (
          <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
            required
          </span>
        )}

        <button type="button" onClick={e => { e.stopPropagation(); onRemove() }}
          className="p-1 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0">
          <Trash2 size={13} />
        </button>

        <span className="text-gray-300 flex-shrink-0">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </div>

      {/* ── Expanded body ────────────────────────────────────────────────────── */}
      {expanded && (
        <div className="px-4 py-4 bg-white border-t border-blue-100 space-y-4">

          {/* Name + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Field Name *</label>
              <input
                type="text"
                value={field.name}
                onChange={e => onChange({ name: e.target.value })}
                placeholder="fieldName"
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Type</label>
              <select
                value={field.type}
                onChange={e => onChange({ type: e.target.value as FieldType, objectFields: undefined, items: undefined })}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Description</label>
            <input
              type="text"
              value={field.description ?? ''}
              onChange={e => onChange({ description: e.target.value })}
              placeholder="What does this field represent?"
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* String constraints */}
          {field.type === 'string' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Format</label>
                <select value={field.format ?? ''} onChange={e => onChange({ format: e.target.value || undefined })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {STRING_FORMATS.map(f => <option key={f} value={f}>{f || '(none)'}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Pattern (regex)</label>
                <input type="text" value={field.pattern ?? ''}
                  onChange={e => onChange({ pattern: e.target.value || undefined })}
                  placeholder="^[a-zA-Z]+$"
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Min Length</label>
                <input type="number" min={0} value={field.minLength ?? ''}
                  onChange={e => onChange({ minLength: e.target.value ? +e.target.value : undefined })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Max Length</label>
                <input type="number" min={0} value={field.maxLength ?? ''}
                  onChange={e => onChange({ maxLength: e.target.value ? +e.target.value : undefined })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
          )}

          {/* Number constraints */}
          {(field.type === 'number' || field.type === 'integer') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Minimum</label>
                <input type="number" value={field.minimum ?? ''}
                  onChange={e => onChange({ minimum: e.target.value ? +e.target.value : undefined })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Maximum</label>
                <input type="number" value={field.maximum ?? ''}
                  onChange={e => onChange({ maximum: e.target.value ? +e.target.value : undefined })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
          )}

          {/* Enum (primitives only) */}
          {['string', 'number', 'integer'].includes(field.type) && (
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                Allowed Values — enum <span className="font-normal text-gray-400">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={field.enum?.join(', ') ?? ''}
                onChange={e => onChange({ enum: e.target.value ? e.target.value.split(',').map(v => v.trim()).filter(Boolean) : undefined })}
                placeholder="USD, EUR, GBP"
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          )}

          {/* Default + Required (primitives + boolean) */}
          {!['object', 'array'].includes(field.type) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Default Value</label>
                <input
                  type="text"
                  value={field.defaultValue ?? ''}
                  onChange={e => onChange({ defaultValue: e.target.value || undefined })}
                  placeholder="e.g. USD"
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={field.required}
                    onChange={e => onChange({ required: e.target.checked })}
                    className="rounded accent-blue-600" />
                  <span className="text-sm text-gray-700 font-medium">Required field</span>
                </label>
              </div>
            </div>
          )}

          {/* Required for object / array */}
          {['object', 'array'].includes(field.type) && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={field.required}
                onChange={e => onChange({ required: e.target.checked })}
                className="rounded accent-blue-600" />
              <span className="text-sm text-gray-700 font-medium">Required field</span>
            </label>
          )}

          {/* ── OBJECT: nested properties designer ──────────────────────────── */}
          {field.type === 'object' && (
            <NestedFieldsEditor
              title="Object Properties"
              accent="amber"
              fields={field.objectFields ?? []}
              onChange={objectFields => onChange({ objectFields })}
              depth={0}
            />
          )}

          {/* ── ARRAY: items config + optional nested designer ───────────────── */}
          {field.type === 'array' && (
            <div className="rounded-xl border border-orange-200 overflow-hidden">
              <div className="px-3 py-2 bg-orange-50 flex items-center gap-2">
                <SquareStack size={12} className="text-orange-500" />
                <span className="text-[11px] font-semibold text-orange-700">Array Items</span>
              </div>
              <div className="px-3 py-3 space-y-3 bg-white">
                {/* Item type + constraints */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Item Type</label>
                    <select
                      value={field.items?.type ?? 'string'}
                      onChange={e => handleItemsTypeChange(e.target.value as FieldType)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Min Items</label>
                    <input type="number" min={0} value={field.minItems ?? ''}
                      onChange={e => onChange({ minItems: e.target.value ? +e.target.value : undefined })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Max Items</label>
                    <input type="number" min={0} value={field.maxItems ?? ''}
                      onChange={e => onChange({ maxItems: e.target.value ? +e.target.value : undefined })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <input type="checkbox" checked={field.uniqueItems ?? false}
                    onChange={e => onChange({ uniqueItems: e.target.checked || undefined })}
                    className="rounded accent-orange-500" />
                  <span className="font-medium">Unique items only</span>
                </label>

                {/* If item type is object: nested properties designer */}
                {field.items?.type === 'object' && (
                  <NestedFieldsEditor
                    title="Item Object Properties"
                    accent="orange"
                    fields={field.items.objectFields ?? []}
                    onChange={objectFields => onChange({ items: { type: 'object', objectFields } })}
                    depth={0}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ModelEditorModal
// ─────────────────────────────────────────────────────────────────────────────

const ModelEditorModal: React.FC<ModelEditorModalProps> = ({ model, onSave, onClose }) => {
  const isEdit = !!model

  const [name,                 setName]                 = useState(model?.name ?? '')
  const [description,          setDescription]          = useState(model?.description ?? '')
  const [tags,                 setTags]                 = useState(model?.tags ?? '')
  const [additionalProperties, setAdditionalProperties] = useState(false)
  const [fields,               setFields]               = useState<SchemaField[]>(() =>
    model?.schemaJson ? jsonSchemaToFields(model.schemaJson) : [emptyField()]
  )
  const [expandedField,        setExpandedField]        = useState<number | null>(null)

  const [tab,          setTab]          = useState<Tab>('builder')
  const [rawJson,      setRawJson]      = useState('')
  const [jsonError,    setJsonError]    = useState<string | null>(null)
  const [testPayload,  setTestPayload]  = useState('{\n  \n}')
  const [testResult,   setTestResult]   = useState<{ valid: boolean; errors: string[] } | null>(null)
  const [saving,       setSaving]       = useState(false)
  const [saveError,    setSaveError]    = useState<string | null>(null)

  const computedJson = useCallback(() =>
    fieldsToJsonSchema(fields, name || undefined, description || undefined, additionalProperties),
    [fields, name, description, additionalProperties]
  )

  useEffect(() => {
    if (tab === 'json' || tab === 'preview') setRawJson(computedJson())
  }, [tab, computedJson])

  // ── Field operations ───────────────────────────────────────────────────────

  const addField = () => {
    setFields(prev => [...prev, emptyField()])
    setExpandedField(fields.length)
  }

  const removeField = (idx: number) => {
    setFields(prev => prev.filter((_, i) => i !== idx))
    if (expandedField === idx) setExpandedField(null)
    else if (expandedField !== null && expandedField > idx) setExpandedField(expandedField - 1)
  }

  const updateField = (idx: number, patch: Partial<SchemaField>) =>
    setFields(prev => prev.map((f, i) => i === idx ? { ...f, ...patch } : f))

  const moveField = (idx: number, dir: -1 | 1) => {
    const next = [...fields]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setFields(next)
    setExpandedField(target)
  }

  // ── JSON tab ───────────────────────────────────────────────────────────────

  const handleJsonChange = (v: string) => {
    setRawJson(v)
    try { JSON.parse(v); setJsonError(null) } catch { setJsonError('Invalid JSON') }
  }

  const importFromJson = () => {
    if (jsonError) return
    const parsed = jsonSchemaToFields(rawJson)
    setFields(parsed.length ? parsed : [emptyField()])
    setTab('builder')
  }

  // ── Test ───────────────────────────────────────────────────────────────────

  const runTest = () => {
    try {
      const payload = JSON.parse(testPayload)
      const schema = JSON.parse(computedJson())
      const errors: string[] = []
      const req: string[] = Array.isArray(schema.required) ? schema.required : []
      for (const r of req) {
        if (!(r in payload)) errors.push(`"${r}" is required`)
      }
      setTestResult({ valid: errors.length === 0, errors })
    } catch (e: unknown) {
      setTestResult({ valid: false, errors: [`Parse error: ${(e as Error).message}`] })
    }
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!name.trim()) { setSaveError('Model name is required'); return }
    const emptyNames = fields.filter(f => !f.name.trim())
    if (emptyNames.length) { setSaveError('All fields must have a name'); return }
    setSaving(true); setSaveError(null)
    try {
      const schemaJson = tab === 'json' && !jsonError ? rawJson : computedJson()
      await onSave({ name: name.trim(), description, schemaJson, tags, active: true })
    } catch (e: unknown) {
      setSaveError((e as Error).message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const copySchema = () => { navigator.clipboard.writeText(computedJson()).catch(() => {}) }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Count all fields including nested ones for the header stat */
  const countAllFields = (flds: SchemaField[]): number =>
    flds.reduce((acc, f) => {
      let n = 1
      if (f.objectFields?.length) n += countAllFields(f.objectFields)
      if (f.items?.objectFields?.length) n += countAllFields(f.items.objectFields)
      return acc + n
    }, 0)

  const totalFieldCount = countAllFields(fields)

  // ─────────────────────────────────────────────────────────────────────────────

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'builder', label: 'Schema Builder', icon: <List size={14} /> },
    { id: 'json',    label: 'JSON Editor',    icon: <Code2 size={14} /> },
    { id: 'preview', label: 'Preview',        icon: <Eye size={14} /> },
    { id: 'test',    label: 'Test Payload',   icon: <FlaskConical size={14} /> },
  ]

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center flex-shrink-0">
              <Braces size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {isEdit ? `Edit — ${model!.name}` : 'New Data Model'}
              </h2>
              <p className="text-xs text-gray-400">
                {totalFieldCount} field{totalFieldCount !== 1 ? 's' : ''} · JSON Schema Draft-07
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Basic info */}
          <div className="px-6 pt-5 pb-4 border-b border-gray-100">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Model Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. OrderRequest"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tags</label>
                <input
                  type="text"
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                  placeholder="orders, payments, users"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What is this model used for?"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-6 pt-3 border-b border-gray-100 pb-0">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
                  tab === t.id
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                {t.icon} {t.label}
                {t.id === 'builder' && fields.length > 0 && (
                  <span className="ml-1 bg-blue-100 text-blue-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    {totalFieldCount}
                  </span>
                )}
              </button>
            ))}
            <div className="ml-auto pb-2">
              <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={additionalProperties}
                  onChange={e => setAdditionalProperties(e.target.checked)}
                  className="rounded"
                />
                Allow extra fields
              </label>
            </div>
          </div>

          {/* Tab content */}
          <div className="px-6 py-4">

            {/* ── Builder ─────────────────────────────────────────────────────── */}
            {tab === 'builder' && (
              <div className="space-y-2">
                {/* Legend */}
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    {FIELD_TYPES.map(t => (
                      <span key={t.value} className={`flex items-center gap-1 text-[10px] font-semibold border rounded px-1.5 py-0.5 ${t.color} ${t.bg}`}>
                        {t.value === 'object' && <Braces size={9} />}
                        {t.value === 'array'  && <SquareStack size={9} />}
                        {t.label}
                      </span>
                    ))}
                  </div>
                  <div className="ml-auto flex items-center gap-1 text-[10px] text-gray-400">
                    <ChevronRight size={10} /> Click a field to expand constraints
                  </div>
                </div>

                {fields.length === 0 && (
                  <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                    <Braces size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No fields yet. Add your first field below.</p>
                  </div>
                )}

                {fields.map((field, idx) => (
                  <FieldRow
                    key={idx}
                    field={field}
                    idx={idx}
                    total={fields.length}
                    expanded={expandedField === idx}
                    onToggle={() => setExpandedField(expandedField === idx ? null : idx)}
                    onChange={patch => updateField(idx, patch)}
                    onRemove={() => removeField(idx)}
                    onMove={dir => moveField(idx, dir)}
                  />
                ))}

                <button
                  type="button"
                  onClick={addField}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors mt-1"
                >
                  <Plus size={15} /> Add Field
                </button>
              </div>
            )}

            {/* ── JSON Editor ─────────────────────────────────────────────────── */}
            {tab === 'json' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">Edit the JSON Schema directly. Use "Import" to sync back to the visual builder.</p>
                  <div className="flex gap-2">
                    <button onClick={copySchema} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 border rounded-lg">
                      <Copy size={11} /> Copy
                    </button>
                    <button
                      onClick={importFromJson}
                      disabled={!!jsonError}
                      className="flex items-center gap-1 text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 px-2.5 py-1 rounded-lg"
                    >
                      Import to Builder
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <textarea
                    value={rawJson}
                    onChange={e => handleJsonChange(e.target.value)}
                    spellCheck={false}
                    className={`w-full h-80 font-mono text-xs bg-gray-950 text-gray-100 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 ${
                      jsonError ? 'ring-1 ring-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                    }`}
                  />
                  {jsonError && <p className="absolute bottom-3 right-4 text-xs text-red-400">{jsonError}</p>}
                </div>
              </div>
            )}

            {/* ── Preview ─────────────────────────────────────────────────────── */}
            {tab === 'preview' && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button onClick={copySchema} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 border rounded-lg">
                    <Copy size={11} /> Copy Schema
                  </button>
                </div>
                <pre className="w-full h-72 overflow-auto font-mono text-xs bg-gray-950 text-green-300 rounded-xl p-4">
                  {computedJson()}
                </pre>
                {fields.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-700 mb-3">Fields Summary</p>
                    <FieldSummaryTree fields={fields} />
                  </div>
                )}
              </div>
            )}

            {/* ── Test ────────────────────────────────────────────────────────── */}
            {tab === 'test' && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">Paste a sample JSON payload to validate it against the schema.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Test Payload (JSON)</label>
                    <textarea
                      value={testPayload}
                      onChange={e => setTestPayload(e.target.value)}
                      spellCheck={false}
                      className="w-full h-52 font-mono text-xs border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={runTest}
                      className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
                    >
                      <FlaskConical size={14} /> Run Validation
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Result</label>
                    {testResult ? (
                      <div className={`rounded-xl p-4 h-52 overflow-auto ${
                        testResult.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-3">
                          {testResult.valid ? (
                            <CheckCircle2 size={18} className="text-green-600" />
                          ) : (
                            <AlertTriangle size={18} className="text-red-600" />
                          )}
                          <span className={`text-sm font-semibold ${testResult.valid ? 'text-green-700' : 'text-red-700'}`}>
                            {testResult.valid ? 'Valid payload' : `${testResult.errors.length} error(s) found`}
                          </span>
                        </div>
                        {testResult.errors.map((e, i) => (
                          <div key={i} className="text-xs text-red-700 bg-red-100 rounded-lg px-3 py-1.5 mb-1.5 font-mono">{e}</div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-52 bg-gray-50 border border-dashed border-gray-200 rounded-xl flex items-center justify-center">
                        <p className="text-xs text-gray-400">Run validation to see results</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <div>
            {saveError && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle size={12} /> {saveError}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl transition-colors"
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Model'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

// ─────────────────────────────────────────────────────────────────────────────
// FieldSummaryTree — recursive tree view for the Preview tab
// ─────────────────────────────────────────────────────────────────────────────

const FieldSummaryTree: React.FC<{ fields: SchemaField[]; indent?: number }> = ({ fields, indent = 0 }) => (
  <div className="space-y-1" style={{ paddingLeft: indent * 16 }}>
    {fields.filter(f => f.name).map(f => (
      <div key={f.name}>
        <div className="flex items-center gap-2 text-xs">
          <TypeBadge type={f.type} size="xs" />
          <span className="text-gray-700 font-medium font-mono">{f.name}</span>
          {f.required && <span className="text-red-500 text-[9px] font-bold">*</span>}
          {f.description && <span className="text-gray-400 truncate max-w-[200px]">{f.description}</span>}
        </div>
        {f.type === 'object' && f.objectFields?.length ? (
          <FieldSummaryTree fields={f.objectFields} indent={indent + 1} />
        ) : null}
        {f.type === 'array' && f.items?.type === 'object' && f.items.objectFields?.length ? (
          <div className="mt-1 ml-4 flex items-center gap-1 text-[10px] text-orange-500 mb-0.5">
            <SquareStack size={9} /> each item:
          </div>
        ) : null}
        {f.type === 'array' && f.items?.type === 'object' && f.items.objectFields?.length ? (
          <FieldSummaryTree fields={f.items.objectFields} indent={indent + 2} />
        ) : null}
      </div>
    ))}
  </div>
)

export default ModelEditorModal
