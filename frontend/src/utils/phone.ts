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
