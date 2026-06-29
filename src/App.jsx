import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Perbaikan bug icon marker Leaflet di React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Komponen helper untuk menggerakkan kamera peta
function RecenterMap({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.setView(coords, 16);
    }
  }, [coords, map]);
  return null;
}

function App() {
  // 1. Data Sampel UMKM
  const [dataUmkm, setDataUmkm] = useState([
    { id: 1, nama: 'Keripik Nanas Sejahtera', kategori: 'Kuliner', lat: -0.4500000, lon: 101.4200000, alamat: 'Jl. Riau No. 12' },
    { id: 2, nama: 'Batik Lancang Kuning', kategori: 'Fashion', lat: -0.4650000, lon: 101.4450000, alamat: 'Jl. Sudirman No. 45' },
    { id: 3, nama: 'Kerajinan Rotan Jaya', kategori: 'Kerajinan', lat: -0.4800000, lon: 101.4100000, alamat: 'Jl. Soebrantas No. 89' },
    { id: 4, nama: 'Bakso Mas Joko', kategori: 'Kuliner', lat: -0.4700000, lon: 101.4300000, alamat: 'Jl. Tuanku Tambusai No. 5' }
  ]);

  // 2. Data Sampel Ulasan Awal
  const [dataUlasan, setDataUlasan] = useState([
    { id_ulasan: 1, id_umkm: 1, nama: 'Budi', rating: 5, komentar: 'Keripiknya renyah banget!' },
    { id_ulasan: 2, id_umkm: 1, nama: 'Siti', rating: 4, komentar: 'Rasa nanasnya segar, mantap.' },
    { id_ulasan: 3, id_umkm: 4, nama: 'Andi', rating: 5, komentar: 'Baksonya uratnya terasa dan kuahnya gurih.' }
  ]);

  // 3. State Manajemen Aplikasi
  const [userCoords, setUserCoords] = useState(null);
  const [mapCenter, setMapCenter] = useState([-0.478, 101.447]); // Default Pekanbaru
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [filterKategori, setFilterKategori] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeUmkmId, setActiveUmkmId] = useState(null);

  // State untuk Input Ulasan Baru
  const [inputNama, setInputNama] = useState('');
  const [inputRating, setInputRating] = useState(5);
  const [inputKomentar, setInputKomentar] = useState('');

  // 4. Fungsi Rumus Haversine Formula
  const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Jari-jari bumi dalam KM
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
  };

  // 5. Lifecycle untuk Deteksi Geolocation GPS
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserCoords({ lat: latitude, lon: longitude });
          setMapCenter([latitude, longitude]);

          const dataDenganJarak = dataUmkm.map(umkm => ({
            ...umkm,
            jarak: haversineDistance(latitude, longitude, umkm.lat, umkm.lon)
          })).sort((a, b) => a.jarak - b.jarak);

          setDataUmkm(dataDenganJarak);
        },
        () => {
          // Fallback jika GPS mati, hitung jarak dari koordinat default pusat kota
          const dataDenganJarak = dataUmkm.map(umkm => ({
            ...umkm,
            jarak: haversineDistance(-0.478, 101.447, umkm.lat, umkm.lon)
          })).sort((a, b) => a.jarak - b.jarak);
          setDataUmkm(dataDenganJarak);
        }
      );
    }
  }, []);

  // 6. Logika Filter Kategori dan Search Nama UMKM
  const dataFilter = dataUmkm.filter(umkm => {
    const cocokKategori = filterKategori === 'Semua' || umkm.kategori === filterKategori;
    const cocokNama = umkm.nama.toLowerCase().includes(searchQuery.toLowerCase());
    return cocokKategori && cocokNama;
  });

  // 7. Fungsi Kirim Ulasan Baru
  const tambahUlasan = (e, idUmkm) => {
    e.preventDefault();
    if (!inputNama || !inputKomentar) {
      alert("Nama dan komentar tidak boleh kosong!");
      return;
    }

    const ulasanBaru = {
      id_ulasan: Date.now(),
      id_umkm: idUmkm,
      nama: inputNama,
      rating: parseInt(inputRating),
      komentar: inputKomentar
    };

    setDataUlasan([...dataUlasan, ulasanBaru]);
    setInputNama('');
    setInputRating(5);
    setInputKomentar('');
    alert("Terima kasih, ulasan berhasil dikirim!");
  };

  return (
    <div className="d-flex flex-column" style={{ height: '100vh' }}>
      {/* Navbar Tema Oranye */}
      <nav className="navbar navbar-dark shadow-sm px-3" style={{ height: '56px', backgroundColor: '#ff6600' }}>
        <span className="navbar-brand mb-0 h1"> SIG UMKM Terdekat</span>
      </nav>

      {/* Konten Utama (Sidebar & Peta) */}
      <div className="row g-0 flex-grow-1">
        {/* Sidebar Kiri */}
        <div className="col-md-4 bg-light p-3 sidebar">
          <h5>Daftar UMKM Terdekat</h5>
          <p className="text-muted small">
            {userCoords 
              ? `Lokasi Anda: ${userCoords.lat.toFixed(5)}, ${userCoords.lon.toFixed(5)}`
              : "Menggunakan lokasi pusat kota (GPS Bermasalah)"}
          </p>
          <hr />
          
          {/* Kolom Pencarian Nama */}
          <div className="mb-3">
            <label className="form-label fw-bold small text-secondary">Cari Nama UMKM:</label>
            <input 
              type="text"
              className="form-control shadow-sm"
              style={{ borderColor: '#ff6600' }}
              placeholder="Ketik nama toko / usaha..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Pilihan Kategori */}
          <div className="mb-3">
            <label className="form-label fw-bold small text-secondary">Filter Kategori Usaha:</label>
            <select 
              className="form-select shadow-sm"
              style={{ borderColor: '#ff6600' }}
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
            >
              <option value="Semua"> Tampilkan Semua Kategori</option>
              <option value="Kuliner"> Kuliner / Makanan</option>
              <option value="Fashion"> Fashion / Pakaian</option>
              <option value="Kerajinan"> Kerajinan / Kreatif</option>
            </select>
          </div>

          {/* List Daftar Item UMKM */}
          <div className="list-group" style={{ maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}>
            {dataFilter.length > 0 ? (
              dataFilter.map((umkm) => (
                <div 
                  key={umkm.id}
                  className={`list-group-item list-group-item-action mb-2 shadow-sm border-start border-4 ${activeUmkmId === umkm.id ? 'bg-white' : ''}`}
                  style={{ cursor: 'pointer', borderColor: '#ff6600' }}
                  onClick={() => {
                    setSelectedCoords([umkm.lat, umkm.lon]);
                    setActiveUmkmId(umkm.id);
                  }}
                >
                  <div className="d-flex w-100 justify-content-between">
                    <h6 className="mb-1 fw-bold">{umkm.nama}</h6>
                    <small className="fw-bold" style={{ color: '#ff6600' }}>
                      {umkm.jarak ? `${umkm.jarak.toFixed(2)} Km` : '-'}
                    </small>
                  </div>
                  <p className="mb-1 small text-muted">{umkm.alamat}</p>
                  <span className="badge" style={{ backgroundColor: '#ff6600' }}>{umkm.kategori}</span>
                </div>
              ))
            ) : (
              <p className="text-center text-muted my-4">UMKM tidak ditemukan.</p>
            )}
          </div>

          {/* Kotak Interaksi Ulasan (Hanya muncul jika item UMKM diklik) */}
          {activeUmkmId && (
            <div className="mt-3 p-3 bg-white rounded shadow-sm border" style={{ borderColor: '#ff6600' }}>
              <h6 className="fw-bold" style={{ color: '#ff6600' }}>
                ⭐ Ulasan: {dataUmkm.find(u => u.id === activeUmkmId)?.nama}
              </h6>
              
              {/* Tampilan Daftar Komentar */}
              <div className="mb-3 border rounded p-2 bg-light" style={{ maxHeight: '110px', overflowY: 'auto' }}>
                {dataUlasan.filter(u => u.id_umkm === activeUmkmId).length > 0 ? (
                  dataUlasan.filter(u => u.id_umkm === activeUmkmId).map(ulasan => (
                    <div key={ulasan.id_ulasan} className="border-bottom py-1 small">
                      <span className="fw-bold text-dark">{ulasan.nama}</span> 
                      <span className="text-warning ms-2">{"★".repeat(ulasan.rating)}</span>
                      <p className="mb-0 text-muted" style={{ fontSize: '11px' }}>{ulasan.komentar}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted small mb-0 text-center py-2">Belum ada ulasan.</p>
                )}
              </div>

              {/* Form Input Komentar Baru */}
              <form onSubmit={(e) => tambahUlasan(e, activeUmkmId)}>
                <div className="row g-1 mb-1">
                  <div className="col-7">
                    <input 
                      type="text" 
                      className="form-control form-control-sm" 
                      style={{ borderColor: '#ff6600' }}
                      placeholder="Nama"
                      value={inputNama}
                      onChange={(e) => setInputNama(e.target.value)}
                    />
                  </div>
                  <div className="col-5">
                    <select 
                      className="form-select form-select-sm"
                      style={{ borderColor: '#ff6600' }}
                      value={inputRating}
                      onChange={(e) => setInputRating(e.target.value)}
                    >
                      <option value="5">5 ★</option>
                      <option value="4">4 ★</option>
                      <option value="3">3 ★</option>
                      <option value="2">2 ★</option>
                      <option value="1">1 ★</option>
                    </select>
                  </div>
                </div>
                <div className="mb-1">
                  <textarea 
                    className="form-control form-control-sm" 
                    style={{ borderColor: '#ff6600' }}
                    rows="1" 
                    placeholder="Tulis ulasan..."
                    value={inputKomentar}
                    onChange={(e) => setInputKomentar(e.target.value)}
                  ></textarea>
                </div>
                <button type="submit" className="btn btn-sm text-white w-100 fw-bold" style={{ backgroundColor: '#ff6600' }}>
                  Kirim Ulasan
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Peta Sebelah Kanan */}
        <div className="col-md-8 position-relative" style={{ height: 'calc(100vh - 56px)' }}>
          <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Penanda Lokasi Pengguna */}
            {userCoords && (
              <Marker position={[userCoords.lat, userCoords.lon]}>
                <Popup><b>Lokasi Anda Sekarang</b></Popup>
              </Marker>
            )}

            {/* Penanda Lokasi UMKM */}
            {dataFilter.map((umkm) => (
              <Marker key={umkm.id} position={[umkm.lat, umkm.lon]}>
                <Popup>
                  <b>{umkm.nama}</b><br />
                  Kategori: {umkm.kategori}<br />
                  {umkm.jarak && `Jarak: ${umkm.jarak.toFixed(2)} Km`}
                </Popup>
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