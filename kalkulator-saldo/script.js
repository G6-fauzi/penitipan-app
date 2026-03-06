/* --- 1. LOGIKA PERHITUNGAN --- */

// Tambahkan parameter 'skipLoading' agar saat ganti tema tidak perlu loading ulang
function hitungSaldo(skipLoading = false) {
  const inputTanggal = document.getElementById('tanggalMulai').value;
  const inputHari = document.getElementById('jumlahHari').value;
  const hasilElem = document.getElementById('hasil');
  const loadingElem = document.getElementById('loading');

  // Validasi Input
  if (!inputTanggal || !inputHari) {
    hasilElem.innerHTML = ''; // Kosongkan jika input tidak lengkap
    if (!skipLoading) {
      hasilElem.innerHTML = `<span class='text-red-500 fade-in font-bold'>⚠️ Mohon lengkapi data.</span>`;
    }
    return;
  }

  const tanggalMulai = new Date(inputTanggal);
  const jumlahHari = parseInt(inputHari);

  // --- A. LOGIKA MATEMATIKA (BIAYA) ---
  // 1 Paket (30 Hari) = Rp 350.000
  // Harian = Rp 11.700
  
  const jumlahPaketBulanan = Math.floor(jumlahHari / 30); // Berapa kali kelipatan 30 hari
  const sisaHari = jumlahHari % 30; // Sisa hari yang tidak genap 30
  
  const totalBiaya = (jumlahPaketBulanan * 350000) + (sisaHari * 11700);
  
  // Format Rupiah
  const formatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  const biayaStr = formatter.format(totalBiaya);

  // --- B. LOGIKA TANGGAL ---
  const tanggalAkhir = new Date(tanggalMulai);
  tanggalAkhir.setDate(tanggalMulai.getDate() + jumlahHari - 1);
  const akhirStr = tanggalAkhir.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

  // --- C. FUNGSI RENDER (TAMPILAN) ---
  const renderResult = () => {
    let boxClass, textColor, labelColor, dividerColor;

    // Penyesuaian warna berdasarkan tema aktif
    if (currentTheme === 0) {
        // Tema Default (Light)
        boxClass = 'bg-indigo-50 border-indigo-200'; 
        textColor = 'text-indigo-900';
        labelColor = 'text-indigo-600';
        dividerColor = 'border-indigo-200';
    } else {
        // Tema Dark & Video
        boxClass = 'bg-white/10 border-white/20'; 
        textColor = 'text-white';
        labelColor = 'text-indigo-200';
        dividerColor = 'border-white/20';
    }

    hasilElem.innerHTML = `
      <div class="${boxClass} border rounded-xl p-5 mt-6 shadow-lg fade-in backdrop-blur-sm text-left">
        <div class="mb-3">
            <p class="${labelColor} text-xs uppercase tracking-wider font-bold mb-1">Saldo berakhir sampai</p>
            <p class="text-2xl font-bold ${textColor}">${akhirStr}</p>
        </div>

        <hr class="${dividerColor} border-t mb-3">

        <div>
            <p class="${labelColor} text-xs uppercase tracking-wider font-bold mb-1">Total Yang Harus Dibayar</p>
            <div class="flex justify-between items-end">
                <p class="text-xl font-semibold ${textColor}">${biayaStr}</p>
                <p class="text-xs ${labelColor} opacity-80">(${jumlahHari} Hari)</p>
            </div>
        </div>
      </div>
    `;
  };

  // --- D. EKSEKUSI (LOADING CONTROLLER) ---
  if (skipLoading) {
    // Jika dipanggil dari Ganti Tema -> Langsung Render (Instan)
    renderResult();
  } else {
    // Jika dipanggil dari Tombol Hitung -> Pakai Loading Dulu
    hasilElem.innerHTML = ''; // Bersihkan hasil lama
    loadingElem.classList.remove('hidden');
    
    setTimeout(() => {
      loadingElem.classList.add('hidden');
      renderResult();
    }, 500); // Loading 0.5 detik
  }
}

/* --- 2. LOGIKA TEMA --- */
const themeToggle = document.getElementById('themeToggle');
const mainCard = document.getElementById('mainCard');

const layers = {
  default: document.getElementById('gradDefault'),
  dark: document.getElementById('gradDark'),
  particles: document.getElementById('tsparticles'),
  video: document.getElementById('videoWrapper')
};

const videoElement = document.getElementById('bgVideo');
let currentTheme = 0; 
let particlesLoaded = false;
let videoLoaded = false;

// Load Tema dari Storage
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('saldoAppTheme');
    if (savedTheme !== null) {
        currentTheme = parseInt(savedTheme);
    }
    applyTheme(true);
    setTimeout(() => document.body.classList.add('loaded'), 100);
});

themeToggle.addEventListener('click', () => {
  currentTheme = (currentTheme + 1) % 3;
  localStorage.setItem('saldoAppTheme', currentTheme);
  applyTheme();
});

function applyTheme() {
  mainCard.classList.remove('card-dark', 'card-video');
  Object.values(layers).forEach(el => el.classList.remove('active'));

  if (currentTheme === 0) {
    // DEFAULT
    themeToggle.textContent = '🌓';
    layers.default.classList.add('active');
    layers.particles.classList.add('active');
    loadParticles();
  } 
  else if (currentTheme === 1) {
    // DARK
    themeToggle.textContent = '🌑';
    layers.dark.classList.add('active');
    layers.particles.classList.add('active');
    mainCard.classList.add('card-dark');
    loadParticles();
  } 
  else if (currentTheme === 2) {
    // VIDEO
    themeToggle.textContent = '🎥';
    layers.video.classList.add('active');
    mainCard.classList.add('card-video');
    
    if (!videoLoaded) {
      const source = document.createElement('source');
      source.src = 'livewall.mp4'; // Pastikan file ada
      source.type = 'video/mp4';
      videoElement.appendChild(source);
      videoElement.load();
      videoLoaded = true;
    }
    videoElement.play();
  }
  
  // 🔹 CHECKPOINT: Update Tampilan Hasil Tanpa Loading
  // Kita cek apakah input sudah terisi. Jika ya, update style box hasil secara instan.
  const inputTanggal = document.getElementById('tanggalMulai').value;
  const inputHari = document.getElementById('jumlahHari').value;
  
  if (inputTanggal && inputHari) {
      // TRUE = Skip Loading (Instan)
      hitungSaldo(true); 
  }
}

function loadParticles() {
  if (particlesLoaded) return;
  
  tsParticles.load("tsparticles", {
    fpsLimit: 120,
    particles: {
      number: { value: 40, density: { enable: true, area: 800 } },
      color: { value: "#ffffff" },
      shape: { type: "circle" },
      opacity: { value: 0.6, random: true },
      size: { value: 3.5, random: true },
      links: { enable: false }, 
      move: { 
        enable: true, 
        speed: 1, 
        direction: "none", 
        outModes: "out" 
      }
    },
    interactivity: {
      events: { onHover: { enable: true, mode: "repulse" } },
      modes: { repulse: { distance: 100, duration: 0.4 } }
    },
    detectRetina: true
  });
  particlesLoaded = true;
}