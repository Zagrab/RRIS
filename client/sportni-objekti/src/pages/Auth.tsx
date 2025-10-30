import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../lib/supabase'

export default function Auth() {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (isRegister) {
        // Supabase sign up
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) {
          setError(error.message)
        } else {
          // signUp typically sends confirmation email depending on project settings
          setMessage('Registracija uspešna. Preverite svoj email za potrditev (če je nastavljeno).')
        }
      } else {
        // Sign in
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          setError(error.message)
        } else {
          setMessage('Prijava uspešna. Preusmerjam...')
          // optionally redirect to home or dashboard
          setTimeout(() => navigate('/'), 800)
        }
      }
    } catch (err: any) {
      setError(err?.message ?? String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white rounded-lg shadow">
      <h1 className="text-xl font-semibold mb-3">{isRegister ? 'Registracija' : 'Prijava'}</h1>

      {message && <div className="mb-3 p-3 bg-green-50 text-green-700 border border-green-100 rounded">{message}</div>}
      {error && <div className="mb-3 p-3 bg-red-50 text-red-700 border border-red-100 rounded">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="vas.email@naslov.si"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Geslo</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Geslo"
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Prosimo počakajte...' : isRegister ? 'Registriraj se' : 'Prijavi se'}
          </button>

          <button
            type="button"
            onClick={() => setIsRegister(r => !r)}
            className="text-sm text-blue-600 hover:underline"
          >
            {isRegister ? 'Že imate račun? Prijavite se' : 'Nimate računa? Registrirajte se'}
          </button>
        </div>
      </form>

      <div className="mt-4 text-xs text-gray-500">
        Uporabniki so upravljani z Supabase Auth. Če želite, lahko dodam tudi 'reset password' ali OAuth gumb.
      </div>
    </div>
  )
}
