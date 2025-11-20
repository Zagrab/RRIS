import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import supabase from '../lib/supabase'
import useAuth from '../lib/useAuth'

type Slot = {
  id: string
  object_id: string
  start_at: string
  end_at: string
  status: string
  price?: number | null
}

type Reservation = {
  id: string
  user_id: string
  object_id: string
  slot_id?: string | null
  reservation_date: string
  status: string
  sportni_objekt?: {
    id: string
    naziv: string
    mesto?: string
  }
  slot?: Slot | null
}

type SportniObjekt = {
  id: string
  naziv: string
  naslov?: string
  mesto?: string
  opis?: string | null
  vrsta_povrsine?: string | null
  fotografije?: string[] | null
  cena?: number | null
}

export default function Reservations() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const selectedObjectId = searchParams.get('objectId')

  // main column class depends on whether sidebar is shown
  const mainColClass = selectedObjectId ? 'md:col-span-2' : 'md:col-span-3'

  const [objectDetails, setObjectDetails] = useState<SportniObjekt | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [objectNames, setObjectNames] = useState<Record<string, string>>({})
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)

  const [myReservations, setMyReservations] = useState<Reservation[]>([])
  const [loadingReservations, setLoadingReservations] = useState(false)

  const [operationMsg, setOperationMsg] = useState<string | null>(null)

  // fetch free slots for selected object (next 30 days)
  const fetchSlots = async (objectId: string | null) => {
    if (!objectId) return
    setLoadingSlots(true)
    try {
      const from = new Date().toISOString()
      const toDate = new Date()
      toDate.setDate(toDate.getDate() + 30)
      const to = toDate.toISOString()

      const { data, error } = await supabase
        .from('object_slots')
        .select('*')
        .eq('object_id', objectId)
        .eq('status', 'free')
        .gte('start_at', from)
        .lte('start_at', to)
        .order('start_at', { ascending: true })
        .limit(500)

      if (error) {
        console.error('Error loading slots', error)
        setSlots([])
      } else {
        setSlots((data as any) ?? [])
      }
    } finally {
      setLoadingSlots(false)
    }
  }

  // fetch current user's reservations (include slot and attach object name)
  const fetchMyReservations = async () => {
    if (!user) return
    setLoadingReservations(true)
    try {
      // 1) fetch reservations with slot data; try to include related object if relation exists
      const { data: resData, error: resError } = await supabase
        .from('reservations')
        .select('id,user_id,object_id,slot_id,reservation_date,status, object_slots(*) , sportni_objekti(id,naziv,mesto)')
        .eq('user_id', user.id)
        .order('reservation_date', { ascending: false })

      if (resError) {
        console.error('Error fetching reservations', resError)
        setMyReservations([])
        return
      }

      const reservations = (resData as any) ?? []

      // Build map of object ids that we need names for (reservation.object_id or slot.object_id)
      const neededIds = Array.from(new Set(reservations.map((r: any) => (r.object_id ?? r.slot?.object_id)).filter(Boolean)))

      // If the related object was already returned in each reservation (sportni_objekti), use that
      const hasRelated = reservations.some((r: any) => !!r.sportni_objekti)
      if (hasRelated) {
        const nameMap: Record<string, string> = {}
        const merged = reservations.map((r: any) => {
          const obj = r.sportni_objekti ?? null
          if (obj && obj.id) nameMap[obj.id] = obj.naziv
          return { ...r, sportni_objekt: obj }
        })
        setObjectNames(prev => ({ ...prev, ...nameMap }))
        setMyReservations(merged)
        return
      }

      if (neededIds.length === 0) {
        setMyReservations(reservations)
        return
      }

      // Batch fetch the objects we need
      const { data: objs, error: objsErr } = await supabase
        .from('sportni_objekti')
        .select('id,naziv,mesto')
        .in('id', neededIds)

      if (objsErr) {
        console.warn('Error fetching related objects', objsErr)
        setMyReservations(reservations)
        return
      }

      const objMap: Record<string, any> = {}
      const nameMap: Record<string, string> = {}
      ;(objs as any[]).forEach((o: any) => { objMap[o.id] = o; if (o?.id) nameMap[o.id] = o.naziv })
      setObjectNames(prev => ({ ...prev, ...nameMap }))

      const merged = reservations.map((r: any) => {
        const resolved = r.object_id ?? r.slot?.object_id
        return { ...r, sportni_objekt: objMap[resolved] ?? null }
      })

      setMyReservations(merged)
    } finally {
      setLoadingReservations(false)
    }
  }

  // fetch object details when objectId present
  const fetchObjectDetails = async (objectId: string | null) => {
    if (!objectId) { setObjectDetails(null); return }
    try {
      const { data, error } = await supabase
        .from('sportni_objekti')
        .select('id, naziv, naslov, mesto, opis, vrsta_povrsine, fotografije, cena')
        .eq('id', objectId)
        .single()

      if (error) {
        console.error('Error loading object details', error)
        setObjectDetails(null)
      } else {
        setObjectDetails(data as any)
      }
    } catch (e) {
      console.error('Error', e)
      setObjectDetails(null)
    }
  }

  useEffect(() => {
    fetchMyReservations()
  }, [user])

  useEffect(() => {
    if (selectedObjectId) {
      fetchSlots(selectedObjectId)
      fetchObjectDetails(selectedObjectId)
    } else {
      setObjectDetails(null)
      setSlots([])
    }
  }, [selectedObjectId])

  const bookSelectedSlot = async () => {
    if (!user) {
      setOperationMsg('Prijavite se za rezervacijo.')
      return
    }
    if (!selectedObjectId) {
      setOperationMsg('Izberite objekt za rezervacijo.')
      return
    }
    if (!selectedSlotId) {
      setOperationMsg('Izberite termin.')
      return
    }

    setOperationMsg('Počakajte — ustvarjam rezervacijo...')

    try {
      // find the selected slot to use its start_at as the reservation_date
      const selectedSlot = slots.find((s) => s.id === selectedSlotId)
      const reservationDateIso = selectedSlot?.start_at ?? new Date().toISOString()

      const { data: resData, error: insertErr } = await supabase
        .from('reservations')
        .insert([{ user_id: user.id, object_id: selectedObjectId, slot_id: selectedSlotId, reservation_date: reservationDateIso }])
        .select()

      if (insertErr) {
        console.error('Insert reservation error', insertErr)
        setOperationMsg('Napaka pri ustvarjanju rezervacije.')
        return
      }

      const reservationRecord = Array.isArray(resData) ? (resData as any)[0] : (resData as any)
      const reservationId = reservationRecord?.id
      if (!reservationId) {
        console.error('No reservation id returned', resData)
        setOperationMsg('Napaka pri ustvarjanju rezervacije (ni ID).')
        return
      }

      const { error: slotErr } = await supabase
        .from('object_slots')
        .update({ status: 'booked' })
        .eq('id', selectedSlotId)

      if (slotErr) {
        // rollback reservation
        console.warn('Slot update failed, rolling back reservation', slotErr)
        await supabase.from('reservations').delete().eq('id', reservationId)
        setOperationMsg('Termin je bil zaseden, rezervacija ni uspela.')
        return
      }

      setOperationMsg('Rezervacija je potrjena!')
      setSelectedSlotId(null)
      await fetchSlots(selectedObjectId)
      await fetchMyReservations()
    } catch (err: any) {
      console.error('Reservation error', err)
      setOperationMsg(err?.message ?? 'Napaka pri rezervaciji')
    }
  }

  const cancelReservation = async (reservationId: string, slotId?: string | null) => {
    if (!reservationId) return
    setOperationMsg('Odjavljanje...')
    try {
      // mark reservation canceled
      const { error } = await supabase.from('reservations').update({ status: 'canceled' }).eq('id', reservationId)
      if (error) {
        console.error('Error canceling reservation', error)
        setOperationMsg('Napaka pri preklicu rezervacije')
        return
      }

      if (slotId) {
        // free the slot again
        await supabase.from('object_slots').update({ status: 'free' }).eq('id', slotId)
      }

      setOperationMsg('Rezervacija preklicana')
      await fetchMyReservations()
      if (selectedObjectId) await fetchSlots(selectedObjectId)
    } catch (err: any) {
      setOperationMsg(err?.message ?? 'Napaka pri preklicu')
    }
  }

  const slotsByDay = useMemo(() => {
    const map: Record<string, Slot[]> = {}
    slots.forEach((s) => {
      const day = new Date(s.start_at).toLocaleDateString()
      map[day] = map[day] || []
      map[day].push(s)
    })
    return map
  }, [slots])

  // filter displayed reservations to exclude canceled (we still keep them in DB)
  const visibleReservations = myReservations.filter(r => r.status !== 'canceled')

  // helper: format ISO datetime into Slovenian day + date + time
  const formatDayTime = (iso?: string | null) => {
    if (!iso) return ''
    try {
      const d = new Date(iso)
      const dayName = d.toLocaleDateString('sl-SI', { weekday: 'long' })
      const dateStr = d.toLocaleDateString('sl-SI', { day: '2-digit', month: 'short', year: 'numeric' })
      const timeStr = d.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' })
      // Capitalize first letter of day (locale may return lowercase)
      const dayCap = dayName.charAt(0).toUpperCase() + dayName.slice(1)
      return `${dayCap}, ${dateStr} — ${timeStr}`
    } catch (e) {
      return iso
    }
  }

  // helper: format just weekday name (Slovenian) and time only
  const formatDayName = (iso?: string | null) => {
    if (!iso) return ''
    try {
      const d = new Date(iso)
      const dayName = d.toLocaleDateString('sl-SI', { weekday: 'long' })
      return dayName.charAt(0).toUpperCase() + dayName.slice(1)
    } catch (e) {
      return ''
    }
  }

  const formatTimeOnly = (iso?: string | null) => {
    if (!iso) return ''
    try {
      const d = new Date(iso)
      return d.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' })
    } catch (e) {
      return ''
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Rezervacije</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <main className={mainColClass}>
           {/* If no object selected, show my reservations as the primary content */}
           {!selectedObjectId ? (
             <div className="bg-white p-4 rounded border">
               <h2 className="font-medium mb-3">Moje rezervacije</h2>
               {loadingReservations ? (
                 <div>Nalagam...</div>
               ) : visibleReservations.length === 0 ? (
                 <div className="text-sm text-gray-500">Še nimate rezervacij.</div>
               ) : (
                 <div className="space-y-3">
                   {visibleReservations.map((r) => {
                     const resolvedId = (r.object_id ?? (r.slot as any)?.object_id) as string | undefined
                     const displayName = (resolvedId && objectNames[resolvedId]) ?? r.sportni_objekt?.naziv ?? resolvedId ?? r.object_id
                     const iso = (r.slot && (r.slot as any).start_at) ?? r.reservation_date
                     const dayName = formatDayName(iso)
                     const timeOnly = formatTimeOnly(iso)
                     const formatted = formatDayTime(iso)
                     return (
                       <div
                         key={r.id}
                         role="button"
                         onClick={() => { if (resolvedId) navigate(`/reservations?objectId=${encodeURIComponent(resolvedId)}`) }}
                         className="border rounded p-3 flex justify-between items-start cursor-pointer"
                       >
                         <div>
                           <div className="font-medium">{displayName}</div>
                           <div className="flex items-center gap-2 mt-2">
                             {dayName && <span className="px-2 py-1 text-xs bg-gray-100 rounded-md">{dayName}</span>}
                             {timeOnly && <span className="px-2 py-1 text-xs bg-gray-100 rounded-md">{timeOnly}</span>}
                           </div>
                          <div className="text-xs text-gray-500 mt-1">{formatted}</div>
                           {r.sportni_objekt && r.sportni_objekt.mesto && <div className="text-xs text-gray-500">{r.sportni_objekt.mesto}</div>}
                         </div>
                         <div className="flex flex-col items-end gap-2">
                           {r.status !== 'canceled' && (
                             <button
                               className="px-3 py-1 text-sm bg-red-500 text-white rounded"
                               onClick={(e) => { e.stopPropagation(); cancelReservation(r.id, r.slot?.id) }}
                             >
                               Prekliči
                             </button>
                           )}
                         </div>
                       </div>
                     )
                   })}
                 </div>
               )}
             </div>
           ) : (
             <div>
               {/* Selected object header */}
               <div className="mb-4">
                 <label className="block text-sm text-gray-600 mb-2">Izbran objekt</label>
                 <div className="flex items-center gap-3">
                   <input type="text" readOnly value={objectDetails?.naziv ?? selectedObjectId ?? ''} className="border p-2 rounded w-full" />
                   <button
                     className="px-3 py-2 bg-gray-200 rounded"
                     onClick={() => { window.location.href = '/' }}
                   >
                     Nazaj
                   </button>
                 </div>
               </div>

               {/* Object details */}
               {objectDetails && (
                 <div className="bg-white p-4 rounded border mb-4">
                   <div className="flex gap-4">
                     <div className="w-40 h-28 bg-gray-100 flex items-center justify-center overflow-hidden">
                       {objectDetails.fotografije && objectDetails.fotografije.length > 0 ? (
                         <img src={objectDetails.fotografije[0]} alt={objectDetails.naziv} className="object-cover w-full h-full" />
                       ) : (
                         <div className="text-gray-400">Brez slike</div>
                       )}
                     </div>
                     <div>
                       <h2 className="text-xl font-semibold">{objectDetails.naziv}</h2>
                       <div className="text-sm text-gray-600">{objectDetails.naslov ?? ''} {objectDetails.mesto ? `• ${objectDetails.mesto}` : ''}</div>
                       {objectDetails.opis && <p className="mt-2 text-sm text-gray-700">{objectDetails.opis}</p>}
                       <div className="mt-3 text-sm text-gray-600">Vrsta: {objectDetails.vrsta_povrsine ?? '—'} • Cena: {objectDetails.cena ? `${objectDetails.cena} € / ura` : '—'}</div>
                     </div>
                   </div>
                 </div>
               )}

               {/* Slots list */}
               <div className="bg-white p-4 rounded border">
                 <h2 className="font-medium mb-2">Prosti termini (naslednjih 30 dni)</h2>
                 {loadingSlots ? (
                   <div>Nalagam...</div>
                 ) : Object.keys(slotsByDay).length === 0 ? (
                   <div className="text-sm text-gray-500">Ni prostih terminov za izbran objekt.</div>
                 ) : (
                   <div className="space-y-4 max-h-96 overflow-auto">
                     {Object.entries(slotsByDay).map(([day, daySlots]) => (
                       <div key={day}>
                         <div className="text-sm font-medium mb-2">{day}</div>
                         <div className="flex flex-wrap gap-2">
                           {daySlots.map((s) => (
                             <button
                               key={s.id}
                               className={`px-3 py-2 border rounded ${selectedSlotId === s.id ? 'bg-blue-600 text-white' : 'bg-white'}`}
                               onClick={() => setSelectedSlotId(s.id)}
                             >
                               {new Date(s.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </button>
                           ))}
                         </div>
                       </div>
                     ))}
                   </div>
                 )}

                 <div className="mt-4 flex items-center gap-3">
                   <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={bookSelectedSlot}>Rezerviraj izbrani termin</button>
                   <div className="text-sm text-gray-500">{operationMsg}</div>
                 </div>
               </div>
             </div>
           )}
         </main>

      {/* Sidebar with active reservations */}
      {selectedObjectId && (
        <aside className="md:col-span-1">
         <div className="bg-white p-4 rounded border">
          <h3 className="font-medium mb-3">Moje rezervacije</h3>
          {loadingReservations ? (
            <div>Nalagam...</div>
          ) : visibleReservations.length === 0 ? (
            <div className="text-sm text-gray-500">Še nimate rezervacij.</div>
          ) : (
            <div className="space-y-3 max-h-[70vh] overflow-auto">
              {visibleReservations.map((r) => {
                const resolvedId = (r.object_id ?? (r.slot as any)?.object_id) as string | undefined
                const displayName = (resolvedId && objectNames[resolvedId]) ?? r.sportni_objekt?.naziv ?? resolvedId ?? r.object_id
                const iso = (r.slot && (r.slot as any).start_at) ?? r.reservation_date
                const dayName = formatDayName(iso)
                const timeOnly = formatTimeOnly(iso)
                const formatted = formatDayTime(iso)
                return (
                  <div key={r.id} className="border rounded p-3">
                    <div className="font-medium">{displayName}</div>
                    <div className="flex items-center gap-2 mt-2">
                      {dayName && <span className="px-2 py-1 text-xs bg-gray-100 rounded-md">{dayName}</span>}
                      {timeOnly && <span className="px-2 py-1 text-xs bg-gray-100 rounded-md">{timeOnly}</span>}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{formatted}</div>
                    {r.sportni_objekt && r.sportni_objekt.mesto && <div className="text-xs text-gray-500">{r.sportni_objekt.mesto}</div>}
                    <div className="mt-2 flex justify-end">
                      {r.status !== 'canceled' && (
                        <button className="px-3 py-1 text-sm bg-red-500 text-white rounded" onClick={() => cancelReservation(r.id, r.slot?.id)}>Prekliči</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        </aside>
      )}
     </div>
   </div>
 )
}
