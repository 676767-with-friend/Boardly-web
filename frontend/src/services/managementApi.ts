import apiClient from './apiClient'

export type Dashboard = { branchName: string; totalTables: number; availableTables: number; unavailableTables: number; activeSessions: number; reservationsToday: number; orders: number; activeBranches: number; activeStaff: number; salesToday: number }
export type Profile = { id: string; firstName: string; lastName: string; displayName: string | null; email: string; phone: string | null }
export type OrderSummary = { orderNumber: string; customerName: string; status: string; fulfillmentMethod: string; pickupBranchName: string | null; totalAmount: number; currency: string; itemCount: number; placedAt: string }
export type UserSummary = { id: string; name: string; email: string; phone: string | null; status: string; roles: string[]; orderCount: number; reservationCount: number; completedVisits: number; lastActivity: string }
export type StaffMember = { id: string; name: string; email: string; phone: string | null; status: string; branchIds: string[]; branchNames: string[]; lastLoginAt: string | null }
export type BranchManagement = { id: string; code: string; name: string; address: string; district: string; province: string | null; postalCode: string | null; phone: string | null; status: string; allowReservations: boolean; tableCount: number; staffCount: number; reservationsToday: number }
export type ProductManagement = { id: string; sku: string; name: string; categoryId: string; categoryName: string; basePrice: number; salePrice: number | null; minPlayers: number; maxPlayers: number; minPlayTimeMinutes: number | null; maxPlayTimeMinutes: number | null; minAge: number | null; difficulty: string; description: string | null; active: boolean; stock: number }
export type InventoryItem = { branchId: string; branchName: string; productId: string; productName: string; sku: string; quantityOnHand: number; reservedQuantity: number; availableQuantity: number; lowStockThreshold: number }
export type StaffBranch = { id: string; name: string }
export type TableZone = { id: string; branchId: string; name: string; sortOrder: number }
export type TableFeature = { id: string; name: string }
export type AdminTable = { id: string; branchId: string; branchName: string; code: string; zoneId: string; zoneName: string; minPlayers: number; maxPlayers: number; operationalStatus: string; sortOrder: number; active: boolean; featureIds: string[]; featureNames: string[] }
export type AdminTableInput = { branchId: string; code: string; zoneId: string; minPlayers: number; maxPlayers: number; operationalStatus: string; sortOrder: number; active: boolean; featureIds: string[] }

export const profileApi = {
  get: () => apiClient.get<Profile>('/me/profile'),
  update: (body: Pick<Profile, 'firstName' | 'lastName' | 'displayName' | 'phone'>) => apiClient.put<Profile>('/me/profile', body),
}

export const staffApi = {
  dashboard: () => apiClient.get<Dashboard>('/staff/dashboard'),
  orders: () => apiClient.get<OrderSummary[]>('/staff/orders'),
  products: (branchId: string) => apiClient.get<InventoryItem[]>(`/staff/products?branchId=${encodeURIComponent(branchId)}`),
  branches: () => apiClient.get<StaffBranch[]>('/staff/branches'),
  adjustInventory: (productId: string, body: { branchId: string; quantityDelta: number }) => apiClient.patch<InventoryItem>(`/staff/inventory/${productId}`, body),
  users: (search = '') => apiClient.get<UserSummary[]>(`/staff/users?search=${encodeURIComponent(search)}`),
}

export const adminApi = {
  dashboard: () => apiClient.get<Dashboard>('/admin/dashboard'),
  orders: () => apiClient.get<OrderSummary[]>('/admin/orders'),
  users: (search = '') => apiClient.get<UserSummary[]>(`/admin/users?search=${encodeURIComponent(search)}`),
  updateUserStatus: (id: string, status: string) => apiClient.patch<UserSummary>(`/admin/users/${id}/status`, { status }),
  staff: () => apiClient.get<StaffMember[]>('/admin/staff'),
  createStaff: (body: unknown) => apiClient.post<StaffMember>('/admin/staff', body),
  updateStaff: (id: string, body: unknown) => apiClient.put<StaffMember>(`/admin/staff/${id}`, body),
  branches: () => apiClient.get<BranchManagement[]>('/admin/branches'),
  createBranch: (body: unknown) => apiClient.post<BranchManagement>('/admin/branches', body),
  updateBranch: (id: string, body: unknown) => apiClient.put<BranchManagement>(`/admin/branches/${id}`, body),
  products: () => apiClient.get<ProductManagement[]>('/admin/products'),
  createProduct: (body: unknown) => apiClient.post<ProductManagement>('/admin/products', body),
  updateProduct: (id: string, body: unknown) => apiClient.put<ProductManagement>(`/admin/products/${id}`, body),
  inventory: (branchId: string) => apiClient.get<InventoryItem[]>(`/admin/inventory?branchId=${encodeURIComponent(branchId)}`),
  adjustInventory: (productId: string, body: { branchId: string; quantityDelta: number; note?: string }) => apiClient.patch<InventoryItem>(`/admin/inventory/${productId}`, body),
  addInventory: (body: { branchId: string; productId: string; quantityOnHand: number; lowStockThreshold: number }) => apiClient.post<InventoryItem>('/admin/inventory', body),
  tableZones: (branchId: string) => apiClient.get<TableZone[]>(`/admin/table-zones?branchId=${encodeURIComponent(branchId)}`),
  tableFeatures: () => apiClient.get<TableFeature[]>('/admin/table-features'),
  tables: (branchId: string) => apiClient.get<AdminTable[]>(`/admin/tables?branchId=${encodeURIComponent(branchId)}`),
  createTable: (body: AdminTableInput) => apiClient.post<AdminTable>('/admin/tables', body),
  updateTable: (id: string, body: AdminTableInput) => apiClient.put<AdminTable>(`/admin/tables/${id}`, body),
  deactivateTable: (id: string) => apiClient.delete<AdminTable>(`/admin/tables/${id}`),
}
