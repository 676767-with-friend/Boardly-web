import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { authApi } from '@/services/authApi'
import BoardlyMark from '@/components/branding/BoardlyMark'
import { roleHome } from '@/auth/RouteGuards'

function errorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') return error.message
  return 'Something went wrong. Please try again.'
}

function AuthFrame({ children, backTo = '/' }: { children: React.ReactNode; backTo?: string }) {
  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center px-4 py-10">
      <Link to={backTo} className="fixed top-5 left-5 flex items-center gap-1.5 text-sm font-medium text-[#6E6E73] hover:text-[#1D1D1F] transition-colors bg-white border border-[#D2D2D7] rounded-xl px-3 py-2 shadow-sm">
        <span aria-hidden="true">&larr;</span> Back
      </Link>
      {children}
    </div>
  )
}

function BrandHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center mb-6">
      <BoardlyMark className="block text-3xl leading-none mb-2" />
      <h1 className="text-2xl font-bold text-[#1D1D1F]">{title}</h1>
      {subtitle && <p className="text-sm text-[#6E6E73] mt-1">{subtitle}</p>}
    </div>
  )
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-[#1D1D1F] mb-1.5">{label}</span>
      <input {...props} className={`w-full border border-[#D2D2D7] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0071E3] transition-colors ${props.className ?? ''}`} />
    </label>
  )
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!email || !password) return setError('Enter your email and password.')
    setSubmitting(true)
    try {
      const user = await login(email, password, rememberMe)
      const requested = (location.state as { from?: string } | null)?.from
      const home = roleHome(user.roles)
      const destination = user.roles.includes('admin')
        ? (requested?.startsWith('/admin') ? requested : home)
        : user.roles.includes('staff')
          ? (requested?.startsWith('/staff') ? requested : home)
          : (requested && !requested.startsWith('/staff') && !requested.startsWith('/admin') ? requested : home)
      navigate(destination, { replace: true })
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthFrame>
      <form onSubmit={submit} className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm">
        <BrandHeading title="Boardly" subtitle="Sign in to continue" />
        <div className="space-y-4">
          <Field label="Email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} />
          <Field label="Password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} />
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-[#6E6E73] cursor-pointer">
              <input type="checkbox" checked={rememberMe} onChange={event => setRememberMe(event.target.checked)} className="rounded accent-[#0071E3]" />
              Remember me
            </label>
            <Link to="/forgot-password" className="text-[#0071E3] hover:underline">Forgot password?</Link>
          </div>
          {error && <p role="alert" className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={submitting} className="w-full py-3.5 text-base rounded-xl font-medium bg-[#0071E3] text-white hover:bg-[#0077ED] disabled:bg-gray-300 transition-colors">
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </div>
        <div className="mt-5 text-center text-sm text-[#6E6E73]">
          Don&apos;t have an account? <Link to="/register" className="text-[#0071E3] font-medium hover:underline">Create Account</Link>
        </div>
      </form>
    </AuthFrame>
  )
}

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [values, setValues] = useState({ firstName: '', lastName: '', displayName: '', email: '', phone: '', password: '', confirmPassword: '', consent: false })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const set = (field: keyof typeof values, value: string | boolean) => setValues(previous => ({ ...previous, [field]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!values.firstName || !values.lastName || !values.email) return setError('Complete your name and email address.')
    if (values.password.length < 12) return setError('Password must be at least 12 characters.')
    if (values.password !== values.confirmPassword) return setError('Passwords do not match.')
    if (!values.consent) return setError('Please accept the terms and privacy policy.')
    setSubmitting(true)
    try {
      await register({
        firstName: values.firstName,
        lastName: values.lastName,
        displayName: values.displayName || undefined,
        email: values.email,
        phone: values.phone || undefined,
        password: values.password,
        acceptTerms: true,
        acceptPrivacy: true,
      })
      navigate('/account', { replace: true })
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthFrame>
      <form onSubmit={submit} className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm">
        <BrandHeading title="Create Account" subtitle="Join Boardly for a seamless experience" />
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name" value={values.firstName} onChange={event => set('firstName', event.target.value)} />
            <Field label="Last Name" value={values.lastName} onChange={event => set('lastName', event.target.value)} />
          </div>
          <Field label="Display Name" value={values.displayName} onChange={event => set('displayName', event.target.value)} />
          <Field label="Email" type="email" autoComplete="email" value={values.email} onChange={event => set('email', event.target.value)} />
          <Field label="Phone" type="tel" autoComplete="tel" value={values.phone} onChange={event => set('phone', event.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Password" type="password" autoComplete="new-password" value={values.password} onChange={event => set('password', event.target.value)} />
            <Field label="Confirm" type="password" autoComplete="new-password" value={values.confirmPassword} onChange={event => set('confirmPassword', event.target.value)} />
          </div>
          <p className="text-xs text-[#6E6E73]">Use at least 12 characters.</p>
          <label className="flex items-start gap-2 text-xs text-[#6E6E73] cursor-pointer">
            <input type="checkbox" checked={values.consent} onChange={event => set('consent', event.target.checked)} className="mt-0.5 rounded accent-[#0071E3]" />
            <span>I agree to the <span className="text-[#0071E3]">Terms &amp; Conditions</span> and <span className="text-[#0071E3]">Privacy Policy</span>.</span>
          </label>
          {error && <p role="alert" className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={submitting} className="w-full py-3 text-sm rounded-xl font-medium bg-[#0071E3] text-white hover:bg-[#0077ED] disabled:bg-gray-300 transition-colors">
            {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </div>
        <div className="mt-4 text-center text-sm text-[#6E6E73]">Already have an account? <Link to="/login" className="text-[#0071E3] hover:underline">Sign In</Link></div>
      </form>
    </AuthFrame>
  )
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setDevResetUrl(null)
    if (!email) return setError('Enter your email address.')
    setSubmitting(true)
    try {
      const response = await authApi.forgotPassword(email)
      setMessage(response.message)
      setDevResetUrl(response.devResetUrl ?? null)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthFrame backTo="/login">
      <form onSubmit={submit} className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm">
        <BrandHeading title="Reset your password" subtitle="Enter your account email and we will help you continue." />
        <div className="space-y-4">
          <Field label="Email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} />
          {error && <p role="alert" className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
          {message && <p role="status" className="rounded-xl bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-[#1D1D1F]">{message}</p>}
          {devResetUrl && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><strong>Development only:</strong> <Link className="text-[#0071E3] underline break-all" to={devResetUrl.replace(/^https?:\/\/[^/]+/, '')}>Continue to password reset</Link></div>}
          <button type="submit" disabled={submitting} className="w-full py-3.5 text-base rounded-xl font-medium bg-[#0071E3] text-white hover:bg-[#0077ED] disabled:bg-gray-300 transition-colors">
            {submitting ? 'Sending...' : 'Request reset'}
          </button>
        </div>
        <div className="mt-5 text-center text-sm text-[#6E6E73]">Remembered it? <Link to="/login" className="text-[#0071E3] hover:underline">Sign In</Link></div>
      </form>
    </AuthFrame>
  )
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(token ? '' : 'This reset link is invalid or incomplete.')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!token) return setError('This reset link is invalid or incomplete.')
    if (password.length < 12) return setError('Password must be at least 12 characters.')
    if (password !== confirmPassword) return setError('Passwords do not match.')
    setSubmitting(true)
    try {
      await authApi.resetPassword(token, password)
      setSuccess(true)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthFrame backTo="/login">
      <form onSubmit={submit} className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm">
        <BrandHeading title="Choose a new password" subtitle="Your existing Boardly sessions will be signed out." />
        {success ? (
          <div className="space-y-4 text-center">
            <p role="status" className="rounded-xl bg-blue-50 border border-blue-200 px-3 py-3 text-sm text-[#1D1D1F]">Your password has been reset successfully.</p>
            <button type="button" onClick={() => navigate('/login', { replace: true })} className="w-full py-3.5 text-base rounded-xl font-medium bg-[#0071E3] text-white hover:bg-[#0077ED] transition-colors">Return to Sign In</button>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="New Password" type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} />
            <Field label="Confirm Password" type="password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />
            <p className="text-xs text-[#6E6E73]">Use at least 12 characters.</p>
            {error && <p role="alert" className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={submitting || !token} className="w-full py-3.5 text-base rounded-xl font-medium bg-[#0071E3] text-white hover:bg-[#0077ED] disabled:bg-gray-300 transition-colors">
              {submitting ? 'Resetting password...' : 'Reset Password'}
            </button>
          </div>
        )}
      </form>
    </AuthFrame>
  )
}
