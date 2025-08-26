import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Supabase will route here after reset link; session should be in URL hash
    supabase.auth.getSession()
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    try {
      setLoading(true)
      setError(null)
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setMessage('Password updated. You can now sign in.')
      setTimeout(() => navigate('/'), 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-white rounded-xl shadow p-6 space-y-4">
        <h1 className="text-xl font-semibold">Set a new password</h1>
        {message && <div className="text-green-600 text-sm">{message}</div>}
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <input className="w-full border rounded p-3" type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <input className="w-full border rounded p-3" type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <button disabled={loading} className="w-full bg-gray-900 text-white rounded p-3 disabled:opacity-50">{loading ? 'Updating...' : 'Update Password'}</button>
      </form>
    </div>
  )
}


