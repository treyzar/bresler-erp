import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { createDirectoryQueryHooks } from "./useDirectoryQuery"
import type { BaseEntity, PaginatedResponse } from "../types"

interface TestEntity extends BaseEntity {
  name: string
}

const mockApi = {
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  bulkDelete: vi.fn(),
}

const hooks = createDirectoryQueryHooks<TestEntity>("test-entity", mockApi as unknown as import("../directoryApi").DirectoryApi<TestEntity>)

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe("createDirectoryQueryHooks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("useList", () => {
    it("fetches list data", async () => {
      const response: PaginatedResponse<TestEntity> = {
        count: 1,
        next: null,
        previous: null,
        results: [{ id: 1, name: "Test", created_at: "", updated_at: "" }],
      }
      mockApi.list.mockResolvedValue(response)

      const { result } = renderHook(() => hooks.useList(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(response)
      expect(mockApi.list).toHaveBeenCalledWith(undefined)
    })

    it("passes params to API", async () => {
      mockApi.list.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })

      const params = { page: 2, search: "test" }
      renderHook(() => hooks.useList(params), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(mockApi.list).toHaveBeenCalledWith(params))
    })
  })

  describe("useGet", () => {
    it("fetches single entity by id", async () => {
      const entity: TestEntity = { id: 1, name: "Test", created_at: "", updated_at: "" }
      mockApi.get.mockResolvedValue(entity)

      const { result } = renderHook(() => hooks.useGet(1), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(entity)
      expect(mockApi.get).toHaveBeenCalledWith(1)
    })

    it("does not fetch when id is null", () => {
      const { result } = renderHook(() => hooks.useGet(null), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe("idle")
      expect(mockApi.get).not.toHaveBeenCalled()
    })
  })

  describe("useCreate", () => {
    it("calls create API and returns result", async () => {
      const created: TestEntity = { id: 2, name: "New", created_at: "", updated_at: "" }
      mockApi.create.mockResolvedValue(created)

      const { result } = renderHook(() => hooks.useCreate(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ name: "New" })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(created)
      expect(mockApi.create).toHaveBeenCalledWith({ name: "New" })
    })
  })

  describe("useUpdate", () => {
    it("calls update API with id and data", async () => {
      const updated: TestEntity = { id: 1, name: "Updated", created_at: "", updated_at: "" }
      mockApi.update.mockResolvedValue(updated)

      const { result } = renderHook(() => hooks.useUpdate(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ id: 1, data: { name: "Updated" } })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockApi.update).toHaveBeenCalledWith(1, { name: "Updated" })
    })
  })

  describe("useDelete", () => {
    it("calls delete API with id", async () => {
      mockApi.delete.mockResolvedValue(undefined)

      const { result } = renderHook(() => hooks.useDelete(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockApi.delete).toHaveBeenCalledWith(1)
    })
  })

  describe("useBulkDelete", () => {
    it("calls bulkDelete API with ids array", async () => {
      mockApi.bulkDelete.mockResolvedValue({ deleted: 3 })

      const { result } = renderHook(() => hooks.useBulkDelete(), {
        wrapper: createWrapper(),
      })

      result.current.mutate([1, 2, 3])

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual({ deleted: 3 })
      expect(mockApi.bulkDelete).toHaveBeenCalledWith([1, 2, 3])
    })
  })
})
