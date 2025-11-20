import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import supabase from '../lib/supabase'
import useAuth from '../lib/useAuth'

export default function Payment() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const objectId = searchParams.get('objectId')
  const slotId = searchParams.get('slotId')

  const [objectDetails, setObjectDetails] = useState<any | null>(null)
  const [slot, setSlot] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // Dummy payment form state
  const [cardNumber, setCardNumber] = useState('')
  const [cardName, setCardName] = useState('')
  const [cvv, setCvv] = useState('')
  const [expiry, setExpiry] = useState('') // expected MM/YY
  const [cardErrors, setCardErrors] = useState<{ cardNumber?: string; cardName?: string; cvv?: string; expiry?: string }>({})

  // validation helpers
  const validateCardNumber = (raw: string) => {
    const digits = raw.replace(/\s+/g, '')
    if (!/^[0-9]{12,19}$/.test(digits)) return 'Neveljavna številka kartice (12-19 številk)'
    return ''
  }

  const validateCardName = (v: string) => {
    if (!v || v.trim().length < 2) return 'Vnesite ime imetnika kartice'
    return ''
  }

  const validateCvv = (v: string) => {
    if (!/^[0-9]{3,4}$/.test(v)) return 'Neveljaven CVV (3-4 številke)'
    return ''
  }

  const validateExpiry = (v: string) => {
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(v)) return 'Format poteka: MM/YY'
    // check not expired
    try {
      const [mm, yy] = v.split('/')
      const month = parseInt(mm, 10)
      const year = 2000 + parseInt(yy, 10)
      const exp = new Date(year, month, 1)
      const now = new Date()
      // set to end of previous month
      if (exp <= new Date(now.getFullYear(), now.getMonth(), 1)) return 'Kartica je potekla'
    } catch (e) {
      return 'Neveljaven datum poteka'
    }
    return ''
  }

  const validateForm = () => {
    const e1 = validateCardNumber(cardNumber)
    const e2 = validateCardName(cardName)
    const e3 = validateCvv(cvv)
    const e4 = validateExpiry(expiry)
    setCardErrors({ cardNumber: e1 || undefined, cardName: e2 || undefined, cvv: e3 || undefined, expiry: e4 || undefined })
    return !(e1 || e2 || e3 || e4)
  }

  useEffect(() => {
    if (!objectId) return
    const load = async () => {
      const { data, error } = await supabase.from('sportni_objekti').select('*').eq('id', objectId).single()
      if (!error) setObjectDetails(data)
    }
    load()
  }, [objectId])

  useEffect(() => {
    if (!slotId) return
    const loadSlot = async () => {
      const { data, error } = await supabase.from('object_slots').select('*').eq('id', slotId).single()
      if (!error) setSlot(data)
    }
    loadSlot()
  }, [slotId])

  const doPaymentAndReserve = async () => {
    // ensure payment form valid before proceeding
    if (!validateForm()) {
      setMsg('Preverite podatke o plačilu.')
      return
    }

    if (!user) {
      setMsg('Prijavite se za plačilo.')
      return
    }
    if (!objectId || !slotId) {
      setMsg('Manjkajo podatki o objektu ali terminu.')
      return
    }

    setLoading(true)
    setMsg('Izvajam plačilo (dummy) in ustvarjam rezervacijo...')

    try {
      // Simulate payment delay
      await new Promise((res) => setTimeout(res, 800))

      // create reservation with reservation_date = slot.start_at if available
      const reservationDateIso = slot?.start_at ?? new Date().toISOString()
      const { data: resData, error: insertErr } = await supabase
        .from('reservations')
        .insert([{ user_id: user.id, object_id: objectId, slot_id: slotId, reservation_date: reservationDateIso }])
        .select()

      if (insertErr) {
        console.error('Insert reservation error', insertErr)
        setMsg('Napaka pri ustvarjanju rezervacije po plačilu.')
        setLoading(false)
        return
      }

      const reservationRecord = Array.isArray(resData) ? (resData as any)[0] : (resData as any)
      const reservationId = reservationRecord?.id
      if (!reservationId) {
        setMsg('Napaka: rezervacija ni vrnila ID.')
        setLoading(false)
        return
      }

      const { error: slotErr } = await supabase.from('object_slots').update({ status: 'booked' }).eq('id', slotId)
      if (slotErr) {
        console.warn('Slot update failed, rolling back reservation', slotErr)
        await supabase.from('reservations').delete().eq('id', reservationId)
        setMsg('Termin je bil zaseden, rezervacija ni uspela.')
        setLoading(false)
        return
      }

      setMsg('Plačilo uspešno (dummy). Rezervacija je potrjena!')
      // redirect to reservations list after short delay
      setTimeout(() => navigate('/reservations'), 900)
    } catch (e: any) {
      console.error(e)
      setMsg('Napaka pri obdelavi plačila/rezerve.')
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = () => {
    return validateCardNumber(cardNumber) === '' && validateCardName(cardName) === '' && validateCvv(cvv) === '' && validateExpiry(expiry) === ''
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Plačilo (dummy)</h1>
      <div className="bg-white p-4 rounded border mb-4">
        <h2 className="font-medium">Podatki o rezervaciji</h2>
        <div className="mt-3">
          <div className="text-sm font-medium">Objekt:</div>
          <div className="text-base">{objectDetails?.naziv ?? objectId}</div>
        </div>
        <div className="mt-3">
          <div className="text-sm font-medium">Izbran termin:</div>
          <div className="text-base">{slot ? new Date(slot.start_at).toLocaleString() : slotId ?? '—'}</div>
        </div>
      </div>

      {/* Dummy payment form */}
      <div className="bg-white p-4 rounded border mb-4">
        <h2 className="font-medium mb-3">Podatki plačilne kartice</h2>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-sm text-gray-600">Številka kartice</label>
            <input
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="1234 5678 9012 3456"
              className="mt-1 block w-full px-3 py-2 border rounded"
            />
            {cardErrors.cardNumber && <div className="text-xs text-red-600 mt-1">{cardErrors.cardNumber}</div>}
          </div>

          <div>
            <label className="block text-sm text-gray-600">Ime na kartici</label>
            <input value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="IME PRIIMEK" className="mt-1 block w-full px-3 py-2 border rounded" />
            {cardErrors.cardName && <div className="text-xs text-red-600 mt-1">{cardErrors.cardName}</div>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-gray-600">CVV</label>
              <input value={cvv} onChange={(e) => setCvv(e.target.value)} placeholder="123" className="mt-1 block w-full px-3 py-2 border rounded" />
              {cardErrors.cvv && <div className="text-xs text-red-600 mt-1">{cardErrors.cvv}</div>}
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-600">Expiry (MM/YY)</label>
              <input value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="MM/YY" className="mt-1 block w-full px-3 py-2 border rounded" />
              {cardErrors.expiry && <div className="text-xs text-red-600 mt-1">{cardErrors.expiry}</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={doPaymentAndReserve} disabled={loading || !isFormValid()}>
          {loading ? 'Obdelujem...' : 'Plačaj (dummy)'}
        </button>
        <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => navigate(-1)}>Nazaj</button>
      </div>

      {msg && <div className="mt-4 text-sm text-gray-700">{msg}</div>}
    </div>
  )
}
