import React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { TriggerCondition } from '../../types'

const CONDITION_TYPES = [
  { value: 'ALWAYS',           label: 'Always (no filter)' },
  { value: 'FIELD_EXISTS',     label: 'Field exists' },
  { value: 'FIELD_NOT_EXISTS', label: 'Field does not exist' },
  { value: 'FIELD_EQUALS',     label: 'Field equals' },
  { value: 'FIELD_NOT_EQUALS', label: 'Field not equals' },
  { value: 'FIELD_CONTAINS',   label: 'Field contains (string)' },
  { value: 'FIELD_MATCHES',    label: 'Field matches regex' },
  { value: 'FIELD_GT',         label: 'Field greater than' },
  { value: 'FIELD_LT',         label: 'Field less than' },
  { value: 'SPEL_EXPRESSION',  label: 'SpEL expression (advanced)' },
  { value: 'AND',              label: 'AND (all conditions)' },
  { value: 'OR',               label: 'OR (any condition)' },
  { value: 'NOT',              label: 'NOT (negate)' },
]

const NEEDS_FIELD = [
  'FIELD_EXISTS',
  'FIELD_NOT_EXISTS',
  'FIELD_EQUALS',
  'FIELD_NOT_EQUALS',
  'FIELD_CONTAINS',
  'FIELD_MATCHES',
  'FIELD_GT',
  'FIELD_LT',
]

const NEEDS_VALUE = [
  'FIELD_EQUALS',
  'FIELD_NOT_EQUALS',
  'FIELD_CONTAINS',
  'FIELD_MATCHES',
  'FIELD_GT',
  'FIELD_LT',
]

const NEEDS_NESTED = ['AND', 'OR', 'NOT']

function emptyCondition(): TriggerCondition {
  return { conditionType: 'ALWAYS' }
}

interface ConditionNodeProps {
  condition: TriggerCondition
  onChange: (c: TriggerCondition) => void
  onRemove?: () => void
  depth?: number
}

function ConditionNode({ condition, onChange, onRemove, depth = 0 }: ConditionNodeProps) {
  const type = condition.conditionType || 'ALWAYS'

  return (
    <div
      className={`border rounded-lg p-3 ${
        depth > 0 ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-2">
          {/* Type selector */}
          <div className="flex items-center gap-2">
            <select
              value={type}
              onChange={(e) =>
                onChange({ ...condition, conditionType: e.target.value as TriggerCondition['conditionType'] })
              }
              className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CONDITION_TYPES.map((ct) => (
                <option key={ct.value} value={ct.value}>
                  {ct.label}
                </option>
              ))}
            </select>
          </div>

          {/* Field path */}
          {NEEDS_FIELD.includes(type) && (
            <input
              type="text"
              placeholder="Field path (e.g. data.order.status)"
              value={condition.fieldPath || ''}
              onChange={(e) => onChange({ ...condition, fieldPath: e.target.value })}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          {/* Expected value */}
          {NEEDS_VALUE.includes(type) && (
            <input
              type="text"
              placeholder="Expected value"
              value={condition.expectedValue || ''}
              onChange={(e) => onChange({ ...condition, expectedValue: e.target.value })}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          {/* SpEL expression */}
          {type === 'SPEL_EXPRESSION' && (
            <textarea
              rows={2}
              placeholder="#event['status'] == 'NEW'"
              value={condition.spelExpression || ''}
              onChange={(e) => onChange({ ...condition, spelExpression: e.target.value })}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          {/* Nested conditions for AND/OR/NOT */}
          {NEEDS_NESTED.includes(type) && depth < 2 && (
            <div className="pl-2 space-y-2 border-l-2 border-blue-200 ml-1">
              {(condition.nestedConditions || []).map((nc, i) => (
                <ConditionNode
                  key={i}
                  condition={nc}
                  depth={depth + 1}
                  onChange={(updated) => {
                    const nested = [...(condition.nestedConditions || [])]
                    nested[i] = updated
                    onChange({ ...condition, nestedConditions: nested })
                  }}
                  onRemove={() => {
                    const nested = (condition.nestedConditions || []).filter((_, idx) => idx !== i)
                    onChange({ ...condition, nestedConditions: nested })
                  }}
                />
              ))}
              {(type !== 'NOT' || (condition.nestedConditions || []).length === 0) && (
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...condition,
                      nestedConditions: [...(condition.nestedConditions || []), emptyCondition()],
                    })
                  }
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                >
                  <Plus size={12} /> Add sub-condition
                </button>
              )}
            </div>
          )}
        </div>

        {/* Remove button */}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-gray-400 hover:text-red-500 mt-1 p-1 flex-shrink-0"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

interface ConditionBuilderProps {
  condition: TriggerCondition | null
  onChange: (c: TriggerCondition | null) => void
}

const ConditionBuilder: React.FC<ConditionBuilderProps> = ({ condition, onChange }) => {
  const activeCondition = condition || emptyCondition()

  return (
    <div className="space-y-2">
      <ConditionNode condition={activeCondition} onChange={onChange} />
      {activeCondition.conditionType === 'ALWAYS' && (
        <p className="text-xs text-gray-400">
          This trigger will fire on every matching event (no filter applied).
        </p>
      )}
    </div>
  )
}

export default ConditionBuilder
