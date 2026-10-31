import type { PublicBranch } from "@/types"

type BranchLocation = Pick<PublicBranch, "address" | "district" | "province" | "postalCode">

export function branchAddress(branch: BranchLocation) {
  return [branch.address, branch.district, branch.province, branch.postalCode]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(", ")
}

export function branchMapUrl(branch: BranchLocation) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branchAddress(branch))}`
}
