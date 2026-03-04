/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAuthStore } from "@/stores/useAuthStore"

// Use globalThis to share state between the hoisted vi.mock factory and tests
// vi.mock is hoisted above all declarations, so const/let won't work
vi.mock("axios", async () => {
  const actual = await vi.importActual<typeof import("axios")>("axios")

  ;(globalThis as any).__testInterceptors = {}

  const instance = {
    defaults: { baseURL: "/api", headers: { common: {} } },
    interceptors: {
      request: {
        use: (fulfilled: any) => {
          ;(globalThis as any).__testInterceptors.request = fulfilled
          return 0
        },
      },
      response: {
        use: (_fulfilled: any, rejected: any) => {
          ;(globalThis as any).__testInterceptors.responseError = rejected
          return 0
        },
      },
    },
  }

  return {
    ...actual,
    default: {
      ...actual.default,
      create: () => instance,
      post: vi.fn(),
    },
  }
})

// Import after mocking — triggers interceptor registration
import apiClient from "./client"

function getInterceptors() {
  return (globalThis as any).__testInterceptors as {
    request: (config: Record<string, unknown>) => Record<string, unknown>
    responseError: (error: Record<string, unknown>) => Promise<never>
  }
}

describe("API client", () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    })
  })

  it("exports a defined client", () => {
    expect(apiClient).toBeDefined()
  })

  it("registers request interceptor", () => {
    expect(getInterceptors().request).toBeTypeOf("function")
  })

  it("attaches Authorization header when token is present", () => {
    useAuthStore.getState().setTokens("test-access-token", "test-refresh")

    const config = { headers: {} as Record<string, string> }
    const result = getInterceptors().request(config)

    expect((result as any).headers.Authorization).toBe("Bearer test-access-token")
  })

  it("does not attach Authorization header when no token", () => {
    const config = { headers: {} as Record<string, string> }
    const result = getInterceptors().request(config)

    expect((result as any).headers.Authorization).toBeUndefined()
  })

  it("calls logout on 401 when no refresh token", async () => {
    useAuthStore.setState({ refreshToken: null, isAuthenticated: true })

    const logoutSpy = vi.spyOn(useAuthStore.getState(), "logout")

    const error = { config: {}, response: { status: 401 } }

    await expect(getInterceptors().responseError(error)).rejects.toEqual(error)
    expect(logoutSpy).toHaveBeenCalled()
  })

  it("does not intercept non-401 errors", async () => {
    const error = { config: {}, response: { status: 500 } }

    await expect(getInterceptors().responseError(error)).rejects.toEqual(error)
  })
})
