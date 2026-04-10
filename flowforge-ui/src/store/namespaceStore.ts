import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Namespace } from '../types'
import { listNamespaces } from '../api/namespaces'

interface NamespaceState {
  namespaces: Namespace[]
  currentNamespace: string
  isLoading: boolean
  setCurrentNamespace: (ns: string) => void
  fetchNamespaces: () => Promise<void>
}

export const useNamespaceStore = create<NamespaceState>()(
  persist(
    (set) => ({
      namespaces: [],
      currentNamespace: 'default',
      isLoading: false,

      setCurrentNamespace: (ns: string) => {
        set({ currentNamespace: ns })
        localStorage.setItem('ff_namespace', ns)
      },

      fetchNamespaces: async () => {
        set({ isLoading: true })
        try {
          const namespaces = await listNamespaces()
          set({ namespaces, isLoading: false })
        } catch {
          set({ isLoading: false })
        }
      },
    }),
    {
      name: 'ff_namespace_store',
      partialize: (state) => ({ currentNamespace: state.currentNamespace }),
    }
  )
)
