import axios from 'axios'
import { setupMockHandlers } from '../mocks/handlers'

const isDummyMode = import.meta.env.VITE_DUMMY_MODE === 'true'

const api = axios.create({
  baseURL: isDummyMode
    ? '/api/v1'   // path doesn't matter in dummy mode — intercepted before sending
    : (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1'),
})

// Apply mock adapter BEFORE auth interceptor so it intercepts all requests
if (isDummyMode) {
  setupMockHandlers(api)
  console.info('%c[FlowForge] 🎭 DUMMY MODE enabled — no real API calls will be made', 'color: #f97316; font-weight: bold')
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ff_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  const namespace = localStorage.getItem('ff_namespace') || 'default'
  config.headers['X-Namespace'] = namespace
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ff_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
