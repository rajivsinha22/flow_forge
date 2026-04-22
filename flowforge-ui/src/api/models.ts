import api from './axios'
import { unwrap } from './utils'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type FieldType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null'

/** Describes a single item type for an array field */
export interface ArrayItemsDef {
  type: FieldType
  /** when type === 'object', the shape of each item */
  objectFields?: SchemaField[]
}

export interface SchemaField {
  name: string
  type: FieldType
  description?: string
  required: boolean
  // string constraints
  minLength?: number
  maxLength?: number
  pattern?: string
  format?: string           // e.g. 'email', 'date-time', 'uuid'
  // number / integer constraints
  minimum?: number
  maximum?: number
  // general
  enum?: string[]           // allowed values
  defaultValue?: string
  // object type — named child properties
  objectFields?: SchemaField[]
  // array type — items definition + array constraints
  items?: ArrayItemsDef
  minItems?: number
  maxItems?: number
  uniqueItems?: boolean
}

export interface DataModel {
  id: string
  clientId: string
  name: string
  description?: string
  schemaJson: string
  fieldNames?: string[]
  tags?: string
  active: boolean
  createdBy?: string
  createdAt: string
  updatedAt: string
  namespace?: string
}

export interface ErrorHandlingConfig {
  mode: 'FAIL_FAST' | 'CONTINUE' | 'CUSTOM_RESPONSE'
  customStatusCode?: number
  customBody?: Record<string, unknown>
  notifyOnError?: boolean
}

export interface DataModelRequest {
  name: string
  description?: string
  schemaJson: string
  tags?: string
  active?: boolean
}

export interface ValidatePayloadResult {
  valid: boolean
  errors: string[]
  errorCount: number
}

// ─────────────────────────────────────────────────────────────────────────────
// API helpers
// ─────────────────────────────────────────────────────────────────────────────

export const listModels = async (activeOnly = false): Promise<DataModel[]> => {
  const res = await api.get('/models', { params: { activeOnly } })
  return unwrap<DataModel[]>(res.data)
}

export const getModel = async (id: string): Promise<DataModel> => {
  const res = await api.get(`/models/${id}`)
  return unwrap<DataModel>(res.data)
}

export const createModel = async (data: DataModelRequest): Promise<DataModel> => {
  const res = await api.post('/models', data)
  return unwrap<DataModel>(res.data)
}

export const updateModel = async (id: string, data: DataModelRequest): Promise<DataModel> => {
  const res = await api.put(`/models/${id}`, data)
  return unwrap<DataModel>(res.data)
}

export const deleteModel = async (id: string): Promise<void> => {
  await api.delete(`/models/${id}`)
}

export const validatePayload = async (
  id: string,
  payload: Record<string, unknown>
): Promise<ValidatePayloadResult> => {
  const res = await api.post(`/models/${id}/validate`, { payload })
  return unwrap<ValidatePayloadResult>(res.data)
}

// ─────────────────────────────────────────────────────────────────────────────
// Schema builder helpers — convert UI fields ↔ JSON Schema Draft-07
// ─────────────────────────────────────────────────────────────────────────────

/** Recursively build a JSON Schema property object from a SchemaField */
function buildProp(f: SchemaField): Record<string, unknown> {
  const prop: Record<string, unknown> = { type: f.type }

  if (f.description) prop.description = f.description
  if (f.format)      prop.format = f.format
  if (f.defaultValue != null && f.defaultValue !== '') prop.default = f.defaultValue

  if (f.type === 'string') {
    if (f.minLength != null) prop.minLength = f.minLength
    if (f.maxLength != null) prop.maxLength = f.maxLength
    if (f.pattern)           prop.pattern   = f.pattern
  }

  if (f.type === 'number' || f.type === 'integer') {
    if (f.minimum != null) prop.minimum = f.minimum
    if (f.maximum != null) prop.maximum = f.maximum
  }

  if (f.enum && f.enum.length > 0) prop.enum = f.enum

  // ── object: build nested properties ──────────────────────────────────────
  if (f.type === 'object') {
    const namedFields = (f.objectFields ?? []).filter(nf => nf.name.trim())
    if (namedFields.length > 0) {
      const nestedProps: Record<string, unknown> = {}
      const nestedReq: string[] = []
      for (const nf of namedFields) {
        nestedProps[nf.name] = buildProp(nf)
        if (nf.required) nestedReq.push(nf.name)
      }
      prop.properties = nestedProps
      prop.additionalProperties = false
      if (nestedReq.length) prop.required = nestedReq
    }
  }

  // ── array: build items schema ─────────────────────────────────────────────
  if (f.type === 'array') {
    if (f.items) {
      if (f.items.type === 'object') {
        const namedFields = (f.items.objectFields ?? []).filter(nf => nf.name.trim())
        if (namedFields.length > 0) {
          const nestedProps: Record<string, unknown> = {}
          const nestedReq: string[] = []
          for (const nf of namedFields) {
            nestedProps[nf.name] = buildProp(nf)
            if (nf.required) nestedReq.push(nf.name)
          }
          prop.items = {
            type: 'object',
            properties: nestedProps,
            additionalProperties: false,
            ...(nestedReq.length ? { required: nestedReq } : {}),
          }
        } else {
          prop.items = { type: 'object' }
        }
      } else {
        prop.items = { type: f.items.type }
      }
    }
    if (f.minItems   != null) prop.minItems   = f.minItems
    if (f.maxItems   != null) prop.maxItems   = f.maxItems
    if (f.uniqueItems)        prop.uniqueItems = true
  }

  return prop
}

/** Convert an array of SchemaField objects into a JSON Schema Draft-07 string */
export function fieldsToJsonSchema(
  fields: SchemaField[],
  title?: string,
  description?: string,
  additionalProperties = false
): string {
  const properties: Record<string, unknown> = {}
  const required: string[] = []

  for (const f of fields) {
    if (!f.name.trim()) continue
    properties[f.name] = buildProp(f)
    if (f.required) required.push(f.name)
  }

  const schema: Record<string, unknown> = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties,
    additionalProperties,
  }
  if (title)            schema.title       = title
  if (description)      schema.description = description
  if (required.length)  schema.required    = required

  return JSON.stringify(schema, null, 2)
}

/** Recursively parse a JSON Schema property into a SchemaField */
function parseProp(
  name: string,
  prop: Record<string, unknown>,
  requiredSet: Set<string>
): SchemaField {
  const type = (prop.type as FieldType) || 'string'
  const field: SchemaField = {
    name,
    type,
    required:     requiredSet.has(name),
    description:  prop.description  as string | undefined,
    format:       prop.format       as string | undefined,
    defaultValue: prop.default != null ? String(prop.default) : undefined,
    minLength:    prop.minLength    as number | undefined,
    maxLength:    prop.maxLength    as number | undefined,
    pattern:      prop.pattern      as string | undefined,
    minimum:      prop.minimum      as number | undefined,
    maximum:      prop.maximum      as number | undefined,
    enum:         Array.isArray(prop.enum) ? (prop.enum as string[]) : undefined,
    minItems:     prop.minItems     as number | undefined,
    maxItems:     prop.maxItems     as number | undefined,
    uniqueItems:  prop.uniqueItems  as boolean | undefined,
  }

  // object: parse nested properties
  if (type === 'object' && prop.properties) {
    const nested = prop.properties as Record<string, Record<string, unknown>>
    const nestedReq = new Set<string>(
      Array.isArray(prop.required) ? (prop.required as string[]) : []
    )
    field.objectFields = Object.entries(nested).map(([k, v]) => parseProp(k, v, nestedReq))
  }

  // array: parse items
  if (type === 'array' && prop.items) {
    const items = prop.items as Record<string, unknown>
    const itemType = (items.type as FieldType) || 'string'
    if (itemType === 'object' && items.properties) {
      const nestedProps = items.properties as Record<string, Record<string, unknown>>
      const nestedReq = new Set<string>(
        Array.isArray(items.required) ? (items.required as string[]) : []
      )
      field.items = {
        type: 'object',
        objectFields: Object.entries(nestedProps).map(([k, v]) => parseProp(k, v, nestedReq)),
      }
    } else {
      field.items = { type: itemType }
    }
  }

  return field
}

/** Parse a JSON Schema Draft-07 string back into SchemaField objects for the UI builder */
export function jsonSchemaToFields(schemaJson: string): SchemaField[] {
  try {
    const schema = JSON.parse(schemaJson)
    const properties = schema.properties as Record<string, Record<string, unknown>> | undefined
    if (!properties) return []
    const requiredSet = new Set<string>(
      Array.isArray(schema.required) ? (schema.required as string[]) : []
    )
    return Object.entries(properties).map(([name, prop]) => parseProp(name, prop, requiredSet))
  } catch {
    return []
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock data (dummy mode)
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_MODELS: DataModel[] = [
  {
    id: 'model-1',
    namespace: 'default',
    clientId: 'client-1',
    name: 'OrderRequest',
    description: 'Schema for incoming order placement requests',
    schemaJson: JSON.stringify({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      required: ['orderId', 'customerId', 'amount'],
      properties: {
        orderId: { type: 'string', description: 'Unique order identifier' },
        customerId: { type: 'string', description: 'Customer UUID' },
        amount: { type: 'number', minimum: 0, description: 'Order total in USD' },
        currency: { type: 'string', enum: ['USD', 'EUR', 'GBP'], default: 'USD' },
        items: { type: 'array', items: { type: 'object' } },
      },
      additionalProperties: false,
    }, null, 2),
    fieldNames: ['orderId', 'customerId', 'amount', 'currency', 'items'],
    tags: 'orders,payments',
    active: true,
    createdBy: 'admin',
    createdAt: '2026-01-10T09:00:00',
    updatedAt: '2026-02-15T14:30:00',
  },
  {
    id: 'model-2',
    namespace: 'default',
    clientId: 'client-1',
    name: 'UserRegistration',
    description: 'Schema for new user sign-up payloads',
    schemaJson: JSON.stringify({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      required: ['email', 'name'],
      properties: {
        email: { type: 'string', format: 'email' },
        name: { type: 'string', minLength: 2, maxLength: 100 },
        phone: { type: 'string', pattern: '^\\+?[0-9]{7,15}$' },
        role: { type: 'string', enum: ['user', 'admin', 'viewer'] },
      },
      additionalProperties: false,
    }, null, 2),
    fieldNames: ['email', 'name', 'phone', 'role'],
    tags: 'users,auth',
    active: true,
    createdBy: 'admin',
    createdAt: '2026-01-20T11:00:00',
    updatedAt: '2026-02-20T10:00:00',
  },
  {
    id: 'model-3',
    namespace: 'apply',
    clientId: 'client-1',
    name: 'WebhookEvent',
    description: 'Generic webhook event envelope',
    schemaJson: JSON.stringify({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      required: ['event', 'timestamp'],
      properties: {
        event: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
        source: { type: 'string' },
        payload: { type: 'object' },
      },
    }, null, 2),
    fieldNames: ['event', 'timestamp', 'source', 'payload'],
    tags: 'webhooks,events',
    active: true,
    createdBy: 'system',
    createdAt: '2026-02-01T08:00:00',
    updatedAt: '2026-02-01T08:00:00',
  },
]
