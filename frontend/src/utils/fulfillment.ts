import type { FulfillmentOption } from "@/types"

const PRIORITY: Record<string, number> = { standard: 0, express: 1, pickup: 2 }

export function sortFulfillmentMethods(methods: FulfillmentOption[]) {
  return [...methods].sort(
    (left, right) =>
      (PRIORITY[left.code] ?? Number.MAX_SAFE_INTEGER) -
      (PRIORITY[right.code] ?? Number.MAX_SAFE_INTEGER),
  )
}

export function fulfillmentLabel(method: FulfillmentOption) {
  return method.code === "pickup" ? "Pick Up" : method.name
}
