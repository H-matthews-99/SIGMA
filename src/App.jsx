import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from './supabaseClient'; // Import koneksi database

// Fix bug icon marker Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function RecenterMap({ coords }) {
  const map = useMap();
  useEffect(() => { if (coords) map.setView(coords, 16); }, [coords, map]);
  return null;
}

function App() {
  const [dataUmkm, setDataUmkm] = useState([]);
  const [dataKategori, setDataKategori] = useState([]);
  const [dataUlasan, setDataUlasan] = useState([]);
  
  const [userCoords, setUserCoords] = useState(null);
  const [mapCenter, setMapCenter] = useState([-0.478, 101.447]); 
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [filterKategori, setFilterKategori] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeUmkmId, setActiveUmkmId] = useState(null);

  const [inputNama, setInputNama] = useState('');
  const [inputRating, setInputRating] = useState(5);
  const [inputKomentar, setInputKomentar] = useState('');

  // Rumus Haversine
  const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
  };

  // AMBIL DATA DARI DATABASE (SUPABASE)
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    // 1. Ambil data Kategori
    const { data: categories } = await supabase.from('categories').select('*');
    setDataKategori(categories || []);

    // 2. Ambil data UMKM beserta nama kategorinya (Join Table)
    const { data: umkmList } = await supabase.from('umkm').select(`
      id, nama, lat, lon, alamat,
      categories ( nama_kategori )
    `);

    // Format data agar sesuai state
    const formattedUmkm = (umkmList || []).map(item => ({
      id: item.id,
      nama: item.nama,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      alamat: item.alamat,
      kategori: item.categories?.nama_kategori || 'Lainnya'
    }));

    // 3. Ambil data Ulasan
    const { data: reviews } = await supabase.from('reviews').select('*');
    setDataUlasan(reviews || []);

    // 4. Dapatkan Geolocation User & Hitung Jarak Terdekat
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        setUserCoords({ lat: latitude, lon: longitude });
        setMapCenter([latitude, longitude]);

        const berjarak = formattedUmkm.map(u => ({
          ...u,
          jarak: haversineDistance(latitude, longitude, u.lat, u.lon)
        })).sort((a, b) => a.jarak - b.jarak);
        setDataUmkm(berjarak);
      }, () => {
        // Jika GPS ditolak, hitung jarak dari pusat kota default
        const berjarak = formattedUmkm.map(u => ({
          ...u,
          jarak: haversineDistance(-0.478, 101.447, u.lat, u.lon)
        })).sort((a, b) => a.jarak - b.jarak);
        setDataUmkm(berjarak);
      });
    }
  };

  // TAMBAH ULASAN KE DATABASE
  const tambahUlasan = async (e, idUmkm) => {
    e.preventDefault();
    if (!inputNama || !inputKomentar) return alert("Form tidak boleh kosong!");

    const { data, error } = await supabase.from('reviews').insert([
      { umkm_id: idUmkm, nama_reviewer: inputNama, rating: parseInt(inputRating), komentar: inputKomentar }
    ]).select();

    if (!error) {
      // Refresh ulasan di UI lokal
      fetchInitialData();
      setInputNama('');
      setInputKomentar('');
      alert("Ulasan berhasil disimpan ke database SQL!");
    } else {
      alert("Gagal menyimpan ulasan");
    }
  };

  const dataFilter = dataUmkm.filter(umkm => {
    const cocokKategori = filterKategori === 'Semua' || umkm.kategori === filterKategori;
    const cocokNama = umkm.nama.toLowerCase().includes(searchQuery.toLowerCase());
    return cocokKategori && cocokNama;
  });

  return (
    <div className="flex flex-col h-screen w-full">
      {/* Navbar */}
      <nav className="bg-orange-600 text-white flex items-center px-4 shadow-md z-[1000]" style={{ height: '56px' }}>
        <h1 className="text-lg font-bold flex items-center gap-2">📍 SIG UMKM Real-Database</h1>
      </nav>

      {/* Konten Utama */}
      <div className="flex flex-col md:flex-row flex-grow h-[calc(100vh-56px)] w-full">
        {/* Sidebar */}
        <div className="w-full md:w-1/3 bg-gray-50 p-4 flex flex-col border-r border-gray-200 sidebar overflow-y-auto">
          <h2 className="text-xl font-bold text-gray-800">Daftar UMKM Terdekat</h2>
          <hr className="my-2 border-gray-300" />
          
          <div className="mb-3">
            <input 
              type="text" className="w-full px-3 py-2 text-sm bg-white border border-orange-500 rounded-md"
              placeholder="Cari UMKM..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <select 
              className="w-full px-3 py-2 text-sm bg-white border border-orange-500 rounded-md"
              value={filterKategori} onChange={(e) => setFilterKategori(e.target.value)}
            >
              <option value="Semua">✨ Semua Kategori</option>
              {dataKategori.map(cat => (
                <option key={cat.id} value={cat.nama_kategori}>📁 {cat.nama_kategori}</option>
              ))}
            </select>
          </div>

          {/* List Box */}
          <div className="flex-grow space-y-2 overflow-y-auto mb-4">
            {dataFilter.map((umkm) => (
              <div 
                key={umkm.id}
                className={`p-3 bg-white border-l-4 border-orange-500 rounded-r-md shadow-sm cursor-pointer ${activeUmkmId === umkm.id ? 'bg-orange-50' : ''}`}
                onClick={() => { setSelectedCoords([umkm.lat, umkm.lon]); setActiveUmkmId(umkm.id); }}
              >
                <div className="flex justify-between">
                  <h3 className="font-bold text-sm">{umkm.nama}</h3>
                  <span className="text-xs text-orange-600 font-bold">{umkm.jarak ? `${umkm.jarak.toFixed(2)} Km` : '-'}</span>
                </div>
                <p className="text-xs text-gray-500">{umkm.alamat}</p>
              </div>
            ))}
          </div>

          {/* Ulasan Box */}
          {activeUmkmId && (
            <div className="p-3 bg-white rounded-md shadow-sm border border-orange-500">
              <h4 className="text-sm font-bold text-orange-600 mb-2">⭐ Ulasan Publik</h4>
              <div className="mb-2 p-2 bg-gray-50 max-h-[100px] overflow-y-auto text-[11px] space-y-1">
                {dataUlasan.filter(u => u.umkm_id === activeUmkmId).map(ulasan => (
                  <div key={ulasan.id} className="border-b pb-1">
                    <div className="flex justify-between">
                      <span className="font-bold">{ulasan.nama_reviewer}</span>
                      <span className="text-yellow-500">{"★".repeat(ulasan.rating)}</span>
                    </div>
                    <p className="text-gray-500">{ulasan.komentar}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={(e) => tambahUlasan(e, activeUmkmId)} className="space-y-1.5">
                <div className="grid grid-cols-3 gap-1">
                  <input type="text" className="col-span-2 px-2 py-1 text-xs border rounded" placeholder="Nama" value={inputNama} onChange={(e) => setInputNama(e.target.value)} />
                  <select className="px-1 py-1 text-xs border rounded" value={inputRating} onChange={(e) => setInputRating(e.target.value)}>
                    <option value="5">5 ★</option><option value="4">4 ★</option><option value="3">3 ★</option>
                  </select>
                </div>
                <textarea className="w-full px-2 py-1 text-xs border rounded" rows="1" placeholder="Tulis ulasan..." value={inputKomentar} onChange={(e) => setInputKomentar(e.target.value)}></textarea>
                <button type="submit" className="w-full py-1 bg-orange-500 text-white text-xs font-bold rounded">Kirim & Simpan</button>
              </form>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="w-full md:w-2/3 h-full z-10 relative">
          <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {userCoords && <Marker position={[userCoords.lat, userCoords.lon]}><Popup>Anda</Popup></Marker>}
            {dataFilter.map((umkm) => (
              <Marker key={umkm.id} position={[umkm.lat, umkm.lon]}>
                <Popup><b>{umkm.nama}</b><br/>Jarak: {umkm.jarak?.toFixed(2)} Km</Popup>
              </Marker>
            ))}
            <RecenterMap coords={selectedCoords} />
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

export default App;