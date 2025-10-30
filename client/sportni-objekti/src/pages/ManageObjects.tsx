import { Link } from 'react-router-dom'

export default function ManageObjects() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Upravljanje objektov</h1>
        <div className="flex items-center gap-3">
          <Link to="#" className="px-4 py-2 bg-gray-100 rounded-md border">Iskanje</Link>
          <Link to="#" className="px-4 py-2 bg-gray-100 rounded-md border">Upravljanje</Link>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md">DODAJ OBJEKT</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-lg shadow-sm border">
          <div className="text-sm text-gray-500">Moji objekti</div>
          <div className="text-xl font-semibold mt-2">{'{objekti.count}'}</div>
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

      {/* Tabs */}
      <div className="flex items-center gap-3">
        <button className="px-3 py-2 bg-white border rounded-md">Objekti</button>
        <button className="px-3 py-2 bg-white border rounded-md">Razpoložljivost</button>
        <button className="px-3 py-2 bg-white border rounded-md">Cenik</button>
        <button className="px-3 py-2 bg-white border rounded-md">Rezervacije</button>
      </div>

      {/* Example object card */}
      <div className="bg-white rounded-lg border shadow-sm p-4 flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="w-48 h-32 bg-gray-200 rounded-md flex items-center justify-center text-gray-500">Slika</div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-medium">Ime objekta</h3>
                <p className="text-sm text-gray-500">Naslov objekta</p>
                <div className="mt-2 text-sm text-gray-600 flex gap-6">
                  <div>Datum</div>
                  <div>Čas</div>
                  <div>Cena</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Status</div>
                <div className="mt-3">
                  <button className="px-3 py-1 bg-red-100 text-red-700 rounded-md mr-2">Odstrani</button>
                  <button className="px-3 py-1 bg-gray-100 rounded-md">Uredi</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit form visual only */}
      <div className="bg-white rounded-lg border shadow p-6">
        <div className="flex items-start gap-6">
          <div className="w-64 h-40 bg-gray-100 rounded-md flex items-center justify-center text-gray-500">Preview</div>
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600">Naziv</label>
                <input className="mt-1 w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Šport</label>
                <input className="mt-1 w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Naslov</label>
                <input className="mt-1 w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Mesto</label>
                <input className="mt-1 w-full border rounded px-3 py-2" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-600">Opis</label>
              <textarea className="mt-1 w-full border rounded px-3 py-2 h-28" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-600">Vrsta površine</label>
                <input className="mt-1 w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Pravila</label>
                <input className="mt-1 w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Oprema</label>
                <input className="mt-1 w-full border rounded px-3 py-2" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs text-gray-600">Dodaj fotografije</label>
                <div className="mt-1">
                  <input type="file" multiple className="text-sm" />
                </div>
              </div>

              <div className="text-right">
                <button className="px-4 py-2 bg-gray-100 rounded mr-3">Prekliči</button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded">Dodaj objekt</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
