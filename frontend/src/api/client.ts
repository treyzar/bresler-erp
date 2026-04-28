import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios"
import { useAuthStore } from "@/stores/useAuthStore"

const apiClient = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor: attach JWT
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * Single-flight refresh: if two requests fail with 401 concurrently (common
 * when the page fires several queries at once), we must call the refresh
 * endpoint only once — otherwise SimpleJWT's ROTATE_REFRESH_TOKENS
 * invalidates the token after the first refresh and the rest log the user
 * out. Every concurrent 401 awaits the same promise and gets the new token.
 */
let refreshPromise: Promise<string> | null = null

function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise

  const refreshToken = useAuthStore.getState().refreshToken
  if (!refreshToken) return Promise.reject(new Error("No refresh token"))

  refreshPromise = axios
    .post<{ access: string; refresh?: string }>("/api/auth/token/refresh/", {
      refresh: refreshToken,
    })
    .then(({ data }) => {
      useAuthStore.getState().setTokens(data.access, data.refresh ?? refreshToken)
      return data.access
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

// Response interceptor: auto-refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined

    if (!originalRequest || originalRequest._retry) {
      return Promise.reject(error)
    }
    if (error.response?.status !== 401) {
      return Promise.reject(error)
    }
    // Don't try to refresh on the refresh endpoint itself.
    if (originalRequest.url?.includes("/auth/token/")) {
      useAuthStore.getState().logout()
      return Promise.reject(error)
    }
    // No refresh token in store → session is dead, kick the user out.
    if (!useAuthStore.getState().refreshToken) {
      useAuthStore.getState().logout()
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      const newAccess = await refreshAccessToken()
      originalRequest.headers.Authorization = `Bearer ${newAccess}`
      return apiClient(originalRequest)
    } catch (refreshError) {
      // Only force logout if the refresh server rejected us (401/400).
      // Network errors shouldn't kick the user out — surface the error instead.
      const status = (refreshError as AxiosError)?.response?.status
      if (status === 401 || status === 400) {
        useAuthStore.getState().logout()
      }
      return Promise.reject(error)
    }
  },
)

export default apiClient
