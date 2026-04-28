import { renderHook, act } from "@testing-library/react"
import { useOrderPresence, type PresenceUser } from "./useOrderPresence"
import { useAuthStore } from "@/stores/useAuthStore"

class MockWebSocket {
  static instances: MockWebSocket[] = []
  static OPEN = 1
  url: string
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  readyState = 1
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

const userAlice: PresenceUser = { username: "alice", full_name: "Alice A.", avatar: null }
const userBob: PresenceUser = { username: "bob", full_name: "Bob B.", avatar: null }
const userCharlie: PresenceUser = { username: "charlie", full_name: "Charlie C.", avatar: null }

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

  it("returns empty list initially", () => {
    const { result } = renderHook(() => useOrderPresence("42"))
    expect(result.current).toEqual([])
  })

  it("adds user on user_joined event", () => {
    const { result } = renderHook(() => useOrderPresence("42"))
    const ws = MockWebSocket.instances[0]

    act(() => {
      ws.simulateMessage({ type: "user_joined", user: userAlice })
    })

    expect(result.current).toHaveLength(1)
    expect(result.current[0].username).toBe("alice")
  })

  it("removes user on user_left event", () => {
    const { result } = renderHook(() => useOrderPresence("42"))
    const ws = MockWebSocket.instances[0]

    act(() => {
      ws.simulateMessage({ type: "user_joined", user: userAlice })
      ws.simulateMessage({ type: "user_joined", user: userBob })
    })
    expect(result.current).toHaveLength(2)

    act(() => {
      ws.simulateMessage({ type: "user_left", username: "alice" })
    })

    expect(result.current.some((u) => u.username === "alice")).toBe(false)
    expect(result.current.some((u) => u.username === "bob")).toBe(true)
  })

  it("replaces full roster on roster event", () => {
    const { result } = renderHook(() => useOrderPresence("42"))
    const ws = MockWebSocket.instances[0]

    act(() => {
      ws.simulateMessage({ type: "user_joined", user: userAlice })
      ws.simulateMessage({ type: "roster", users: [userBob, userCharlie] })
    })

    expect(result.current).toHaveLength(2)
    expect(result.current.some((u) => u.username === "alice")).toBe(false)
    expect(result.current.some((u) => u.username === "bob")).toBe(true)
    expect(result.current.some((u) => u.username === "charlie")).toBe(true)
  })

  it("handles malformed messages gracefully", () => {
    const { result } = renderHook(() => useOrderPresence("42"))
    const ws = MockWebSocket.instances[0]

    act(() => {
      ws.onmessage?.({ data: "not-json" })
    })

    expect(result.current).toEqual([])
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
      ws.simulateMessage({ type: "user_joined", user: userAlice })
      ws.simulateMessage({ type: "user_joined", user: userBob })
      ws.simulateMessage({ type: "user_joined", user: userCharlie })
    })

    expect(result.current).toHaveLength(3)
    expect(result.current.map((u) => u.username)).toEqual(
      expect.arrayContaining(["alice", "bob", "charlie"]),
    )
  })
})
