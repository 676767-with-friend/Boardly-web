import { beforeEach, describe, expect, it, vi } from "vitest"

const root = vi.hoisted(() => ({
  create: vi.fn(),
  render: vi.fn(),
}))

vi.mock("react-dom/client", () => ({
  default: {
    createRoot: root.create,
  },
}))

vi.mock("./App", () => ({
  default: () => <div>Boardly application</div>,
}))

describe("main bootstrap", () => {
  beforeEach(() => {
    vi.resetModules()
    root.create.mockReturnValue({ render: root.render })
    document.body.innerHTML = '<div id="root"></div>'
  })

  it("mounts the application into the root element", async () => {
    const container = document.getElementById("root")
    await import("./main")

    expect(root.create).toHaveBeenCalledWith(container)
    expect(root.render).toHaveBeenCalledOnce()
  })
})
