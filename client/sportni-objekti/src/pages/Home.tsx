import { useEffect, useState } from 'react'
import supabase from '../lib/supabase'
import useAuth from '../lib/useAuth'

type Facility = {
  id: number
  name: string
  capacity?: number
  notes?: string
}

export default function Home() {
  const { user } = useAuth()
  const [facilities, setFacilities] = useState<Facility[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        setError('Supabase env vars not set. See .env.example')
        return
      }
      setLoading(true)
      const { data, error } = await supabase.from('facilities').select('id,name,capacity,notes').limit(20)
      if (!mounted) return
      if (error) {
        setError(error.message)
        setFacilities([])
      } else {
        setFacilities((data as any) ?? [])
      }
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Dobrodošli v RRIS</h2>
          <p className="text-gray-600 mb-4">To je testna domača stran. Tukaj bomo kasneje prikazali športne objekte in razpoložljive termine iz Supabase.</p>
        </div>
        {user && (
          <div className="text-sm text-gray-700">Prijavljen kot: <span className="font-medium">{user.email}</span></div>
        )}
      </div>

      <section className="mb-6">
        <h3 className="text-lg font-medium mb-2">Seznam objektov (test)</h3>

        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">Napaka: {error}</div>}
        {loading && <div className="text-gray-500">Nalaganje...</div>}

        {!loading && facilities && facilities.length === 0 && (
          <div className="text-sm text-gray-500">Ni najdenih objektov (poskrbite za tabelo 'facilities' v Supabase).</div>
        )}

        {!loading && facilities && facilities.length > 0 && (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            {facilities.map(f => (
              <li key={f.id} className="p-4 bg-white rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{f.name}</h4>
                    <p className="text-xs text-gray-500">Kapaciteta: {f.capacity ?? '—'}</p>
                  </div>
                  <div>
                    <button className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Rezerviraj</button>
                  </div>
                </div>
                {f.notes && <p className="mt-2 text-sm text-gray-500">{f.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <article className="p-4 bg-white rounded-lg shadow-sm border">
          <h3 className="font-medium text-lg">Nogometno igrišče A</h3>
          <p className="text-sm text-gray-500">Kapaciteta: 22 | Osvetlitev: Da</p>
          <div className="mt-3">
            <button className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Rezerviraj</button>
          </div>
        </article>

        <article className="p-4 bg-white rounded-lg shadow-sm border">
          <h3 className="font-medium text-lg">Tenis igrišče B</h3>
          <p className="text-sm text-gray-500">Kapaciteta: 4 | Podlaga: Trava</p>
          <div className="mt-3">
            <button className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Rezerviraj</button>
          </div>
        </article>
      </section>
    </div>
  )
}
