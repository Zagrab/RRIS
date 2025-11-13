import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Define the type for the sports objects
interface SportniObjekt {
  id: string;
  naziv: string;
  naslov: string;
  mesto: string;
  opis: string;
  vrsta_povrsine: string;
  cena: number;
  status: string;
}

export default function ManageObjects() {
  const [objects, setObjects] = useState<SportniObjekt[]>([]);
  const [objectCount, setObjectCount] = useState<number>(0);
  const [formData, setFormData] = useState({
    naziv: '',
    sport: '',
    naslov: '',
    mesto: '',
    opis: '',
    vrsta_povrsine: '',
    pravila: '',
    oprema: '',
    cena: 0,
    status: 'active',
  });
  const [activeTab, setActiveTab] = useState('objekti');
  const [showAddForm, setShowAddForm] = useState(false);

  // --- new state for availability tab ---
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [existingSlots, setExistingSlots] = useState<any[]>([]);
  const [operationMessage, setOperationMessage] = useState<string | null>(null);
  const [slotDurationMinutes, setSlotDurationMinutes] = useState<number>(60);
  const [weeksAhead, setWeeksAhead] = useState<number>(4);

  // weekly availability state (Slovenian day names shown to user, keys are english lowercase)
  type DayKey = 'monday'|'tuesday'|'wednesday'|'thursday'|'friday'|'saturday'|'sunday';
  type DayAvailability = { enabled: boolean; start: string; end: string };
  const defaultWeekAvailability: Record<DayKey, DayAvailability> = {
    monday: { enabled: true, start: '08:00', end: '22:00' },
    tuesday: { enabled: true, start: '08:00', end: '22:00' },
    wednesday: { enabled: true, start: '08:00', end: '22:00' },
    thursday: { enabled: true, start: '08:00', end: '22:00' },
    friday: { enabled: true, start: '08:00', end: '23:00' },
    saturday: { enabled: true, start: '07:00', end: '23:00' },
    sunday: { enabled: true, start: '07:00', end: '21:00' },
  };
  const [weekAvailability, setWeekAvailability] = useState<Record<DayKey, DayAvailability>>(defaultWeekAvailability);

  useEffect(() => {
    const fetchObjects = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const userId = user?.id; // Fetch user ID from auth metadata

      if (userId) {
        const { data, error } = await supabase
          .from('sportni_objekti')
          .select('*')
          .eq('created_by', userId); // Filter objects by user ID

        if (error) {
          console.error('Error fetching objects:', error);
        } else {
          setObjects(data as SportniObjekt[]); // Explicitly cast data to SportniObjekt[]
        }
      }
    };

    const fetchObjectCount = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const userId = user?.id; // Fetch user ID from auth metadata

      if (userId) {
        const { count, error } = await supabase
          .from('sportni_objekti')
          .select('*', { count: 'exact' })
          .eq('created_by', userId); // Count objects by user ID

        if (error) {
          console.error('Error fetching object count:', error);
        } else {
          setObjectCount(count || 0); // Set the count state
        }
      }
    };

    fetchObjects();
    fetchObjectCount();
  }, []);

  // --- availability helpers ---
  const slDayNames: Record<DayKey, string> = {
    monday: 'Ponedeljek',
    tuesday: 'Torek',
    wednesday: 'Sreda',
    thursday: 'Četrtek',
    friday: 'Petek',
    saturday: 'Sobota',
    sunday: 'Nedelja',
  };

  // map JS getDay() (0=Sunday) to our keys
  const jsDayToKey = (jsDay: number): DayKey => {
    switch (jsDay) {
      case 1: return 'monday';
      case 2: return 'tuesday';
      case 3: return 'wednesday';
      case 4: return 'thursday';
      case 5: return 'friday';
      case 6: return 'saturday';
      default: return 'sunday';
    }
  };

  // Helper: build ISO datetime string in local timezone for a given date + 'HH:MM'
  const combineDateAndTimeToISO = (date: Date, timeHHMM: string) => {
    const [hh, mm] = timeHHMM.split(':').map(Number);
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hh, mm, 0, 0);
    return d.toISOString();
  };

  // Fetch existing slots for selected object (next N days)
  const fetchExistingSlots = async (objectId: string | null, days = 14) => {
    if (!objectId) return;
    setLoadingSlots(true);
    setOperationMessage(null);
    try {
      const from = new Date();
      const to = new Date();
      to.setDate(to.getDate() + days);

      const { data, error } = await supabase
        .from('object_slots')
        .select('*')
        .eq('object_id', objectId)
        .gte('start_at', from.toISOString())
        .lte('start_at', to.toISOString())
        .order('start_at', { ascending: true });

      if (error) {
        console.error('Error fetching slots:', error);
        setOperationMessage('Napaka pri nalaganju terminov');
      } else {
        setExistingSlots(data || []);
      }
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (selectedObjectId) fetchExistingSlots(selectedObjectId);
  }, [selectedObjectId]);

  // Create slots for next `weeksAhead` weeks according to weekAvailability, splitting into slots of slotDurationMinutes.
  const createSlotsFromWeekly = async () => {
    if (!selectedObjectId) {
      alert('Izberi objekt najprej');
      return;
    }

    setOperationMessage('Ustvarjam termine...');
    const slotsToInsert: any[] = [];
    const today = new Date();
    const totalDays = weeksAhead * 7;

    for (let i = 0; i < totalDays; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);
      const dayKey = jsDayToKey(date.getDay());
      const dayAvail = weekAvailability[dayKey];
      if (!dayAvail || !dayAvail.enabled) continue;

      // Build start and end for that date
      const startISO = combineDateAndTimeToISO(date, dayAvail.start);
      const endISO = combineDateAndTimeToISO(date, dayAvail.end);

      const startDate = new Date(startISO);
      const endDate = new Date(endISO);
      if (endDate <= startDate) continue; // invalid

      // split into slotDurationMinutes chunks
      const slotMs = slotDurationMinutes * 60 * 1000;
      for (let t = startDate.getTime(); t < endDate.getTime(); t += slotMs) {
        const s = new Date(t);
        const e = new Date(Math.min(t + slotMs, endDate.getTime()));
        // avoid zero-length
        if (e <= s) continue;
        slotsToInsert.push({ object_id: selectedObjectId, start_at: s.toISOString(), end_at: e.toISOString(), status: 'free', price: null });
      }
    }

    if (slotsToInsert.length === 0) {
      setOperationMessage('Ni nobenih terminov za dodajanje (preveri nastavljenosti in obseg tednov).');
      return;
    }

    // Try batch insert; if fails (exclusion constraint) fall back to sequential inserts and ignore conflicts
    const { error } = await supabase.from('object_slots').insert(slotsToInsert);
    if (!error) {
      setOperationMessage(`Uspešno dodanih terminov: ${slotsToInsert.length}`);
      await fetchExistingSlots(selectedObjectId, weeksAhead * 7);
      return;
    }

    // fallback: insert one-by-one and count successes
    console.warn('Batch insert failed, attempting per-item insert to skip conflicts', error);
    let success = 0;
    for (const s of slotsToInsert) {
      try {
        const { error: e2 } = await supabase.from('object_slots').insert([s]);
        if (!e2) success++;
      } catch (e) {
        // ignore individual error
      }
    }
    setOperationMessage(`Dodano terminov: ${success} (nekatere konflikte smo preskočili)`);
    await fetchExistingSlots(selectedObjectId, weeksAhead * 7);
  };

  // --- existing handlers ---
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Fetch the user ID from auth metadata
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id; // Extract user ID from auth metadata

    if (!userId) {
      console.error('User ID not found in auth metadata');
      alert('Failed to fetch user information. Please try again.');
      return;
    }

    const { error } = await supabase
      .from('sportni_objekti')
      .insert([{ ...formData, created_by: userId }]);

    if (error) {
      console.error('Error adding object:', error);
      alert('Failed to add object. Please try again.');
    } else {
      alert('Object added successfully!');
      setFormData({
        naziv: '',
        sport: '',
        naslov: '',
        mesto: '',
        opis: '',
        vrsta_povrsine: '',
        pravila: '',
        oprema: '',
        cena: 0,
        status: 'active',
      });
      setShowAddForm(false); // Hide the form after successful submission
      window.location.reload(); // Refresh the page to show the new object
    }
  };

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setShowAddForm(false); // Hide the form when switching tabs
  };

  const handleAddObjectClick = () => {
    setShowAddForm(true);
  };

  // Adjust spacing and layout to match the previous appearance
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Upravljanje objektov</h1>
        <div className="flex items-center gap-3">
          <button
            className={`px-3 py-2 border rounded-md ${activeTab === 'objekti' ? 'bg-blue-600 text-white' : 'bg-white'}`}
            onClick={() => handleTabClick('objekti')}
          >
            Objekti
          </button>
          <button
            className={`px-3 py-2 border rounded-md ${activeTab === 'razpolozljivost' ? 'bg-blue-600 text-white' : 'bg-white'}`}
            onClick={() => handleTabClick('razpolozljivost')}
          >
            Razpoložljivost
          </button>
          <button
            className={`px-3 py-2 border rounded-md ${activeTab === 'cenik' ? 'bg-blue-600 text-white' : 'bg-white'}`}
            onClick={() => handleTabClick('cenik')}
          >
            Cenik
          </button>
          <button
            className={`px-3 py-2 border rounded-md ${activeTab === 'rezervacije' ? 'bg-blue-600 text-white' : 'bg-white'}`}
            onClick={() => handleTabClick('rezervacije')}
          >
            Rezervacije
          </button>
        </div>
      </div>

      {activeTab === 'objekti' && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-lg shadow-sm border">
              <div className="text-sm text-gray-500">Moji objekti</div>
              <div className="text-xl font-semibold mt-2">{objectCount}</div>
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm border">
              <div className="text-sm text-gray-500">Rezervacije danes</div>
              <div className="text-xl font-semibold mt-2">{'{reservations.today.count}'}</div>
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm border">
              <div className="text-sm text-gray-500">Skupni prihodki</div>
              <div className="text-xl font-semibold mt-2">{'{money.count}'}</div>
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm border">
              <div className="text-sm text-gray-500">Prihodnje rezervacije</div>
              <div className="text-xl font-semibold mt-2">{'{reservations_future.count}'}</div>
            </div>
          </div>

          {/* Display fetched objects */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {objects.map((object) => (
              <div key={object.id} className="bg-white rounded-lg border shadow-sm p-4">
                <h3 className="text-lg font-medium">{object.naziv}</h3>
                <p className="text-sm text-gray-500">{object.naslov}, {object.mesto}</p>
                <p className="text-sm text-gray-500 mt-2">{object.opis}</p>
                <div className="mt-4 text-sm text-gray-600 flex gap-6">
                  <div>Vrsta: {object.vrsta_povrsine}</div>
                  <div>Cena: {object.cena} €</div>
                  <div>Status: {object.status}</div>
                </div>
                <div className="mt-4 flex gap-4">
                  <button
                    className="px-3 py-2 bg-red-500 text-white rounded-md"
                    onClick={async () => {
                      const { error } = await supabase
                        .from('sportni_objekti')
                        .delete()
                        .eq('id', object.id);

                      if (error) {
                        console.error('Error deleting object:', error);
                        alert('Failed to delete object. Please try again.');
                      } else {
                        alert('Object deleted successfully!');
                        window.location.reload();
                      }
                    }}
                  >
                    Odstrani
                  </button>
                  <button className="px-3 py-2 bg-gray-300 rounded-md">Uredi</button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Object Button */}
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md"
            onClick={handleAddObjectClick}
          >
            Dodaj Objekt
          </button>

          {/* Add Object Form */}
          {showAddForm && (
            <form
              className="mt-6 bg-white p-6 rounded-lg shadow-sm border space-y-4"
              onSubmit={handleSubmit}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  name="naziv"
                  value={formData.naziv}
                  onChange={handleInputChange}
                  placeholder="Naziv"
                  className="border p-2 rounded-md w-full"
                />
                <input
                  type="text"
                  name="sport"
                  value={formData.sport}
                  onChange={handleInputChange}
                  placeholder="Šport"
                  className="border p-2 rounded-md w-full"
                />
                <input
                  type="text"
                  name="naslov"
                  value={formData.naslov}
                  onChange={handleInputChange}
                  placeholder="Naslov"
                  className="border p-2 rounded-md w-full"
                />
                <input
                  type="text"
                  name="mesto"
                  value={formData.mesto}
                  onChange={handleInputChange}
                  placeholder="Mesto"
                  className="border p-2 rounded-md w-full"
                />
                <textarea
                  name="opis"
                  value={formData.opis}
                  onChange={handleInputChange}
                  placeholder="Opis"
                  className="border p-2 rounded-md w-full"
                />
                <input
                  type="text"
                  name="vrsta_povrsine"
                  value={formData.vrsta_povrsine}
                  onChange={handleInputChange}
                  placeholder="Vrsta površine"
                  className="border p-2 rounded-md w-full"
                />
                <input
                  type="text"
                  name="pravila"
                  value={formData.pravila}
                  onChange={handleInputChange}
                  placeholder="Pravila"
                  className="border p-2 rounded-md w-full"
                />
                <input
                  type="text"
                  name="oprema"
                  value={formData.oprema}
                  onChange={handleInputChange}
                  placeholder="Oprema"
                  className="border p-2 rounded-md w-full"
                />
                <input
                  type="number"
                  name="cena"
                  value={formData.cena}
                  onChange={handleInputChange}
                  placeholder="Cena"
                  className="border p-2 rounded-md w-full"
                />
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="border p-2 rounded-md w-full"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-300 rounded-md"
                  onClick={() => setShowAddForm(false)}
                >
                  Zapri
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md"
                >
                  Dodaj Objekt
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {activeTab === 'razpolozljivost' && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-medium mb-4">Upravljanje razpoložljivosti</h2>

          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-2">Izberite objekt</label>
            <select
              value={selectedObjectId ?? ''}
              onChange={(e) => setSelectedObjectId(e.target.value || null)}
              className="border p-2 rounded-md w-full"
            >
              <option value="">-- izberi --</option>
              {objects.map((o) => (
                <option key={o.id} value={o.id}>{o.naziv} — {o.mesto}</option>
              ))}
            </select>
          </div>

          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Trajanje termina (min)</label>
              <input type="number" min={15} step={15} value={slotDurationMinutes}
                onChange={(e) => setSlotDurationMinutes(Number(e.target.value))}
                className="border p-2 rounded-md w-32" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Razširi za (tedne)</label>
              <input type="number" min={1} max={52} value={weeksAhead}
                onChange={(e) => setWeeksAhead(Number(e.target.value))}
                className="border p-2 rounded-md w-32" />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <div className="text-sm text-gray-600 mb-3">Delovni čas (vklopi/izklopi posamezen dan)</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(Object.keys(weekAvailability) as DayKey[]).map((key) => (
                <div key={key} className="flex items-center gap-3 bg-white p-3 rounded-md border">
                  <div className="w-36 text-sm">{slDayNames[key]}</div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={weekAvailability[key].enabled}
                      onChange={(e) => setWeekAvailability(prev => ({ ...prev, [key]: { ...prev[key], enabled: e.target.checked } }))}
                    />
                    <input type="time" value={weekAvailability[key].start}
                      onChange={(e) => setWeekAvailability(prev => ({ ...prev, [key]: { ...prev[key], start: e.target.value } }))}
                      className="border p-1 rounded-md" />
                    <span className="text-sm">do</span>
                    <input type="time" value={weekAvailability[key].end}
                      onChange={(e) => setWeekAvailability(prev => ({ ...prev, [key]: { ...prev[key], end: e.target.value } }))}
                      className="border p-1 rounded-md" />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-3">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md" onClick={createSlotsFromWeekly}>
                Ustvari termine
              </button>
              <button className="px-4 py-2 bg-gray-300 rounded-md" onClick={() => selectedObjectId && fetchExistingSlots(selectedObjectId)}>
                Osveži termine
              </button>
              <div className="ml-auto text-sm text-gray-500">{operationMessage}</div>
            </div>

            <div className="mt-6">
              <h3 className="font-medium mb-2">Obstoječi termini (naslednjih 2 tedna)</h3>
              {loadingSlots ? (
                <div>Nalagam...</div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-auto">
                  {existingSlots.length === 0 ? (
                    <div className="text-sm text-gray-500">Ni terminov</div>
                  ) : (
                    existingSlots.map((s) => (
                      <div key={s.id} className="p-2 border rounded-md flex justify-between items-center">
                        <div className="text-sm">{new Date(s.start_at).toLocaleString()} — {new Date(s.end_at).toLocaleTimeString()}</div>
                        <div className="text-xs text-gray-600">{s.status}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {activeTab !== 'objekti' && activeTab !== 'razpolozljivost' && (
        <div className="text-center text-gray-500 text-xl">
          {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
        </div>
      )}
    </div>
  );
}
