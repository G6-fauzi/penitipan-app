// =================================================================
// KONFIGURASI APLIKASI
// =================================================================
// ⚠️ MASUKKAN API KEY GOOGLE GEMINI ANDA DI BAWAH INI
const apiKey = "AIzaSyDAJXXYdw43O7x5nXPFq2gyBTvnZcqMgf0"; 

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSGyZmd8oN7ZX__52lX-xQVI1u8MXqNpaEbVWtjVBUUc1E9mK4sl-AQ_4jtaf-qxdhrjP-HmW8ao2li/pub?output=csv";

let rawData = [];
let todayData = [];
let filteredDataForAI = []; // Data yang sedang tampil di layar

const TRX_MASUK = ["TOP UP", "SETOR"];
const TRX_KELUAR = ["CASH OUT", "PENARIKAN", "TARIK"];

// =================================================================
// INISIALISASI (Saat Halaman Dibuka)
// =================================================================
window.onload = function () {
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    document.getElementById("currentDateDisplay").innerText = new Date().toLocaleDateString("id-ID", options);
    console.log("Memulai proses ambil data...");
    fetchData();
};

// =================================================================
// FUNGSI PENGAMBILAN DATA (Google Sheets)
// =================================================================
function fetchData() {
    Papa.parse(SHEET_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
            console.log("✅ Data berhasil ditarik!");
            rawData = results.data;
            filterTodayData();
            populateTellers();
            document.getElementById("loading").style.display = "none";
            document.getElementById("dashboardContent").style.display = "block";
            applyCalculation();
        },
        error: function (err) {
            alert("❌ Gagal mengambil data.");
            console.error(err);
        },
    });
}

function parseUniversalDate(dateStr) {
    if (!dateStr) return null;
    dateStr = dateStr.trim();
    let datePart = dateStr.split(" ")[0];
    let timePart = dateStr.split(" ")[1] || "00:00:00";
    let day, month, year;

    if (datePart.includes("/")) {
        const parts = datePart.split("/");
        day = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
        year = parseInt(parts[2]);
    } else if (datePart.includes("-")) {
        const parts = datePart.split("-");
        if (parts[0].length === 4) {
            year = parseInt(parts[0]);
            month = parseInt(parts[1]) - 1;
            day = parseInt(parts[2]);
        } else {
            day = parseInt(parts[0]);
            month = parseInt(parts[1]) - 1;
            year = parseInt(parts[2]);
        }
    } else {
        return new Date(dateStr);
    }
    const timeParts = timePart.split(":");
    return new Date(year, month, day, parseInt(timeParts[0])||0, parseInt(timeParts[1])||0, parseInt(timeParts[2])||0);
}

function filterTodayData() {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    todayData = rawData.filter((row) => {
        if (!row.WAKTU) return false;
        const d = parseUniversalDate(row.WAKTU);
        if (!d) return false;
        const rowStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return rowStr === todayStr;
    });
}

// =================================================================
// LOGIKA FILTER & KALKULASI
// =================================================================
function populateTellers() {
    const tellers = new Set();
    todayData.forEach((row) => { if (row.PETUGAS) tellers.add(row.PETUGAS.trim()); });
    const select = document.getElementById("filterTeller");
    select.innerHTML = '<option value="All">Semua Petugas</option>';
    Array.from(tellers).sort().forEach((t) => {
        const opt = document.createElement("option");
        opt.value = t; opt.text = t; select.appendChild(opt);
    });
}

function handleShiftChange() {
    const s = document.getElementById("filterShift").value;
    document.getElementById("customTimeWrapper").style.display = s === "Custom" ? "flex" : "none";
    applyCalculation();
}

function timeToMinutes(timeStr) {
    if (!timeStr) return -1;
    const parts = timeStr.split(":");
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

function applyCalculation() {
    const modalAwal = parseFloat(document.getElementById("inputModal").value) || 0;
    const selectedShift = document.getElementById("filterShift").value;
    const selectedTeller = document.getElementById("filterTeller").value;
    const customStartMin = timeToMinutes(document.getElementById("customStart").value);
    const customEndMin = timeToMinutes(document.getElementById("customEnd").value);

    const finalData = todayData.filter((row) => {
        const d = parseUniversalDate(row.WAKTU);
        if (!d) return false;
        if (selectedTeller !== "All" && row.PETUGAS !== selectedTeller) return false;

        const mins = d.getHours() * 60 + d.getMinutes();
        if (selectedShift === "Pagi") return mins >= 0 && mins <= 720;
        if (selectedShift === "Siang") return mins >= 721 && mins <= 1080;
        if (selectedShift === "Malam") return mins >= 1081 && mins <= 1439;
        if (selectedShift === "Custom" && customStartMin !== -1 && customEndMin !== -1) {
            return mins >= customStartMin && mins <= customEndMin;
        }
        return true;
    });

    filteredDataForAI = finalData; 
    updateUI(finalData, modalAwal);
}

function updateUI(data, modal) {
    let totalMasuk = 0, totalKeluar = 0, totalLain = 0;
    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = "";

    data.slice().forEach((row, index) => {
        let amount = parseFloat(row.NOMINAL ? row.NOMINAL.toString().replace(/[^0-9]/g, "") : "0") || 0;
        const jenis = row.TRANSAKSI ? row.TRANSAKSI.toUpperCase().trim() : "";
        
        let labelClass = "tag-other", color = "#64748b";
        if (TRX_MASUK.includes(jenis)) { totalMasuk += amount; labelClass = "tag-in"; color = "var(--success)"; }
        else if (TRX_KELUAR.includes(jenis)) { totalKeluar += amount; labelClass = "tag-out"; color = "var(--danger)"; }
        else { totalLain += amount; }

        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${index + 1}</td><td>${row.WAKTU ? row.WAKTU.split(" ")[1] : "-"}</td><td>${row.PETUGAS || "-"}</td><td><span class="tag ${labelClass}">${row.TRANSAKSI}</span></td><td style="font-weight:bold; color: ${color}">${formatRupiah(amount)}</td>`;
        tbody.appendChild(tr);
    });

    document.getElementById("finalBalance").innerText = formatRupiah(modal + totalMasuk - totalKeluar);
    document.getElementById("totalIn").innerText = formatRupiah(totalMasuk);
    document.getElementById("totalOut").innerText = formatRupiah(totalKeluar);
    if(document.getElementById("totalOther")) document.getElementById("totalOther").innerText = formatRupiah(totalLain);
    document.getElementById("totalCount").innerText = data.length + " Trx";

    if (data.length === 0) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Belum ada data.</td></tr>';
}

function formatRupiah(angka) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka);
}

// =================================================================
// LOGIKA MODE KOREKSI (CHECKLIST)
// =================================================================
let correctionData = []; 
function openCorrectionMode() {
    correctionData = filteredDataForAI.map((row, index) => ({ ...row, tempId: index, isChecked: false }));
    document.getElementById("searchCorrection").value = "";
    document.getElementById("correctionModal").style.display = "flex";
    renderCorrectionList();
}
function closeCorrectionMode() { document.getElementById("correctionModal").style.display = "none"; }

function renderCorrectionList() {
    const tbody = document.getElementById("correctionBody");
    const searchVal = document.getElementById("searchCorrection").value.toLowerCase();
    tbody.innerHTML = "";
    let filtered = correctionData.filter(item => (item.USER || "").toLowerCase().includes(searchVal));
    filtered.sort((a, b) => (a.isChecked === b.isChecked) ? a.tempId - b.tempId : (a.isChecked ? 1 : -1));

    document.getElementById("checkedCount").innerText = filtered.filter(x => x.isChecked).length;
    document.getElementById("totalCorrectionCount").innerText = filtered.length;

    if (filtered.length === 0) { tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Data tidak ditemukan</td></tr>'; return; }

    filtered.forEach(item => {
        const tr = document.createElement("tr");
        if (item.isChecked) tr.classList.add("row-checked");
        tr.onclick = function() { toggleCorrectionItem(item.tempId); };
        
        let amount = parseFloat((item.NOMINAL || "0").toString().replace(/[^0-9]/g, "")) || 0;
        const jenis = (item.TRANSAKSI || "").toUpperCase().trim();
        let color = (!item.isChecked && TRX_MASUK.includes(jenis)) ? "var(--success)" : (!item.isChecked && TRX_KELUAR.includes(jenis)) ? "var(--danger)" : "inherit";
        
        tr.innerHTML = `<td><div style="font-weight:600">${item.USER || "-"}</div><div style="font-size:0.75rem; color:#94a3b8;">${(item.WAKTU || "").split(" ")[1]}</div></td><td>${item.TRANSAKSI}</td><td style="font-weight:bold; color: ${color}">${formatRupiah(amount)}</td>`;
        tbody.appendChild(tr);
    });
}
function toggleCorrectionItem(tempId) {
    const t = correctionData.find(x => x.tempId === tempId);
    if (t) { t.isChecked = !t.isChecked; renderCorrectionList(); }
}

// =================================================================
// LOGIKA DETEKTIF AI (ANOMALY DETECTOR) 🕵️
// =================================================================

function openAnomalyModal() {
    document.getElementById("aiModal").style.display = "flex";
    document.getElementById("aiInputPrompt").focus();
}

function closeAIModal() {
    document.getElementById("aiModal").style.display = "none";
}

async function analyzeAnomaly() {
    const userQuery = document.getElementById("aiInputPrompt").value;
    if (!userQuery) {
        alert("Mohon ceritakan masalahnya dulu (misal: 'kurang 50rb')");
        return;
    }

    const outputDiv = document.getElementById("aiOutput");
    const btn = document.getElementById("btnAnalyze");
    
    // UI Loading State
    btn.disabled = true;
    btn.innerHTML = "🕵️ Sedang Menyelidiki...";
    outputDiv.innerHTML = `<div class="ai-loading">🔎 Sedang memindai ${filteredDataForAI.length} transaksi...<br>Mencari penyebab "${userQuery}"...</div>`;

    // 1. Siapkan Data Transaksi (Simplified untuk menghemat token)
    const transactionList = filteredDataForAI.map((row, idx) => {
        return {
            id: idx + 1,
            jam: row.WAKTU ? row.WAKTU.split(" ")[1] : "-",
            nama: row.USER || row.PETUGAS,
            tipe: row.TRANSAKSI,
            nominal: row.NOMINAL
        };
    });

    // 2. Buat Prompt Detektif
    const prompt = `
Bertindaklah sebagai Auditor Forensik yang to-the-point, singkat, dan tegas.
Tujuan: Identifikasi penyebab selisih saldo berdasarkan keluhan user.
JANGAN bertele-tele. JANGAN jelaskan definisi istilah (seperti "minus artinya kurang"). Langsung ke data.

KELUHAN: "${userQuery}"

DATA TRANSAKSI (JSON):
${JSON.stringify(transactionList)}

INSTRUKSI:
1. Cari transaksi ganda (Nama & Nominal sama, waktu dekat).
2. Cari nominal yang persis sama dengan selisih yang dikeluhkan.
3. Cari salah input kategori (Top Up jadi Tarik Tunai).

FORMAT JAWABAN (Markdown, Bahasa Indonesia):
**Indikasi Utama:**
[Sebutkan dugaan terkuat dalam 1 kalimat]

**Kemungkinan Penyebab:**
* [Baris X - Nama - Nominal]: [Alasan, misal: "Kemungkinan input ganda"]
* [Baris Y - Nama - Nominal]: [Alasan, misal: "Nominal cocok dengan selisih"]

**Tindakan:**
[Saran pemeriksaan fisik singkat]
    `;

    try {
        // 3. Panggil API Gemini
        const responseText = await callGeminiAPI(prompt);
        
        // 4. Tampilkan Hasil
        outputDiv.innerHTML = marked.parse(responseText);
    } catch (error) {
        outputDiv.innerHTML = `<p style="color:red">Gagal melakukan analisa: ${error.message}</p>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = "🔍 Analisa Sekarang";
    }
}

async function callGeminiAPI(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const payload = { contents: [{ parts: [{ text: prompt }] }] };
    
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}
