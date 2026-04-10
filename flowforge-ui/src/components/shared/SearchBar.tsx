import React, { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'

interface FilterOption {
  label: string
  value: string
}

interface FilterConfig {
  key: string
  label: string
  options: FilterOption[]
}

interface SearchBarProps {
  placeholder?: string
  filters?: FilterConfig[]
  onSearch: (params: { q: string; [key: string]: string }) => void
  debounceMs?: number
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search...',
  filters = [],
  onSearch,
  debounceMs = 300,
}) => {
  const [query, setQuery] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch({ q: query, ...filterValues })
    }, debounceMs)
    return () => clearTimeout(timer)
  }, [query, filterValues, debounceMs])  // don't include onSearch to avoid loops

  const clearSearch = () => {
    setQuery('')
    setFilterValues({})
    onSearch({ q: '', ...Object.fromEntries(filters.map(f => [f.key, ''])) })
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Text search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter dropdowns */}
      {filters.map((filter) => (
        <select
          key={filter.key}
          value={filterValues[filter.key] || ''}
          onChange={(e) => setFilterValues({ ...filterValues, [filter.key]: e.target.value })}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{filter.label}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ))}

      {/* Clear all */}
      {(query || Object.values(filterValues).some(v => v)) && (
        <button onClick={clearSearch} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <X size={12} /> Clear
        </button>
      )}
    </div>
  )
}

export default SearchBar
