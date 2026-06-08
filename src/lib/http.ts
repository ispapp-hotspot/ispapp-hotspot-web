import axios from 'axios'

const http = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use((config) => {
  config.withCredentials = true
  return config
})

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
        window.location.href = '/login'
      })
    }
    return Promise.reject(err)
  }
)

export default http
