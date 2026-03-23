import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { register } from '../api/auth'
import { useAuthStore } from '../store/authStore'

const plans = [
  { id: 'FREE', label: 'Free', price: '$0/mo', features: '3 workflows, 1K executions' },
  { id: 'PRO', label: 'Pro', price: '$49/mo', features: 'Unlimited workflows, 100K executions' },
  { id: 'ENTERPRISE', label: 'Enterprise', price: 'Custom', features: 'Dedicated infra, SLA guarantee' },
]

const Register: React.FC = () => {
  const navigate = useNavigate()
  const { login: storeLogin } = useAuthStore()

  const [form, setForm] = useState({
    orgName: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    plan: 'FREE',
    webhookUrl: '',
    terms: false,
  })

  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    if (!form.orgName.trim()) errors.orgName = 'Organization name is required'
    if (!form.name.trim()) errors.name = 'Your name is required'
    if (!form.email.trim()) errors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Invalid email address'
    if (!form.password) errors.password = 'Password is required'
    else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters'
    if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match'
    if (!form.terms) errors.terms = 'You must accept the terms'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await register({
        orgName: form.orgName,
        name: form.name,
        email: form.email,
        password: form.password,
        plan: form.plan,
        webhookUrl: form.webhookUrl || undefined,
      })
      storeLogin(res.user, res.token)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Registration failed. Please try again.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const Field = ({ id, label, error }: { id: string; label: string; error?: string }) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      {error && <p className="text-xs text-red-600 mb-1">{error}</p>}
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl p-3 mb-3 shadow-lg shadow-indigo-200">
            <Sparkles size={28} className="text-white" />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">FlowForge</h1>
            <span className="text-[10px] font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-1.5 py-0.5 rounded-full leading-none">AI</span>
          </div>
          <p className="text-gray-500 text-sm">Create your account — it's free</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {error && (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6 text-sm">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Org name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Organization Name</label>
              {fieldErrors.orgName && <p className="text-xs text-red-600 mb-1">{fieldErrors.orgName}</p>}
              <input
                type="text"
                value={form.orgName}
                onChange={(e) => setForm({ ...form, orgName: e.target.value })}
                placeholder="Acme Corp"
                className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${fieldErrors.orgName ? 'border-red-400' : 'border-gray-300'}`}
              />
            </div>

            {/* Your name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name</label>
              {fieldErrors.name && <p className="text-xs text-red-600 mb-1">{fieldErrors.name}</p>}
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jane Smith"
                className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${fieldErrors.name ? 'border-red-400' : 'border-gray-300'}`}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Work Email</label>
              {fieldErrors.email && <p className="text-xs text-red-600 mb-1">{fieldErrors.email}</p>}
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@company.com"
                className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${fieldErrors.email ? 'border-red-400' : 'border-gray-300'}`}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              {fieldErrors.password && <p className="text-xs text-red-600 mb-1">{fieldErrors.password}</p>}
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min 8 characters"
                  className={`w-full border rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${fieldErrors.password ? 'border-red-400' : 'border-gray-300'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
              {fieldErrors.confirmPassword && <p className="text-xs text-red-600 mb-1">{fieldErrors.confirmPassword}</p>}
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="••••••••"
                className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${fieldErrors.confirmPassword ? 'border-red-400' : 'border-gray-300'}`}
              />
            </div>

            {/* Plan selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Plan</label>
              <div className="grid grid-cols-3 gap-2">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setForm({ ...form, plan: plan.id })}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      form.plan === plan.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-gray-900">{plan.label}</span>
                      {form.plan === plan.id && <CheckCircle size={12} className="text-blue-600" />}
                    </div>
                    <p className="text-xs text-blue-600 font-medium">{plan.price}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-tight">{plan.features}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Webhook URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Webhook URL <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="url"
                value={form.webhookUrl}
                onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
                placeholder="https://your-app.com/webhooks"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            {/* Terms */}
            <div>
              {fieldErrors.terms && <p className="text-xs text-red-600 mb-1">{fieldErrors.terms}</p>}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.terms}
                  onChange={(e) => setForm({ ...form, terms: e.target.checked })}
                  className="mt-0.5 rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">
                  I agree to the{' '}
                  <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>{' '}
                  and{' '}
                  <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors shadow-sm"
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <Field id="dummy" label="" />
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 font-medium hover:text-blue-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Register
