import { renderHook, act } from "@testing-library/react"
import { useOrderPresence } from "./useOrderPresence"
import { useAuthStore } from "@/stores/useAuthStore"

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = []
  static OPEN = 1
  url: string
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  readyState = 1 // OPEN
  closeCalled = false

  close() {
    this.closeCalled = true
    this.readyState = 3
    this.onclose?.()
  }

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  simulateMessage(data: object) {
    this.onmessage?.({ data: JSON.stringify(data) })
  }
}

vi.stubGlobal("WebSocket", MockWebSocket)

describe("useOrderPresence", () => {
  beforeEach(() => {
    MockWebSocket.instances = []
    useAuthStore.setState({
      accessToken: "test-token",
      refreshToken: "refresh",
      user: null,
      isAuthenticated: true,
    })
  })

  it("does not connect when orderNumber is undefined", () => {
    renderHook(() => useOrderPresence(undefined))
    expect(MockWebSocket.instances).toHaveLength(0)
  })

  it("does not connect when no access token", () => {
    useAuthStore.setState({ accessToken: null })
    renderHook(() => useOrderPresence("123"))
    expect(MockWebSocket.instances).toHaveLength(0)
  })

  it("connects to correct WebSocket URL", () => {
    renderHook(() => useOrderPresence("42"))

    expect(MockWebSocket.instances).toHaveLength(1)
    expect(MockWebSocket.instances[0].url).toContain("/ws/orders/42/presence/")
    expect(MockWebSocket.instances[0].url).toContain("token=test-token")
  })

  it("returns empty set initially", () => {
    const { result } = renderHook(() => useOrderPresence("42"))
    expect(result.current.size).toBe(0)
  })

  it("adds user on user_joined event", () => {
    const { result } = renderHook(() => useOrderPresence("42"))
    const ws = MockWebSocket.instances[0]

    act(() => {
      ws.simulateMessage({ type: "user_joined", username: "alice" })
    })

    expect(result.current.has("alice")).toBe(true)
    expect(result.current.size).toBe(1)
  })

  it("removes user on user_left event", () => {
    const { result } = renderHook(() => useOrderPresence("42"))
    const ws = MockWebSocket.instances[0]

    act(() => {
      ws.simulateMessage({ type: "user_joined", username: "alice" })
      ws.simulateMessage({ type: "user_joined", username: "bob" })
    })
    expect(result.current.size).toBe(2)

    act(() => {
      ws.simulateMessage({ type: "user_left", username: "alice" })
    })

    expect(result.current.has("alice")).toBe(false)
    expect(result.current.has("bob")).toBe(true)
  })

  it("handles malformed messages gracefully", () => {
    const { result } = renderHook(() => useOrderPresence("42"))
    const ws = MockWebSocket.instances[0]

    act(() => {
      ws.onmessage?.({ data: "not-json" })
    })

    expect(result.current.size).toBe(0)
  })

  it("closes WebSocket on unmount", () => {
    const { unmount } = renderHook(() => useOrderPresence("42"))
    const ws = MockWebSocket.instances[0]

    unmount()

    expect(ws.closeCalled).toBe(true)
  })

  it("tracks multiple users simultaneously", () => {
    const { result } = renderHook(() => useOrderPresence("42"))
    const ws = MockWebSocket.instances[0]

    act(() => {
      ws.simulateMessage({ type: "user_joined", username: "alice" })
      ws.simulateMessage({ type: "user_joined", username: "bob" })
      ws.simulateMessage({ type: "user_joined", username: "charlie" })
    })

    expect(result.current.size).toBe(3)
    expect([...result.current]).toEqual(expect.arrayContaining(["alice", "bob", "charlie"]))
  })
})
