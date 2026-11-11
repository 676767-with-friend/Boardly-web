export function formatCurrency(value: number, currency = "THB") {
  return new Intl.NumberFormat("en-TH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}
