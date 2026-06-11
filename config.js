// =============================================
// BukuKu — Konfigurasi Server
// Cukup ganti file INI SAJA saat pindah server
// =============================================

// Untuk development (WiFi lokal):
// const SERVER = "http://192.168.1.23:8000";

// Untuk production (sudah deploy):
const SERVER = "https://web-production-7dfb7.up.railway.app";

window.BUKUKU_SERVER = SERVER;
window.BUKUKU_API_BASE = SERVER + "/api";
