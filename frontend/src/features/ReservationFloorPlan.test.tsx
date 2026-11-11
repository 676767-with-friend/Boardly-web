import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, it, vi } from "vitest"
import type { AvailableTable } from "@/services/reservationsApi"
import ReservationFloorPlan from "./ReservationFloorPlan"

it("groups available tables by zone and selects the requested table", async () => {
  const tables: AvailableTable[] = [
    { id: "1", code: "A1", zone: "Main", minPlayers: 2, maxPlayers: 4 },
    { id: "2", code: "B1", zone: "Patio", minPlayers: 4, maxPlayers: 6 },
    { id: "3", code: "A2", zone: "Main", minPlayers: 2, maxPlayers: 6 },
  ]
  const onSelect = vi.fn()

  render(
    <ReservationFloorPlan tables={tables} selected={tables[0]} onSelect={onSelect} />,
  )

  expect(screen.getByText("Main Area")).toBeInTheDocument()
  expect(screen.getByText("Patio Area")).toBeInTheDocument()
  expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
    "A12-4 players",
    "A22-6 players",
    "B14-6 players",
  ])
  expect(screen.getByText("Counter / Entrance")).toBeInTheDocument()

  await userEvent.click(screen.getByRole("button", { name: /B1.*4-6 players/ }))
  expect(onSelect).toHaveBeenCalledWith(tables[1])
})
