import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from './supabaseClient';
import './App.css'; // <-- Mengaktifkan CSS Baru
import 'leaflet/dist/leaflet.css'; // <-- Mengaktifkan CSS Peta Leaflet agar tidak hilang

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

  const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    const { data: categories } = await supabase.from('categories').select('*');
    setDataKategori(categories || []);

    const { data: umkmList } = await supabase.from('umkm').select(`
      id, nama, lat, lon, alamat,
      categories ( nama_kategori )
    `);

    const formattedUmkm = (umkmList || []).map(item => ({
      id: item.id,
      nama: item.nama,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      alamat: item.alamat,
      kategori: item.categories?.nama_kategori || 'Lainnya'
    }));

    const { data: reviews } = await supabase.from('reviews').select('*');
    setDataUlasan(reviews || []);

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
        const berjarak = formattedUmkm.map(u => ({
          ...u,
          jarak: haversineDistance(-0.478, 101.447, u.lat, u.lon)
        })).sort((a, b) => a.jarak - b.jarak);
        setDataUmkm(berjarak);
      });
    }
  };

  const tambahUlasan = async (e, idUmkm) => {
    e.preventDefault();
    if (!inputNama || !inputKomentar) return alert("Form tidak boleh kosong!");

    const { error } = await supabase.from('reviews').insert([
      { umkm_id: idUmkm, nama_reviewer: inputNama, rating: parseInt(inputRating), komentar: inputKomentar }
    ]);

    if (!error) {
      fetchInitialData();
      setInputNama('');
      setInputKomentar('');
      alert("Ulasan berhasil disimpan!");
    }
  };

  const dataFilter = dataUmkm.filter(umkm => {
    const cocokKategori = filterKategori === 'Semua' || umkm.kategori === filterKategori;
    const cocokNama = umkm.nama.toLowerCase().includes(searchQuery.toLowerCase());
    return cocokKategori && cocokNama;
  });

  return (
    <div>
      {/* Navbar */}
      <nav className="navbar">
        <h1>📍 SIG UMKM Real-Database</h1>
      </nav>

      {/* Main Layout */}
      <div className="main-container">
        {/* Sidebar */}
        <div className="sidebar">
          <h2>Daftar UMKM Terdekat</h2>
          
          <input 
            type="text" className="input-control" placeholder="Cari UMKM..." 
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          />

          <select 
            className="input-control" value={filterKategori} 
            onChange={(e) => setFilterKategori(e.target.value)}
          >
            <option value="Semua">✨ Semua Kategori</option>
            {dataKategori.map(cat => (
              <option key={cat.id} value={cat.nama_kategori}>📁 {cat.nama_kategori}</option>
            ))}
          </select>

          {/* List UMKM */}
          <div className="umkm-list">
            {dataFilter.map((umkm) => (
              <div 
                key={umkm.id}
                className={`umkm-card ${activeUmkmId === umkm.id ? 'active' : ''}`}
                onClick={() => { setSelectedCoords([umkm.lat, umkm.lon]); setActiveUmkmId(umkm.id); }}
              >
                <div className="umkm-card-header">
                  <span className="umkm-title">{umkm.nama}</span>
                  <span className="umkm-distance">{umkm.jarak ? `${umkm.jarak.toFixed(2)} Km` : '-'}</span>
                </div>
                <p className="umkm-address">{umkm.alamat}</p>
              </div>
            ))}
          </div>

          {/* Ulasan */}
          {activeUmkmId && (
            <div className="review-box">
              <h4>⭐ Ulasan Publik</h4>
              <div className="review-list">
                {dataUlasan.filter(u => u.umkm_id === activeUmkmId).map(ulasan => (
                  <div key={ulasan.id} className="review-item">
                    <div style={{display:'flex', justifyContent:'space-between'}}>
                      <b>{ulasan.nama_reviewer}</b>
                      <span style={{color:'#eab308'}}>{"★".repeat(ulasan.rating)}</span>
                    </div>
                    <p style={{color:'#6b7280'}}>{ulasan.komentar}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={(e) => tambahUlasan(e, activeUmkmId)} className="review-form">
                <input type="text" placeholder="Nama" value={inputNama} onChange={(e) => setInputNama(e.target.value)} />
                <select value={inputRating} onChange={(e) => setInputRating(e.target.value)}>
                  <option value="5">5 ★</option><option value="4">4 ★</option><option value="3">3 ★</option>
                </select>
                <textarea rows="2" placeholder="Tulis ulasan..." value={inputKomentar} onChange={(e) => setInputKomentar(e.target.value)}></textarea>
                <button type="submit" className="btn-submit">Kirim & Simpan</button>
              </form>
            </div>
          )}
        </div>

        {/* Map Kontainer */}
        <div className="map-wrapper">
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