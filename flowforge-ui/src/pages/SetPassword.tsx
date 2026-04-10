import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Sparkles, Eye, EyeOff, AlertCircle, CheckCircle, Shield } from 'lucide-react'
import { validateInvitation, acceptInvitation } from '../api/invitation'
import type { InvitationDetails } from '../api/invitation'
import { useAuthStore } from '../store/authStore'

const SetPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { login: storeLogin } = useAuthStore()

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null)
  const [isValidating, setIsValidating] = useState(true)
  const [validationError, setValidationError] = useState<string | null>(null)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!token) {
      setValidationError('No invitation token provided.')
      setIsValidating(false)
      return
    }

    const validate = async () => {
      try {
        const details = await validateInvitation(token)
        if (details.status === 'EXPIRED') {
          setValidationError('This invitation has expired. Please ask your administrator to send a new one.')
        } else if (details.status === 'ACCEPTED') {
          setValidationError('This invitation has already been accepted. Please sign in instead.')
        } else {
          setInvitation(details)
        }
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'This invitation link is invalid or has expired.'
        setValidationError(message)
      } finally {
        setIsValidating(false)
      }
    }
    validate()
  }, [token])

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    if (!password) errors.password = 'Password is required'
    else if (password.length < 8) errors.password = 'Password must be at least 8 characters'
    if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm() || !token) return

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await acceptInvitation(token, password)
      storeLogin(res.user, res.token)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to set password. Please try again.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl p-3 mb-3 shadow-lg shadow-indigo-200">
              <Sparkles size={28} className="text-white" />
            </div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">FlowForge</h1>
              <span className="text-[10px] font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-1.5 py-0.5 rounded-full leading-none">AI</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="flex items-center justify-center gap-3">
              <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-600 text-sm">Validating your invitation...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state (invalid/expired token)
  if (validationError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl p-3 mb-3 shadow-lg shadow-indigo-200">
              <Sparkles size={28} className="text-white" />
            </div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">FlowForge</h1>
              <span className="text-[10px] font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-1.5 py-0.5 rounded-full leading-none">AI</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={24} className="text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Invitation Invalid</h2>
            <p className="text-sm text-gray-500 mb-6">{validationError}</p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Valid invitation — show set password form
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl p-3 mb-3 shadow-lg shadow-indigo-200">
            <Sparkles size={28} className="text-white" />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">FlowForge</h1>
            <span className="text-[10px] font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-1.5 py-0.5 rounded-full leading-none">AI</span>
          </div>
          <p className="text-gray-500 text-sm">Set your password to get started</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* Join header */}
          <div className="flex items-center gap-2 mb-6">
            <Shield size={18} className="text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Join {invitation?.orgName}</h2>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6 text-sm">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Organization (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Organization</label>
              <input
                type="text"
                readOnly
                value={invitation?.orgName || ''}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>

            {/* Name (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name</label>
              <input
                type="text"
                readOnly
                value={invitation?.name || ''}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                readOnly
                value={invitation?.email || ''}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              {fieldErrors.password && <p className="text-xs text-red-600 mb-1">{fieldErrors.password}</p>}
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className={`w-full border rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${fieldErrors.confirmPassword ? 'border-red-400' : 'border-gray-300'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Setting up your account...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Set Password & Join
                </>
              )}
            </button>
          </form>
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

export default SetPassword
