export type UserMode = 'guest' | 'customer' | 'staff' | 'admin'

export interface Product {
  id: string
  name: string
  category: string
  price: number
  players: string
  playTime: string
  age: string
  difficulty: 'Easy' | 'Medium' | 'Advanced' | 'Expert'
  rating: number
  reviewCount: number
  stock: number
  image: string
  description: string
  isNew?: boolean
  salePrice?: number
  sku?: string
  publisherName?: string | null
  designerName?: string | null
  languages?: string | null
  media?: ProductMedia[]
  reviews?: ProductReview[]
}

export interface ProductMedia {
  id: string
  url: string
  type: string
  altText: string | null
  primary: boolean
  sortOrder: number
}

export interface ProductReview {
  id: string
  author: string
  rating: number
  text: string | null
  createdAt: string
}

export interface ProductCategory {
  id: string
  code: string
  name: string
}

export interface ProductPage {
  content: Product[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export interface PublicBranch {
  id: string
  code: string
  name: string
  address: string
  district: string
  province: string | null
  postalCode: string | null
  phone: string | null
  status: 'active' | 'inactive'
  allowReservations: boolean
  hours: string
  tableCount: number
  playableGameCount: number
}

export interface BranchDetail extends PublicBranch {
  operatingHours: Array<{ dayOfWeek: number; openTime: string | null; closeTime: string | null; closed: boolean }>
  amenities: string[]
  rules: string[]
}

export interface BranchGame {
  productId: string
  name: string
  image: string | null
  playableCopies: number | null
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface ApiCartItem {
  id: string
  productId: string
  name: string
  sku: string
  image: string | null
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface CartResponse {
  id: string | null
  items: ApiCartItem[]
  itemCount: number
  subtotal: number
  currency: string
}

export interface FulfillmentOption {
  id: string
  code: string
  name: string
  baseFee: number
  etaMinDays: number | null
  etaMaxDays: number | null
  storePickup: boolean
  checkoutAvailable: boolean
  unavailableReason: string | null
}

export interface PaymentMethodOption {
  id: string
  code: string
  name: string
}

export interface CheckoutOptions {
  fulfillmentMethods: FulfillmentOption[]
  paymentMethods: PaymentMethodOption[]
  eligiblePickupBranches: PickupBranchOption[]
}

export interface PickupBranchOption {
  id: string
  name: string
  address: string
  district: string
}

export interface OrderItemResponse {
  productId: string | null
  name: string
  sku: string | null
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface OrderResponse {
  orderNumber: string
  status: string
  fulfillmentMethod: string
  pickupBranchName: string | null
  subtotal: number
  shippingFee: number
  totalAmount: number
  currency: string
  estimatedDeliveryDate: string | null
  paymentStatus: string | null
  paymentMethod: string | null
  items: OrderItemResponse[]
}

export interface TableData {
  id: string
  zone: string
  capacity: string
  minPlayers: number
  maxPlayers: number
  status: 'available' | 'reserved' | 'occupied' | 'unavailable'
  features: string[]
  client?: string
  players?: number
  checkIn?: string
  elapsed?: string
  fee?: number
}

export interface ReservationFlow {
  step: number
  branchId: string | null
  date: string
  time: string
  duration: number
  players: number
  tableId: string | null
}

export interface Branch {
  id: string
  name: string
  address: string
  district: string
  hours: string
  tables: number
  staff: number
  reservationsToday: number
  status: 'active' | 'inactive'
  phone: string
  code: string
}

export interface StaffMember {
  id: string
  name: string
  email: string
  phone: string
  branch: string
  status: 'Active' | 'Inactive'
  lastLogin: string
}

export interface OrderRecord {
  id: string
  name: string
  date: string
  items: number
  total: number
  method: string
  status: string
}

export interface UserRecord {
  id: string
  name: string
  email: string
  phone: string
  status: string
  orders: number
  reservations: number
  visits: number
  lastActivity: string
}

export interface WalkInClient {
  id: string
  name: string
  phone: string
  email: string
  status: string
}
