import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BranchSearchDropdown, Btn, ProductCard, Stars, StockBadge } from '@/components/ui'
import { branchesApi } from '@/services/branchesApi'
import { productsApi } from '@/services/productsApi'
import { useCart } from '@/commerce/CartProvider'
import type { BranchDetail, BranchGame, Product, ProductCategory, PublicBranch } from '@/types'
import { fmt } from '@/utils/format'

type AddToCart = (product: Product, quantity?: number) => Promise<void>

const CATEGORY_STYLES = ['bg-violet-50 border-violet-200', 'bg-pink-50 border-pink-200', 'bg-amber-50 border-amber-200', 'bg-teal-50 border-teal-200', 'bg-blue-50 border-blue-200', 'bg-indigo-50 border-indigo-200']

function messageFor(error: unknown, fallback: string) {
  return typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : fallback
}

function StateMessage({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-center py-24 text-[#6E6E73] ${className}`}>{children}</div>
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function formatOperatingTime(value: string | null) {
  return value ? value.slice(0, 5) : ''
}

function ProductGrid({ products, onAddToCart, className = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' }: { products: Product[]; onAddToCart: AddToCart; className?: string }) {
  const navigate = useNavigate()
  return <div className={`grid gap-5 ${className}`}>{products.map(product => <ProductCard key={product.id} product={product} onView={() => navigate(`/products/${product.id}`)} onAddToCart={() => onAddToCart(product)} />)}</div>
}

export function PublicHomePage() {
  const navigate = useNavigate()
  const { addItem } = useCart()
  const onAddToCart: AddToCart = (product, quantity = 1) => addItem(product.id, quantity)
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [popular, setPopular] = useState<Product[]>([])
  const [newArrivals, setNewArrivals] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([productsApi.categories(), productsApi.list({ sort: 'rating', size: 4 }), productsApi.list({ sort: 'newest', size: 4 })])
      .then(([nextCategories, popularPage, newPage]) => { if (active) { setCategories(nextCategories); setPopular(popularPage.content); setNewArrivals(newPage.content) } })
      .catch(nextError => active && setError(messageFor(nextError, 'Unable to load products right now.')))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  return <div>
    <section className="relative h-[92vh] min-h-[600px] flex items-center overflow-hidden bg-[#F5F5F7]"><div className="absolute inset-0"><img src="https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=1600&h=900&fit=crop&auto=format" alt="People enjoying board games" className="w-full h-full object-cover opacity-40" /><div className="absolute inset-0 bg-gradient-to-r from-white via-white/60 to-transparent" /></div><div className="relative max-w-6xl mx-auto px-6 w-full"><div className="max-w-xl"><div className="inline-flex items-center gap-2 bg-[#0071E3]/10 text-[#0071E3] text-sm font-medium px-4 py-2 rounded-full mb-6"><span className="w-2 h-2 bg-[#0071E3] rounded-full animate-pulse" />New arrivals every week</div><h1 className="text-5xl md:text-6xl font-bold text-[#1D1D1F] leading-tight tracking-tight mb-5">Find your next<br />favorite game.</h1><p className="text-lg text-[#6E6E73] mb-8 leading-relaxed">Discover strategy games, party games, family games, and more, or reserve a table and play with friends at our store.</p><div className="flex flex-wrap gap-3"><Btn variant="primary" onClick={() => navigate('/shop')} className="px-7 py-3 text-base">Shop Board Games</Btn><Btn variant="secondary" onClick={() => navigate('/reserve')} className="px-7 py-3 text-base">Reserve a Table</Btn></div></div></div></section>
    <section className="py-20 max-w-6xl mx-auto px-6"><h2 className="text-3xl font-bold text-[#1D1D1F] mb-2">What do you feel like playing?</h2><p className="text-[#6E6E73] mb-10">Browse games by type and find your perfect match.</p>{loading ? <StateMessage>Loading categories...</StateMessage> : error ? <StateMessage>{error}</StateMessage> : categories.length === 0 ? <StateMessage>No categories are available yet.</StateMessage> : <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{categories.map((category, index) => <button key={category.id} onClick={() => navigate('/shop')} className={`${CATEGORY_STYLES[index % CATEGORY_STYLES.length]} border rounded-2xl p-5 flex items-center gap-3 hover:-translate-y-0.5 hover:shadow-md transition-all text-left`}><span className="w-8 h-8 rounded-xl bg-white/70 flex items-center justify-center font-bold text-[#0071E3]">{category.name.slice(0, 1)}</span><span className="font-semibold text-[#1D1D1F]">{category.name}</span></button>)}</div>}</section>
    <section className="py-20 bg-[#F5F5F7]"><div className="max-w-6xl mx-auto px-6"><div className="flex items-end justify-between mb-10"><div><h2 className="text-3xl font-bold text-[#1D1D1F]">Popular right now</h2><p className="text-[#6E6E73] mt-1">Bestselling games our customers love</p></div><Btn variant="ghost" onClick={() => navigate('/shop')} className="px-4 py-2 text-sm hidden sm:flex">View all</Btn></div>{loading ? <StateMessage>Loading popular games...</StateMessage> : error ? <StateMessage>{error}</StateMessage> : popular.length === 0 ? <StateMessage>No products are available yet.</StateMessage> : <ProductGrid products={popular} onAddToCart={onAddToCart} />}</div></section>
    <section className="py-24 max-w-6xl mx-auto px-6"><div className="relative bg-[#1D1D1F] rounded-3xl overflow-hidden p-12 flex flex-col md:flex-row items-center gap-10"><img src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop&auto=format" alt="Board game cafe" className="absolute inset-0 w-full h-full object-cover opacity-25" /><div className="relative flex-1"><h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Play at our store.</h2><p className="text-white/70 text-lg">Reserve a table and enjoy a premium board game session with your friends.</p></div><div className="relative flex flex-col gap-3"><Btn variant="primary" onClick={() => navigate('/reserve')} className="px-8 py-3 text-base whitespace-nowrap">Reserve a Table</Btn><Btn variant="ghost" onClick={() => navigate('/stores')} className="px-8 py-3 text-base text-white hover:bg-white/10 whitespace-nowrap">Visit Store Info</Btn></div></div></section>
    <section className="py-20 bg-[#F5F5F7]"><div className="max-w-6xl mx-auto px-6"><div className="flex items-end justify-between mb-10"><h2 className="text-3xl font-bold text-[#1D1D1F]">New arrivals</h2><Btn variant="ghost" onClick={() => navigate('/shop')} className="px-4 py-2 text-sm hidden sm:flex">View all</Btn></div>{loading ? <StateMessage>Loading new arrivals...</StateMessage> : error ? <StateMessage>{error}</StateMessage> : newArrivals.length === 0 ? <StateMessage>No new products are available yet.</StateMessage> : <ProductGrid products={newArrivals} onAddToCart={onAddToCart} />}</div></section>
    <footer className="border-t border-[#D2D2D7] py-12"><div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4"><div className="font-bold text-lg">Boardly</div><p className="text-sm text-[#6E6E73]">2026 Boardly Board Game Store. Bangkok, Thailand.</p><div className="flex gap-6 text-sm text-[#6E6E73]"><button className="hover:text-[#1D1D1F] transition-colors">Privacy</button><button className="hover:text-[#1D1D1F] transition-colors">Terms</button><button className="hover:text-[#1D1D1F] transition-colors">Contact</button></div></div></footer>
  </div>
}

export function PublicShopPage() {
  const { addItem } = useCart()
  const onAddToCart: AddToCart = (product, quantity = 1) => addItem(product.id, quantity)
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [sort, setSort] = useState('Featured')
  const [difficulty, setDifficulty] = useState<string | null>(null)
  const [priceMax, setPriceMax] = useState(5000)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const sortParams: Record<string, string> = { Featured: 'featured', 'Price: Low to High': 'priceAsc', 'Price: High to Low': 'priceDesc', 'Best Rated': 'rating', Newest: 'newest' }

  useEffect(() => { productsApi.categories().then(setCategories).catch(nextError => setError(messageFor(nextError, 'Unable to load categories.'))) }, [])
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    productsApi.list({ category: activeCategory ?? undefined, difficulty: difficulty?.toLowerCase(), maxPrice: priceMax, sort: sortParams[sort], size: 100 }).then(page => active && setProducts(page.content)).catch(nextError => active && setError(messageFor(nextError, 'Unable to load products right now.'))).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [activeCategory, difficulty, priceMax, sort])

  return <div className="max-w-6xl mx-auto px-6 py-10 flex gap-8"><aside className="hidden md:block w-56 flex-shrink-0"><div className="sticky top-20 space-y-8"><div><h3 className="font-semibold text-[#1D1D1F] mb-3 text-sm uppercase tracking-wide">Category</h3><div className="space-y-2"><button onClick={() => setActiveCategory(null)} className={`block w-full text-left text-sm py-1.5 px-3 rounded-lg transition-colors ${!activeCategory ? 'bg-[#0071E3]/10 text-[#0071E3] font-medium' : 'text-[#6E6E73] hover:text-[#1D1D1F]'}`}>All Games</button>{categories.map(category => <button key={category.id} onClick={() => setActiveCategory(category.name === activeCategory ? null : category.name)} className={`block w-full text-left text-sm py-1.5 px-3 rounded-lg transition-colors ${activeCategory === category.name ? 'bg-[#0071E3]/10 text-[#0071E3] font-medium' : 'text-[#6E6E73] hover:text-[#1D1D1F]'}`}>{category.name}</button>)}</div></div><div><h3 className="font-semibold text-[#1D1D1F] mb-3 text-sm uppercase tracking-wide">Difficulty</h3><div className="space-y-2">{['Easy', 'Medium', 'Advanced', 'Expert'].map(level => <button key={level} onClick={() => setDifficulty(level === difficulty ? null : level)} className={`block w-full text-left text-sm py-1.5 px-3 rounded-lg transition-colors ${difficulty === level ? 'bg-[#0071E3]/10 text-[#0071E3] font-medium' : 'text-[#6E6E73] hover:text-[#1D1D1F]'}`}>{level}</button>)}</div></div><div><h3 className="font-semibold text-[#1D1D1F] mb-3 text-sm uppercase tracking-wide">Price up to {fmt(priceMax)}</h3><input type="range" min={500} max={5000} step={100} value={priceMax} onChange={event => setPriceMax(Number(event.target.value))} className="w-full accent-[#0071E3]" /></div></div></aside><main className="flex-1 min-w-0"><div className="flex items-center justify-between mb-6"><h1 className="text-2xl font-bold text-[#1D1D1F]">Board Games <span className="text-[#6E6E73] font-normal text-lg">({loading ? '...' : products.length})</span></h1><select value={sort} onChange={event => setSort(event.target.value)} className="text-sm border border-[#D2D2D7] rounded-xl px-4 py-2 bg-white text-[#1D1D1F] outline-none focus:border-[#0071E3]">{['Featured', 'Price: Low to High', 'Price: High to Low', 'Best Rated', 'Newest'].map(option => <option key={option}>{option}</option>)}</select></div>{loading ? <StateMessage>Loading games...</StateMessage> : error ? <StateMessage>{error}</StateMessage> : products.length === 0 ? <div className="text-center py-24 text-[#6E6E73]"><div className="font-medium">No games match your filters</div><Btn variant="ghost" onClick={() => { setActiveCategory(null); setDifficulty(null); setPriceMax(5000) }} className="mt-4 px-4 py-2 text-sm">Clear filters</Btn></div> : <ProductGrid products={products} onAddToCart={onAddToCart} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" />}</main></div>
}

export function PublicProductPage() {
  const navigate = useNavigate()
  const { addItem } = useCart()
  const { productId } = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [related, setRelated] = useState<Product[]>([])
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('about')
  const [selectedImage, setSelectedImage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!productId) return
    let active = true
    setLoading(true); setError(null)
    Promise.all([productsApi.get(productId), productsApi.list({ size: 4 })]).then(([detail, page]) => { if (active) { setProduct(detail); setRelated(page.content.filter(item => item.id !== detail.id).slice(0, 3)); setSelectedImage(0) } }).catch(nextError => active && setError(messageFor(nextError, 'Unable to load this product.'))).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [productId])

  if (loading) return <div className="max-w-6xl mx-auto px-6 py-20"><StateMessage>Loading product...</StateMessage></div>
  if (error || !product) return <div className="max-w-6xl mx-auto px-6 py-20"><StateMessage>{error ?? 'This product is not available.'}<br /><button className="mt-4 text-[#0071E3] hover:underline" onClick={() => navigate('/shop')}>Back to shop</button></StateMessage></div>

  const media = product.media?.filter(item => item.type === 'image') ?? []
  const gallery = media.length ? media : [{ id: product.id, url: product.image, altText: product.name }]
  const displayedImage = gallery[Math.min(selectedImage, gallery.length - 1)]
  const reviews = product.reviews ?? []
  const onAddToCart: AddToCart = (item, amount = 1) => addItem(item.id, amount)
  const handleAdd = async () => {
    setAddError(null)
    try {
      await onAddToCart(product, quantity)
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    } catch (nextError) {
      setAddError(nextError instanceof Error ? nextError.message : 'Unable to add this game to your cart.')
    }
  }

  return <div className="max-w-6xl mx-auto px-6 py-10"><div className="flex items-center gap-2 text-sm text-[#6E6E73] mb-8"><button onClick={() => navigate('/')} className="hover:text-[#0071E3]">Home</button><span>/</span><button onClick={() => navigate('/shop')} className="hover:text-[#0071E3]">Shop</button><span>/</span><span className="text-[#1D1D1F]">{product.name}</span></div><div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16"><div className="space-y-3"><div className="aspect-square rounded-3xl overflow-hidden bg-[#F5F5F7]"><img src={displayedImage.url} alt={displayedImage.altText || product.name} className="w-full h-full object-cover" /></div><div className="grid grid-cols-4 gap-2">{gallery.slice(0, 4).map((item, index) => <button key={item.id} onClick={() => setSelectedImage(index)} className={`aspect-square rounded-xl overflow-hidden bg-[#F5F5F7] cursor-pointer border-2 transition-colors ${index === selectedImage ? 'border-[#0071E3]' : 'border-transparent'}`}><img src={item.url} alt={item.altText || product.name} className="w-full h-full object-cover" /></button>)}</div></div><div><span className="text-sm text-[#6E6E73]">{product.category}</span><h1 className="text-3xl font-bold text-[#1D1D1F] mt-1 mb-2">{product.name}</h1><Stars r={product.rating} n={product.reviewCount} /><div className="mt-4 flex items-center gap-3"><span className="text-3xl font-bold text-[#1D1D1F]">{fmt(product.salePrice ?? product.price)}</span>{product.salePrice && <span className="text-sm text-[#6E6E73] line-through">{fmt(product.price)}</span>}<StockBadge s={product.stock} /></div><div className="mt-6 grid grid-cols-2 gap-3">{[{ label: 'Players', value: product.players }, { label: 'Play Time', value: product.playTime }, { label: 'Age', value: product.age }, { label: 'Difficulty', value: product.difficulty }].map(item => <div key={item.label} className="bg-[#F5F5F7] rounded-xl p-3"><div className="text-xs text-[#6E6E73] mb-0.5">{item.label}</div><div className="font-semibold text-[#1D1D1F] text-sm">{item.value}</div></div>)}</div><div className="mt-8 space-y-3"><div className="flex items-center gap-3"><div className="flex items-center border border-[#D2D2D7] rounded-xl overflow-hidden"><button onClick={() => setQuantity(value => Math.max(1, value - 1))} className="px-4 py-3 hover:bg-[#F5F5F7] transition-colors text-lg">-</button><span className="px-4 font-semibold text-[#1D1D1F]">{quantity}</span><button onClick={() => setQuantity(value => value + 1)} className="px-4 py-3 hover:bg-[#F5F5F7] transition-colors text-lg">+</button></div></div><Btn variant="primary" disabled={product.stock === 0} onClick={() => { void handleAdd() }} className="w-full py-3.5 text-base">{added ? 'Added to Cart' : 'Add to Cart'}</Btn>{addError && <div className="text-sm text-red-600">{addError}</div>}<Btn variant="secondary" onClick={() => navigate('/cart')} className="w-full py-3.5 text-base">View Cart</Btn></div></div></div><div className="border-b border-[#D2D2D7] mb-8"><div className="flex gap-8">{['about', 'details', 'reviews'].map(tab => <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 text-sm font-medium capitalize transition-colors border-b-2 ${activeTab === tab ? 'border-[#0071E3] text-[#0071E3]' : 'border-transparent text-[#6E6E73] hover:text-[#1D1D1F]'}`}>{tab === 'about' ? 'About This Game' : tab === 'details' ? 'Game Details' : 'Reviews'}</button>)}</div></div>{activeTab === 'about' && <div className="max-w-2xl"><p className="text-[#1D1D1F] leading-relaxed">{product.description}</p></div>}{activeTab === 'details' && <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl">{[{ label: 'Players', value: product.players }, { label: 'Play Time', value: product.playTime }, { label: 'Recommended Age', value: product.age }, { label: 'Difficulty', value: product.difficulty }, { label: 'Publisher', value: product.publisherName || 'Not specified' }, { label: 'Designer', value: product.designerName || 'Not specified' }, { label: 'Language', value: product.languages || 'Not specified' }, { label: 'SKU', value: product.sku || 'Not specified' }].map(item => <div key={item.label} className="bg-[#F5F5F7] rounded-xl p-3"><div className="text-xs text-[#6E6E73] mb-1">{item.label}</div><div className="text-sm font-semibold text-[#1D1D1F]">{item.value}</div></div>)}</div>}{activeTab === 'reviews' && <div className="max-w-2xl space-y-6">{reviews.length === 0 ? <StateMessage className="py-10">No published reviews yet.</StateMessage> : reviews.map(review => <article key={review.id} className="border border-[#D2D2D7] rounded-2xl p-5"><div className="flex items-center justify-between mb-2"><div className="font-semibold text-[#1D1D1F]">{review.author}</div><div className="text-xs text-[#6E6E73]">{new Date(review.createdAt).toLocaleDateString()}</div></div><Stars r={review.rating} n={0} /><p className="mt-3 text-sm text-[#1D1D1F] leading-relaxed">{review.text}</p></article>)}</div>}<div className="mt-16 bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-200 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-6"><div className="flex-1"><h3 className="text-xl font-bold text-[#1D1D1F] mb-2">Want to try it before buying?</h3><p className="text-[#6E6E73]">Reserve a table at our store and enjoy a board game session with friends.</p></div><Btn variant="primary" onClick={() => navigate('/reserve')} className="px-7 py-3 whitespace-nowrap">Reserve a Table</Btn></div><div className="mt-16"><h2 className="text-2xl font-bold text-[#1D1D1F] mb-6">You may also like</h2>{related.length === 0 ? <StateMessage className="py-10">No additional products are available yet.</StateMessage> : <ProductGrid products={related} onAddToCart={onAddToCart} className="grid-cols-2 md:grid-cols-4" />}</div></div>
}

export function PublicVisitStorePage({ onReserve }: { onReserve: (branchId: string) => void }) {
  const navigate = useNavigate()
  const [branches, setBranches] = useState<PublicBranch[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [branch, setBranch] = useState<BranchDetail | null>(null)
  const [games, setGames] = useState<BranchGame[]>([])
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { let active = true; branchesApi.list().then(nextBranches => active && setBranches(nextBranches)).catch(nextError => active && setError(messageFor(nextError, 'Unable to load branches right now.'))).finally(() => active && setLoading(false)); return () => { active = false } }, [])
  useEffect(() => { if (!selectedId) { setBranch(null); setGames([]); return } let active = true; setDetailLoading(true); setError(null); Promise.all([branchesApi.get(selectedId), branchesApi.games(selectedId)]).then(([detail, nextGames]) => { if (active) { setBranch(detail); setGames(nextGames) } }).catch(nextError => active && setError(messageFor(nextError, 'Unable to load branch details.'))).finally(() => active && setDetailLoading(false)); return () => { active = false } }, [selectedId])
  return <div className="max-w-4xl mx-auto px-6 py-10"><div className="rounded-3xl overflow-hidden mb-8 h-56 relative"><img src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&h=500&fit=crop&auto=format" alt="Boardly store" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8"><div><h1 className="text-3xl font-bold text-white">Visit Our Store</h1><p className="text-white/80 mt-1">Bangkok's premier board game cafes</p></div></div></div><div className="bg-white border border-[#D2D2D7] rounded-2xl p-5 mb-6"><label className="block text-sm font-semibold text-[#1D1D1F] mb-2">Choose a Branch</label><BranchSearchDropdown value={selectedId} onChange={setSelectedId} placeholder="Search or select a branch..." onlyActive={false} branches={branches} /></div>{loading ? <StateMessage>Loading branches...</StateMessage> : error ? <StateMessage>{error}</StateMessage> : !selectedId ? <div className="bg-[#F5F5F7] rounded-2xl p-14 text-center text-[#6E6E73]"><div className="font-semibold text-[#1D1D1F] mb-1">Select a branch to view details</div><div className="text-sm">Choose a Boardly location above to see address, hours, amenities, and available games.</div></div> : detailLoading || !branch ? <StateMessage>Loading branch details...</StateMessage> : <><div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6 flex items-start justify-between gap-4 flex-wrap"><div><div className="flex items-center gap-2 mb-1"><h2 className="text-xl font-bold text-[#1D1D1F]">{branch.name}</h2><span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${branch.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{branch.status === 'active' ? 'Open' : 'Closed'}</span></div><div className="text-sm text-[#6E6E73] space-y-0.5"><div>{branch.address}, {branch.district}</div><div>{branch.hours}</div><div>{branch.phone}</div></div></div><div className="flex items-center gap-2 text-sm font-medium text-[#0071E3]"><span className="text-2xl font-bold text-[#1D1D1F]">{branch.tableCount}</span><span className="text-[#6E6E73] text-xs">tables<br />available</span></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"><div className="bg-white border border-[#D2D2D7] rounded-2xl p-6"><h3 className="font-bold text-[#1D1D1F] mb-4">Opening Hours</h3><div className="space-y-2 text-sm text-[#6E6E73]">{branch.operatingHours.map(hour => <div key={hour.dayOfWeek} className="grid grid-cols-[7rem_1fr] gap-3"><span className="font-medium text-[#1D1D1F]">{WEEKDAYS[hour.dayOfWeek] ?? 'Day'}</span><span>{hour.closed ? 'Closed' : `${formatOperatingTime(hour.openTime)} - ${formatOperatingTime(hour.closeTime)}`}</span></div>)}</div></div><div className="bg-white border border-[#D2D2D7] rounded-2xl p-6"><h3 className="font-bold text-[#1D1D1F] mb-4">Amenities</h3><div className="space-y-2 text-sm text-[#6E6E73]">{branch.amenities.length ? branch.amenities.map(item => <div key={item}>{item}</div>) : <div>No amenities listed.</div>}</div></div><div className="bg-white border border-[#D2D2D7] rounded-2xl p-6"><h3 className="font-bold text-[#1D1D1F] mb-4">Games Available Here</h3><div className="flex flex-wrap gap-2">{games.length ? games.map(game => <span key={game.productId} className="text-xs bg-[#F5F5F7] border border-[#D2D2D7] px-2.5 py-1 rounded-full text-[#1D1D1F] font-medium">{game.name}</span>) : <span className="text-sm text-[#6E6E73]">No playable games listed.</span>}</div></div><div className="bg-white border border-[#D2D2D7] rounded-2xl p-6"><h3 className="font-bold text-[#1D1D1F] mb-4">Store Rules</h3><div className="space-y-2 text-sm text-[#6E6E73]">{branch.rules.length ? branch.rules.map(rule => <div key={rule} className="flex items-start gap-2"><span className="text-[#0071E3] font-bold flex-shrink-0">-</span><span>{rule}</span></div>) : <div>No rules listed.</div>}</div></div></div><div className="flex flex-col sm:flex-row gap-3"><Btn variant="primary" onClick={() => onReserve(branch.id)} disabled={branch.status !== 'active' || !branch.allowReservations} className="flex-1 py-3.5 text-base">Reserve a Table at {branch.name}</Btn><Btn variant="secondary" onClick={() => navigate('/shop')} className="flex-1 py-3.5 text-base">Shop Board Games</Btn></div></>}</div>
}
