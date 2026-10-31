import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  AdminLiveTablesPage,
  AdminTableManagementPage,
} from "./AdminTableManagementPage"
import { adminApi, staffApi } from "@/services/managementApi"

vi.mock("@/services/managementApi", () => ({
  adminApi: {
    tables: vi.fn(),
    tableZones: vi.fn(),
    tableFeatures: vi.fn(),
    createTable: vi.fn(),
    updateTable: vi.fn(),
    deactivateTable: vi.fn(),
  },
  staffApi: { branches: vi.fn() },
}))

vi.mock("@/features/StaffOperationalPages", () => ({
  StaffLiveTablesPage: ({
    onManageTable,
  }: {
    onManageTable: (table: unknown, branchId: string) => void
  }) => (
    <div>
      <button onClick={() => onManageTable(null, "branch-1")}>
        Add from live view
      </button>
      <button onClick={() => onManageTable({ id: "missing" }, "branch-1")}>
        Manage missing table
      </button>
    </div>
  ),
}))

const zone = { id: "zone-1", branchId: "branch-1", name: "Main", sortOrder: 1 }
const feature = { id: "feature-1", name: "Premium mat" }
const table = {
  id: "table-1",
  branchId: "branch-1",
  branchName: "Central",
  code: "A1",
  zoneId: "zone-1",
  zoneName: "Main",
  minPlayers: 2,
  maxPlayers: 4,
  operationalStatus: "available",
  sortOrder: 1,
  active: true,
  featureIds: ["feature-1"],
  featureNames: ["Premium mat"],
}

describe("admin table management", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(staffApi.branches).mockResolvedValue([
      { id: "branch-1", name: "Central" },
    ])
    vi.mocked(adminApi.tableFeatures).mockResolvedValue([feature])
    vi.mocked(adminApi.tableZones).mockResolvedValue([zone])
    vi.mocked(adminApi.tables).mockResolvedValue([table])
    vi.mocked(adminApi.createTable).mockResolvedValue(table)
    vi.mocked(adminApi.updateTable).mockResolvedValue(table)
    vi.mocked(adminApi.deactivateTable).mockResolvedValue({
      ...table,
      active: false,
    })
  })

  it("loads physical tables and creates a validated table", async () => {
    render(<AdminTableManagementPage />)

    expect(await screen.findByText("Table A1")).toBeInTheDocument()
    expect(screen.getByText("Premium mat")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "+ Add Table" }))
    const save = screen.getByRole("button", { name: "Save Table" })
    expect(save).toBeDisabled()
    fireEvent.change(screen.getByLabelText("Table code"), {
      target: { value: "B2" },
    })
    fireEvent.click(screen.getByLabelText("Premium mat"))
    fireEvent.click(save)

    await waitFor(() =>
      expect(adminApi.createTable).toHaveBeenCalledWith(
        expect.objectContaining({
          branchId: "branch-1",
          code: "B2",
          zoneId: "zone-1",
          sortOrder: 2,
          featureIds: ["feature-1"],
        }),
      ),
    )
    expect(adminApi.tables).toHaveBeenCalledTimes(2)
  })

  it("edits and deactivates an existing table after confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true)
    render(<AdminTableManagementPage />)

    fireEvent.click(await screen.findByRole("button", { name: "Edit" }))
    fireEvent.change(screen.getByLabelText("Maximum players"), {
      target: { value: "6" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save Table" }))
    await waitFor(() =>
      expect(adminApi.updateTable).toHaveBeenCalledWith(
        "table-1",
        expect.objectContaining({ maxPlayers: 6 }),
      ),
    )

    fireEvent.click(
      await screen.findByRole("button", { name: "Deactivate table" }),
    )
    await waitFor(() =>
      expect(adminApi.deactivateTable).toHaveBeenCalledWith("table-1"),
    )
  })

  it("surfaces loading failures without hiding the page", async () => {
    vi.mocked(staffApi.branches).mockRejectedValueOnce(
      new Error("Admin access denied"),
    )
    render(<AdminTableManagementPage />)
    expect(await screen.findByText("Admin access denied")).toBeInTheDocument()
    expect(screen.getByText("Physical Tables")).toBeInTheDocument()
  })

  it("opens the live-table editor and reports stale physical configuration", async () => {
    render(<AdminLiveTablesPage />)
    fireEvent.click(screen.getByRole("button", { name: "Add from live view" }))
    expect(await screen.findByText("Add Table")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Close" }))

    fireEvent.click(
      screen.getByRole("button", { name: "Manage missing table" }),
    )
    expect(
      await screen.findByText("Physical table configuration was not found."),
    ).toBeInTheDocument()
  })
})
