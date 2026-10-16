import apiClient from './apiClient'
import type { BranchDetail, BranchGame, PublicBranch } from '@/types'

export const branchesApi = {
  list: () => apiClient.get<PublicBranch[]>('/branches'),
  get: (id: string) => apiClient.get<BranchDetail>(`/branches/${id}`),
  tables: (id: string) => apiClient.get<unknown[]>(`/branches/${id}/tables`),
  games: (id: string) => apiClient.get<BranchGame[]>(`/branches/${id}/games`),
}
