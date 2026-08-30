import { useState } from 'react'
import Stars from './Stars'
import Btn from './Btn'
import { fmt } from '@/utils/format'
import type { Product } from '@/types'

export default function ProductCard({ product, onView, onAddToCart }: {
  product: Product; onView: () => void; onAddToCart: () => void | Promise<void>
}) {
  const [liked, setLiked] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const addToCart = async () => {
    setAdding(true)
    setAddError(null)
    try {
      await Promise.resolve(onAddToCart())
    } catch (error) {
      setAddError(error instanceof Error ? error.message : 'Unable to add this game to your cart.')
    } finally {
      setAdding(false)
    }
  }
  return (
    <div className="group bg-white rounded-2xl border border-[#D2D2D7] overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <div className="relative overflow-hidden bg-[#F5F5F7] aspect-square cursor-pointer" onClick={onView}>
        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        {product.isNew && <span className="absolute top-3 left-3 bg-[#0071E3] text-white text-xs font-semibold px-2.5 py-1 rounded-full">New</span>}
        <button
          onClick={e => { e.stopPropagation(); setLiked(l => !l) }}
          className="absolute top-3 right-3 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg className={`w-4 h-4 ${liked ? 'text-red-500 fill-red-500' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>
      <div className="p-4">
        <div className="text-xs text-[#6E6E73] mb-1">{product.category}</div>
        <div className="font-semibold text-[#1D1D1F] mb-1 cursor-pointer hover:text-[#0071E3] transition-colors" onClick={onView}>{product.name}</div>
        <Stars r={product.rating} n={product.reviewCount} />
        <div className="flex items-center gap-3 mt-2 text-xs text-[#6E6E73]">
          <span>{product.players} players</span>
          <span>·</span>
          <span>{product.playTime}</span>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div>
            {product.salePrice
              ? <><span className="font-bold text-[#1D1D1F]">{fmt(product.salePrice)}</span> <span className="text-sm text-[#6E6E73] line-through">{fmt(product.price)}</span></>
              : <span className="font-bold text-[#1D1D1F]">{fmt(product.price)}</span>}
          </div>
          <Btn variant="primary" onClick={() => { void addToCart() }} className="text-sm px-4 py-2" disabled={product.stock === 0 || adding}>
            {adding ? 'Adding...' : 'Add to Cart'}
          </Btn>
        </div>
        {addError && <div className="text-xs text-red-600 mt-2">{addError}</div>}
      </div>
    </div>
  )
}
