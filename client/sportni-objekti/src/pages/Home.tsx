import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../lib/supabase'
import useAuth from '../lib/useAuth'

type Facility = {
  id: string
  naziv: string
  sport?: string
  naslov?: string
  mesto?: string
  opis?: string | null
  vrsta_povrsine?: string | null
  fotografije?: string[] | null
  cena?: number | null
  status?: string | null
}

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [facilities, setFacilities] = useState<Facility[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        // fetch public list of sportni_objekti (landing page)
        const { data, error } = await supabase
          .from('sportni_objekti')
          .select('id, naziv, sport, naslov, mesto, opis, vrsta_povrsine, fotografije, cena, status')
          .order('created_at', { ascending: false })
          .limit(100)

        if (!mounted) return
        if (error) {
          setError(error.message)
          setFacilities([])
        } else {
          setFacilities((data as any) ?? [])
        }
      } catch (err: any) {
        if (!mounted) return
        setError(err?.message ?? String(err))
        setFacilities([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  return (
    <div className="p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Iskanje športnih objektov</h1>
          <p className="text-gray-600 mt-1">Poišči in rezerviraj termin v najbližjih objektih.</p>
        </div>
        {user && (
          <div className="text-sm text-gray-700">Prijavljen: <span className="font-medium">{user.email}</span></div>
        )}
      </header>

      <section className="mb-6">
        {/* simple status/messages */}
        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">Napaka: {error}</div>}
        {loading && <div className="text-gray-500">Nalaganje...</div>}
      </section>

      <section>
        {!loading && facilities && facilities.length === 0 && (
          <div className="text-sm text-gray-500">Trenutno ni na voljo športnih objektov.</div>
        )}

        {!loading && facilities && facilities.length > 0 && (
          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {facilities.map((f) => (
              <li key={f.id} className="bg-white rounded-lg shadow-sm border overflow-hidden cursor-pointer" role="button" onClick={() => navigate(`/reservations?objectId=${encodeURIComponent(f.id)}`)}>
                <div className="h-40 bg-gray-100 flex items-center justify-center">
                  {f.fotografije && f.fotografije.length > 0 ? (
                    <img src={f.fotografije[0]} alt={f.naziv} className="object-cover w-full h-40" />
                  ) : (
                    <div className="text-gray-400">Brez slike</div>
                  )}
                </div>
                <div className="p-4 flex items-center justify-between">
                  <h3 className="font-medium text-lg">{f.naziv}</h3>
                  <div className="text-sm font-semibold">{typeof f.cena === 'number' ? `${f.cena} €` : '—'}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
