export default function StockBadge({ s }: { s: number }) {
  if (s === 0) return <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Out of Stock</span>
  if (s <= 3) return <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">Only {s} left</span>
  return <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">In Stock</span>
}