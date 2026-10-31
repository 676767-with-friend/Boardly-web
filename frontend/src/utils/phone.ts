export const THAI_PHONE_ERROR =
  "กรุณากรอกหมายเลขโทรศัพท์ไทยให้ถูกต้อง เช่น 0812345678, 02-123-4567 หรือ +66812345678"

const THAI_PHONE =
  /^\s*(?:(?:0[689](?:[ -]?\d){8}|0(?:2(?:[ -]?\d){7}|[3-57]\d(?:[ -]?\d){6})|\+66[ -]?[689](?:[ -]?\d){8}|\+66[ -]?(?:2(?:[ -]?\d){7}|[3-57]\d(?:[ -]?\d){6})))?\s*$/

export function thaiPhoneError(value: string | null | undefined) {
  return THAI_PHONE.test(value ?? "") ? null : THAI_PHONE_ERROR
}

export function normalizeThaiPhone(value: string) {
  const compact = value.trim().replace(/[ -]/g, "")
  return compact.startsWith("+66") ? `0${compact.slice(3)}` : compact
}

export const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
}

export const isValidPhone = (value: string) => /^(0[689]\d{8}|0[2-5]\d{7,8})$/.test(value.replace(/\D/g, ""))
