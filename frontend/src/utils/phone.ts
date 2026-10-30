export const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
}

export const isValidPhone = (value: string) => /^(0[689]\d{8}|0[2-5]\d{7,8})$/.test(value.replace(/\D/g, ""))
