export default function Btn({ children, variant = 'primary', onClick, className = '', disabled = false }: {
  children: React.ReactNode; variant?: 'primary'|'secondary'|'ghost'|'danger'
  onClick?: () => void; className?: string; disabled?: boolean
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 rounded-xl select-none'
  const variants = {
    primary: 'bg-[#0071E3] text-white hover:bg-[#0077ED] active:bg-[#006FD6] disabled:bg-gray-300 disabled:text-gray-400',
    secondary: 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-gray-200 active:bg-gray-300',
    ghost: 'bg-transparent text-[#0071E3] hover:bg-blue-50',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  }
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  )
}