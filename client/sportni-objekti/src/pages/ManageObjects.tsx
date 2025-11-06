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

      {activeTab !== 'objekti' && (
        <div className="text-center text-gray-500 text-xl">
          {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
        </div>
      )}
    </div>
  );
}
