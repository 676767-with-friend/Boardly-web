import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

import { MemoryRouter, Route, Routes } from "react-router-dom"

import {
  PublicHomePage,
  PublicShopPage,
  PublicProductPage,
  PublicVisitStorePage,
} from "../features/PublicReadPages"
import { productsApi } from "@/services/productsApi"
import { branchesApi } from "@/services/branchesApi"

const addItem = vi.hoisted(() => vi.fn())

// Mock API และ Cart Provider

vi.mock("@/services/productsApi", () => ({
  productsApi: {
    categories: vi.fn().mockResolvedValue([{ id: "c1", name: "Strategy" }]),

    list: vi.fn().mockResolvedValue({
      content: [
        {
          id: "p1",
          name: "Catan",
          category: "Strategy",
          price: 1500,
          rating: 4.8,
          reviewCount: 10,
          stock: 5,
          image: "test.jpg",
          players: "3-4",
          playTime: "90m",
          age: "10+",
          difficulty: "Medium",
        },
      ],
    }),

    get: vi.fn().mockResolvedValue({
      id: "p1",
      name: "Catan",
      category: "Strategy",
      price: 1500,
      rating: 4.8,
      reviewCount: 10,
      stock: 5,
      image: "test.jpg",
      players: "3-4",
      playTime: "90m",
      age: "10+",
      difficulty: "Medium",
      description: "Great game",
    }),
  },
}))

vi.mock("@/commerce/CartProvider", () => ({
  useCart: () => ({
    addItem,

    cart: { items: [], itemCount: 0, subtotal: 0 },
  }),
}))

vi.mock("@/services/branchesApi", () => ({
  branchesApi: (() => {
    const branch = (
      id: string,
      name: string,
      address: string,
      district: string,
      postalCode: string,
    ) => ({
      id,
      code: id,
      name,
      address,
      district,
      province: "Bangkok",
      postalCode,
      phone: "02-123-4567",
      status: "active",
      allowReservations: true,
      hours: "10:00 - 22:00",
      tableCount: 5,
      playableGameCount: 10,
      operatingHours: [],
      amenities: [],
      rules: [],
    })
    const central = branch(
      "central",
      "Central Branch",
      "1 Rama I Road",
      "Pathum Wan",
      "10330",
    )
    const silom = branch(
      "silom",
      "Silom Branch",
      "2 Silom Road",
      "Bang Rak",
      "10500",
    )
    return {
      list: vi.fn().mockResolvedValue([central, silom]),
      get: vi.fn((id: string) =>
        Promise.resolve(id === "central" ? central : silom),
      ),
      games: vi.fn().mockResolvedValue([]),
    }
  })(),
}))

describe("Public Pages Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    addItem.mockResolvedValue(undefined)
  })

  it("renders PublicHomePage hero and sections correctly", async () => {
    render(
      <MemoryRouter>
        <PublicHomePage />
      </MemoryRouter>,
    )

    // ใช้ฟังก์ชัน matcher เพื่อรองรับข้อความที่ถูกคั่นด้วย <br />

    expect(
      await screen.findByText((content) => content.includes("Find your next")),
    ).toBeInTheDocument()

    expect(screen.getByText("Popular right now")).toBeInTheDocument()
  })

  it("renders PublicShopPage and loads products", async () => {
    render(
      <MemoryRouter>
        <PublicShopPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText("Board Games")).toBeInTheDocument()
  })

  it("renders PublicProductPage details correctly", async () => {
    render(
      <MemoryRouter initialEntries={["/products/p1"]}>
        <Routes>
          <Route path="/products/:productId" element={<PublicProductPage />} />
        </Routes>
      </MemoryRouter>,
    )

    // ใช้ getAllByText และเลือกตัวที่เป็นหัวข้อหลัก (Heading)

    const catanElements = await screen.findAllByText("Catan")

    expect(catanElements.length).toBeGreaterThan(0)

    expect(screen.getByText("Great game")).toBeInTheDocument()
  })

  it("shows the selected branch full address and a corresponding map link", async () => {
    render(
      <MemoryRouter>
        <PublicVisitStorePage onReserve={vi.fn()} />
      </MemoryRouter>,
    )

    fireEvent.click(
      await screen.findByRole("button", { name: /Search or select a branch/i }),
    )
    fireEvent.click(
      await screen.findByRole("option", { name: /Central Branch/i }),
    )
    expect(
      await screen.findByText("1 Rama I Road, Pathum Wan, Bangkok, 10330"),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Open in Google Maps" }),
    ).toHaveAttribute(
      "href",
      expect.stringContaining(
        encodeURIComponent("1 Rama I Road, Pathum Wan, Bangkok, 10330"),
      ),
    )

    fireEvent.click(
      screen.getByRole("button", { name: /Central Branch.*Pathum Wan/i }),
    )
    fireEvent.click(
      await screen.findByRole("option", { name: /Silom Branch/i }),
    )
    expect(
      await screen.findByText("2 Silom Road, Bang Rak, Bangkok, 10500"),
    ).toBeInTheDocument()
  })

  it("shows home loading failures and empty catalog states", async () => {
    vi.mocked(productsApi.categories).mockRejectedValueOnce("offline")
    const failed = render(
      <MemoryRouter>
        <PublicHomePage />
      </MemoryRouter>,
    )
    expect(
      await screen.findAllByText("Unable to load products right now."),
    ).toHaveLength(3)
    failed.unmount()

    vi.mocked(productsApi.categories).mockResolvedValueOnce([])
    vi.mocked(productsApi.list)
      .mockResolvedValueOnce({ content: [] } as never)
      .mockResolvedValueOnce({ content: [] } as never)
    render(
      <MemoryRouter>
        <PublicHomePage />
      </MemoryRouter>,
    )
    expect(
      await screen.findByText("No categories are available yet."),
    ).toBeInTheDocument()
    expect(
      screen.getByText("No products are available yet."),
    ).toBeInTheDocument()
    expect(
      screen.getByText("No new products are available yet."),
    ).toBeInTheDocument()
  })

  it("applies shop filters, adds products, and opens the selected product", async () => {
    render(
      <MemoryRouter initialEntries={["/shop"]}>
        <Routes>
          <Route path="/shop" element={<PublicShopPage />} />
          <Route
            path="/products/:productId"
            element={<h1>Selected product</h1>}
          />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByText("Catan")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Strategy" }))
    await waitFor(() =>
      expect(productsApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ category: "Strategy" }),
      ),
    )
    fireEvent.click(screen.getByRole("button", { name: "Easy" }))
    fireEvent.change(screen.getByRole("slider"), { target: { value: "2500" } })
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Price: Low to High" },
    })
    await waitFor(() =>
      expect(productsApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({
          difficulty: "easy",
          maxPrice: 2500,
          sort: "priceAsc",
        }),
      ),
    )

    fireEvent.click(screen.getByRole("button", { name: "Add to Cart" }))
    await waitFor(() => expect(addItem).toHaveBeenCalledWith("p1", 1))
    fireEvent.click(screen.getByText("Catan"))
    expect(
      await screen.findByRole("heading", { name: "Selected product" }),
    ).toBeInTheDocument()
  })

  it("renders product media, details, reviews, quantity, and cart feedback", async () => {
    vi.mocked(productsApi.get).mockResolvedValueOnce({
      id: "p1",
      name: "Catan",
      category: "Strategy",
      price: 1500,
      salePrice: 1200,
      rating: 4.8,
      reviewCount: 1,
      stock: 5,
      image: "fallback.jpg",
      players: "3-4",
      playTime: "90m",
      age: "10+",
      difficulty: "Medium",
      description: "Great game",
      publisherName: "Kosmos",
      designerName: "Klaus Teuber",
      languages: "English, Thai",
      sku: "CATAN-001",
      media: [
        { id: "m1", type: "image", url: "one.jpg", altText: "Box front" },
        { id: "m2", type: "image", url: "two.jpg", altText: "Game board" },
      ],
      reviews: [
        {
          id: "r1",
          author: "Ada",
          rating: 5,
          text: "Excellent strategy game",
          createdAt: "2026-10-30T00:00:00Z",
        },
      ],
    } as never)
    vi.mocked(productsApi.list).mockResolvedValueOnce({ content: [] } as never)
    render(
      <MemoryRouter initialEntries={["/products/p1"]}>
        <Routes>
          <Route path="/products/:productId" element={<PublicProductPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(
      await screen.findByRole("heading", { name: "Catan" }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Game board/ }))
    expect(
      screen.getAllByRole("img", { name: "Game board" })[0],
    ).toHaveAttribute("src", "two.jpg")
    fireEvent.click(screen.getByRole("button", { name: "+" }))
    fireEvent.click(screen.getByRole("button", { name: "Add to Cart" }))
    await waitFor(() => expect(addItem).toHaveBeenCalledWith("p1", 2))
    expect(screen.getByRole("button", { name: "Added to Cart" })).toBeEnabled()

    fireEvent.click(screen.getByRole("button", { name: "Game Details" }))
    expect(screen.getByText("Kosmos")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Reviews" }))
    expect(screen.getByText("Excellent strategy game")).toBeInTheDocument()
    expect(
      screen.getByText("No additional products are available yet."),
    ).toBeInTheDocument()
  })

  it("reports product loading and add-to-cart failures", async () => {
    vi.mocked(productsApi.get).mockRejectedValueOnce(
      new Error("Product offline"),
    )
    const failed = render(
      <MemoryRouter initialEntries={["/products/p1"]}>
        <Routes>
          <Route path="/products/:productId" element={<PublicProductPage />} />
          <Route path="/shop" element={<h1>Shop fallback</h1>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByText("Product offline")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Back to shop" }))
    expect(
      await screen.findByRole("heading", { name: "Shop fallback" }),
    ).toBeInTheDocument()
    failed.unmount()

    addItem.mockRejectedValueOnce("cart offline")
    render(
      <MemoryRouter initialEntries={["/products/p1"]}>
        <Routes>
          <Route path="/products/:productId" element={<PublicProductPage />} />
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.click(await screen.findByRole("button", { name: "Add to Cart" }))
    expect(
      await screen.findByText("Unable to add this game to your cart."),
    ).toBeInTheDocument()
  })

  it("reports branch list and detail failures", async () => {
    vi.mocked(branchesApi.list).mockRejectedValueOnce(
      new Error("Branch directory offline"),
    )
    const listFailure = render(
      <MemoryRouter>
        <PublicVisitStorePage onReserve={vi.fn()} />
      </MemoryRouter>,
    )
    expect(
      await screen.findByText("Branch directory offline"),
    ).toBeInTheDocument()
    listFailure.unmount()

    vi.mocked(branchesApi.get).mockRejectedValueOnce(
      new Error("Branch details offline"),
    )
    render(
      <MemoryRouter>
        <PublicVisitStorePage onReserve={vi.fn()} />
      </MemoryRouter>,
    )
    fireEvent.click(
      await screen.findByRole("button", { name: /Search or select a branch/i }),
    )
    fireEvent.click(screen.getByRole("option", { name: /Central Branch/i }))
    expect(
      await screen.findByText("Branch details offline"),
    ).toBeInTheDocument()
  })

  it("renders branch operations and reserves only an active location", async () => {
    const onReserve = vi.fn()
    vi.mocked(branchesApi.get).mockResolvedValueOnce({
      id: "central",
      code: "central",
      name: "Central Branch",
      address: "1 Rama I Road",
      district: "Pathum Wan",
      province: "Bangkok",
      postalCode: "10330",
      phone: "02-123-4567",
      status: "active",
      allowReservations: true,
      hours: "10:00 - 22:00",
      tableCount: 5,
      playableGameCount: 1,
      operatingHours: [
        {
          dayOfWeek: 0,
          closed: false,
          openTime: "10:00:00",
          closeTime: "22:00:00",
        },
        { dayOfWeek: 1, closed: true, openTime: null, closeTime: null },
      ],
      amenities: ["Wi-Fi"],
      rules: ["Respect other tables"],
    } as never)
    vi.mocked(branchesApi.games).mockResolvedValueOnce([
      { productId: "p1", name: "Catan" },
    ] as never)
    render(
      <MemoryRouter>
        <PublicVisitStorePage onReserve={onReserve} />
      </MemoryRouter>,
    )
    fireEvent.click(
      await screen.findByRole("button", { name: /Search or select a branch/i }),
    )
    fireEvent.click(screen.getByRole("option", { name: /Central Branch/i }))
    expect(await screen.findAllByText("10:00 - 22:00")).toHaveLength(2)
    expect(screen.getByText("Closed")).toBeInTheDocument()
    expect(screen.getByText("Wi-Fi")).toBeInTheDocument()
    expect(screen.getByText("Respect other tables")).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole("button", { name: "Reserve a Table at Central Branch" }),
    )
    expect(onReserve).toHaveBeenCalledWith("central")
  })
})
