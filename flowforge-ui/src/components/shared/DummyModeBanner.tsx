import React from 'react'
import { FlaskConical } from 'lucide-react'

export default function DummyModeBanner() {
  if (import.meta.env.VITE_DUMMY_MODE !== 'true') return null
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-orange-500 text-white text-xs font-semibold px-3 py-2 rounded-full shadow-lg">
      <FlaskConical size={14} />
      DEMO MODE — no real API
    </div>
  )
}
