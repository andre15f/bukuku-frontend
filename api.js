// =============================================
// BukuKu — API Service
// Hubungkan frontend ke Laravel 11 API
// =============================================

// URL server dibaca dari config.js (load config.js sebelum api.js di HTML)
const API_BASE = window.BUKUKU_API_BASE || "https://web-production-7dfb7.up.railway.app/api";

// --- Helper: ambil token dari localStorage ---
function getToken() {
  return localStorage.getItem("bukuku_token");
}

// --- Helper: simpan data user setelah login ---
function saveSession(token, user) {
  localStorage.setItem("bukuku_token", token);
  localStorage.setItem("bukuku_user", JSON.stringify(user));
}

// --- Helper: hapus session ---
function clearSession() {
  localStorage.removeItem("bukuku_token");
  localStorage.removeItem("bukuku_user");
}

// --- Helper: ambil data user dari session ---
function getUser() {
  const raw = localStorage.getItem("bukuku_user");
  return raw ? JSON.parse(raw) : null;
}

// --- Helper: request ke API ---
async function apiRequest(method, endpoint, body = null, isFormData = false) {
  const headers = {};

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
    headers["Accept"] = "application/json";
  } else {
    headers["Accept"] = "application/json";
  }

  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = isFormData ? body : JSON.stringify(body);

  const res = await fetch(`${API_BASE}${endpoint}`, options);
  return res.json();
}

// =============================================
// AUTH FUNCTIONS
// =============================================

// --- REGISTER ---
async function apiRegister() {
  const nama = document.getElementById("reg-nama").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const npm = document.getElementById("reg-npm").value.trim();
  const pass = document.getElementById("reg-pass").value;
  const pass2 = document.getElementById("reg-pass2").value;
  const ktm = document.getElementById("ktm-file").files[0];

  // Validasi frontend sebelum kirim ke API
  if (!nama || !email || !npm || !pass || !pass2) {
    showToast("Lengkapi semua field yang wajib diisi.", "error");
    return;
  }
  if (!ktm) {
    showToast("Unggah foto KTM terlebih dahulu.", "error");
    return;
  }

  // Gunakan FormData karena ada upload file
  const formData = new FormData();
  formData.append("nama", nama);
  formData.append("email", email);
  formData.append("npm", npm);
  formData.append("password", pass);
  formData.append("password_confirmation", pass2);
  formData.append("ktm", ktm);

  // Tampilkan loading
  const btn = document.querySelector("#reg-step2 .btn-full");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Mengirim...";
  }

  try {
    const res = await apiRequest("POST", "/register", formData, true);

    if (res.success) {
      // Isi layar pending dengan data yang baru didaftarkan
      document.getElementById("pend-nama").textContent = nama;
      document.getElementById("pend-npm").textContent = npm;
      document.getElementById("pend-email").textContent = email;

      // Animasi step indicator
      document.getElementById("s2").classList.remove("active");
      document.getElementById("s2").classList.add("done");
      document.getElementById("s2-num").textContent = "✓";
      document.getElementById("s3").classList.add("active");
      document.getElementById("s3-num").textContent = "✓";

      setTimeout(() => showScreen("screen-pending"), 150);
    } else {
      // Tampilkan error validasi dari Laravel
      if (res.errors) {
        const pesan = Object.values(res.errors).flat().join("\n");
        showToast(pesan, "error");
      } else {
        showToast(res.message || "Pendaftaran gagal.", "error");
      }
    }
  } catch (err) {
    showToast("Tidak bisa terhubung ke server. Coba lagi.", "error");
    console.error(err);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Kirim Pendaftaran";
    }
  }
}

// --- LOGIN ---
async function apiLogin() {
  const npm = document.getElementById("login-npm").value.trim();
  const pass = document.getElementById("login-pass").value;
  const isPemilik = document
    .getElementById("login-role-pemilik")
    .classList.contains("selected");
  const role = isPemilik ? "pemilik" : "penyewa";

  if (!npm || !pass) {
    showToast("Masukkan NPM dan password.", "error");
    return;
  }

  const btn = document.querySelector("#screen-login .btn-full");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Masuk...";
  }

  try {
    const res = await apiRequest("POST", "/login", {
      npm,
      password: pass,
      role,
    });

    if (res.success) {
      saveSession(res.data.token, res.data.user);

      const inisial = res.data.user.nama
        .split(" ")
        .map((n) => n.charAt(0).toUpperCase())
        .slice(0, 2)
        .join("");

      const avatarIds = [
        "avatar-penyewa",
        "avatar-penyewa-chat",
        "avatar-penyewa-chat2",
        "avatar-pemilik",
        "avatar-pemilik-chat",
      ];

      avatarIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (res.data.user.foto_url) {
          el.innerHTML = `<img src="${res.data.user.foto_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
        } else {
          el.textContent = inisial;
        }
      });

      echoInstance = null; // reset dulu
      listenChat(res.data.user.id); // tambahkan baris ini
      showToast(
        "Login berhasil! Selamat datang, " + res.data.user.nama,
        "success",
      );

      setTimeout(() => {
        const isMobile = window.innerWidth <= 768;
        if (role === "pemilik") {
          showScreen("screen-pemilik");
          switchPemilikTab("overview");
          if (isMobile) document.getElementById("pemilik-bottom-nav").style.display = "flex";
        } else {
          showScreen("screen-penyewa");
          switchPenyewaTab("browse");
          loadSewaAktif();
          if (isMobile) document.getElementById("mobile-nav-penyewa").style.display = "flex";
        }
      }, 600);
    } else {
      // Tampilkan pesan status khusus
      if (res.status === "pending") {
        showToast(
          "Akun kamu masih diverifikasi admin. Tunggu 1×24 jam.",
          "warning",
        );
      } else if (res.status === "ditolak") {
        showToast(res.message, "error");
      } else {
        showToast(res.message || "Login gagal.", "error");
      }
    }
  } catch (err) {
    showToast("Tidak bisa terhubung ke server.", "error");
    console.error(err);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Masuk";
    }
  }
}

async function apiForgotPassword() {
  const npm = document.getElementById("forgot-npm").value.trim();
  if (!npm) {
    showToast("Masukkan NPM kamu terlebih dahulu.", "error");
    return;
  }

  const btn = document.getElementById("btn-forgot");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Mengirim...";
  }

  try {
    const res = await apiRequest("POST", "/forgot-password", { npm });
    if (res.success) {
      showToast("Kode reset telah dikirim ke email kamu.", "success");
      document.getElementById("forgot-npm").value = "";
      setTimeout(() => showScreen("screen-reset"), 1500);
    } else {
      showToast(res.message || "NPM tidak ditemukan.", "error");
    }
  } catch (err) {
    showToast("Tidak bisa terhubung ke server.", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Kirim Instruksi Reset";
    }
  }
}

async function apiResetPassword() {
  const token = document.getElementById("reset-token").value.trim();
  const pass = document.getElementById("reset-pass").value;
  const pass2 = document.getElementById("reset-pass2").value;

  if (!token || !pass || !pass2) {
    showToast("Lengkapi semua field.", "error");
    return;
  }
  if (token.length !== 6) {
    showToast("Kode reset harus 6 digit.", "error");
    return;
  }
  if (pass.length < 8) {
    showToast("Password minimal 8 karakter.", "error");
    return;
  }
  if (pass !== pass2) {
    showToast("Konfirmasi password tidak cocok.", "error");
    return;
  }

  const btn = document.getElementById("btn-reset");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Memproses...";
  }

  try {
    const res = await apiRequest("POST", "/reset-password", {
      token,
      password: pass,
      password_confirmation: pass2,
    });

    if (res.success) {
      showToast("Password berhasil diganti! Silakan login.", "success");
      document.getElementById("reset-token").value = "";
      document.getElementById("reset-pass").value = "";
      document.getElementById("reset-pass2").value = "";
      setTimeout(() => showScreen("screen-login"), 2000);
    } else {
      showToast(
        res.message || "Kode reset tidak valid atau sudah kadaluarsa.",
        "error",
      );
    }
  } catch (err) {
    showToast("Tidak bisa terhubung ke server.", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Ganti Password";
    }
  }
}

// --- LOGOUT ---
async function apiLogout() {
  try {
    await apiRequest("POST", "/logout");
  } catch (_) {}
  stopPolling();
  _lastRentalCount = undefined;
  clearSession();
  document.getElementById("pemilik-bottom-nav").style.display = "none";
  document.getElementById("mobile-nav-penyewa").style.display = "none";
  showScreen("screen-login");
}

// --- CEK STATUS (dari halaman pending) ---
async function cekStatusAkun() {
  const npm = document.getElementById("pend-npm").textContent;
  if (!npm || npm === "—") return;

  try {
    const res = await apiRequest("GET", `/cek-status?npm=${npm}`);
    if (res.success) {
      const { status, alasan_tolak } = res.data;
      const statusEl = document.querySelector("#screen-pending .status-value");
      if (statusEl) {
        if (status === "aktif") {
          statusEl.innerHTML =
            '<strong style="color:var(--success)">✓ Akun Aktif — Silakan Login</strong>';
        } else if (status === "ditolak") {
          statusEl.innerHTML = `<strong style="color:var(--danger)">✗ Ditolak: ${alasan_tolak || "-"}</strong>`;
        } else {
          statusEl.innerHTML =
            '<strong style="color:var(--warning)">🔄 Masih Diverifikasi</strong>';
        }
      }
    }
  } catch (_) {}
}

// =============================================
// TOAST NOTIFICATION
// =============================================
function showToast(message, type = "info") {
  // Hapus toast lama jika ada
  const old = document.getElementById("bukuku-toast");
  if (old) old.remove();

  const colors = {
    success: {
      bg: "var(--success-bg)",
      border: "var(--success)",
      text: "var(--success)",
    },
    error: {
      bg: "var(--danger-bg)",
      border: "var(--danger)",
      text: "var(--danger)",
    },
    warning: {
      bg: "var(--warning-bg)",
      border: "var(--warning)",
      text: "var(--warning)",
    },
    info: { bg: "var(--info-bg)", border: "var(--info)", text: "var(--info)" },
  };
  const c = colors[type] || colors.info;

  const icons = { success: "✓", error: "✗", warning: "⚠", info: "ℹ" };

  const toast = document.createElement("div");
  toast.id = "bukuku-toast";
  toast.style.cssText = `
    position: fixed;
    top: 70px;
    right: 20px;
    z-index: 9999;
    background: ${c.bg};
    border: 1px solid ${c.border};
    color: ${c.text};
    padding: 12px 18px;
    border-radius: 10px;
    font-size: 13px;
    font-family: 'DM Sans', sans-serif;
    max-width: 340px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    display: flex;
    align-items: flex-start;
    gap: 10px;
    line-height: 1.5;
    animation: slideIn 0.25s ease;
    white-space: pre-line;
  `;
  toast.innerHTML = `<span style="font-size:16px;flex-shrink:0">${icons[type]}</span><span>${message}</span>`;
  document.body.appendChild(toast);

  // Animasi CSS
  if (!document.getElementById("toast-style")) {
    const style = document.createElement("style");
    style.id = "toast-style";
    style.textContent = `
      @keyframes slideIn {
        from { opacity:0; transform:translateX(20px); }
        to   { opacity:1; transform:translateX(0); }
      }
    `;
    document.head.appendChild(style);
  }

  // Hilang otomatis setelah 4 detik
  setTimeout(() => toast?.remove(), 4000);
}


function setMbnActive(id) {
  document
    .querySelectorAll(".mobile-bottom-nav .mbn-item")
    .forEach((el) => el.classList.remove("active"));
  const el = document.getElementById(id);
  if (el) el.classList.add("active");
}


// =============================================
// AUTO: cek session saat halaman dimuat
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  const user = getUser();
  const token = getToken();

  if (user && token) {
    listenChat(user.id);
    const inisial = user.nama
      .split(" ")
      .map((n) => n.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");

    const avatarIds = [
      "avatar-penyewa",
      "avatar-penyewa-chat",
      "avatar-penyewa-chat2",
      "avatar-pemilik",
      "avatar-pemilik-chat",
    ];

    avatarIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (user.foto_url) {
        el.innerHTML = `<img src="${user.foto_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
      } else {
        el.textContent = inisial;
      }
    });

    const isMobile = window.innerWidth <= 768;
    if (user.role === "pemilik") {
      showScreen("screen-pemilik");
      switchPemilikTab("overview");
      if (isMobile) document.getElementById("pemilik-bottom-nav").style.display = "flex";
    } else {
      showScreen("screen-penyewa");
      switchPenyewaTab("browse");
      loadSewaAktif();
      if (isMobile) document.getElementById("mobile-nav-penyewa").style.display = "flex";
    }
  }
});

// Sembunyikan/tampilkan bottom nav saat ukuran jendela berubah
window.addEventListener("resize", () => {
  const isMobile = window.innerWidth <= 768;
  const navPenyewa = document.getElementById("mobile-nav-penyewa");
  const navPemilik = document.getElementById("pemilik-bottom-nav");
  if (navPenyewa && navPenyewa.style.display !== "" ) {
    navPenyewa.style.display = isMobile ? "flex" : "none";
  }
  if (navPemilik && navPemilik.style.display !== "") {
    navPemilik.style.display = isMobile ? "flex" : "none";
  }
});

// Kalau ada sesi aktif, langsung ke dashboard

// =============================================
// CHAT REAL-TIME — Laravel Reverb
// =============================================

let echoInstance = null;
let activeChatUserId = null;

// Inisialisasi Echo (WebSocket)
function initEcho() {
  if (echoInstance) return;
  const reverbHost = (window.BUKUKU_SERVER || "https://web-production-7dfb7.up.railway.app")
    .replace(/^https?:\/\//, "");
  echoInstance = new window.Echo({
    broadcaster: "reverb",
    key: "xlp1nolixazjrxu97lbq",
    wsHost: reverbHost,
    wsPort: 443,
    wssPort: 443,
    forceTLS: true,
    enabledTransports: ["wss"],
    authEndpoint: `${window.BUKUKU_SERVER || "https://web-production-7dfb7.up.railway.app"}/api/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${getToken()}`,
        Accept: "application/json",
      },
    },
  });
}

// =============================================
// CHAT REAL-TIME CORE — handle penyewa & pemilik
// =============================================

let _chatPollingInterval = null;
let _lastMessageIds = {}; // { userId: lastMessageId } untuk polling dedup
let _lastRentalCount = undefined;

// Mulai dengarkan pesan masuk (WebSocket + polling fallback)
function listenChat(myUserId) {
  // --- 1. Coba WebSocket via Laravel Echo ---
  try {
    initEcho();
    echoInstance.private(`chat.${myUserId}`).listen("MessageSent", (data) => {
      _handleIncomingMessage(data);
    });
    console.log("[BukuKu] WebSocket listener aktif untuk user", myUserId);
  } catch (err) {
    console.warn("[BukuKu] Echo gagal, fallback ke polling:", err);
  }

  // --- 2. Polling fallback setiap 3 detik ---
  // Jalan terus meski Echo berhasil, sebagai safety net
  _startPolling(myUserId);
}

function _startPolling(myUserId) {
  if (_chatPollingInterval) clearInterval(_chatPollingInterval);
  _chatPollingInterval = setInterval(async () => {
    // Cek apakah ada chat screen yang sedang aktif
    const isPenyewaActive = document
      .getElementById("screen-chat-penyewa")
      ?.classList.contains("active");
    const isPemilikActive = document
      .getElementById("screen-chat-pemilik")
      ?.classList.contains("active");

    const targetUserId = isPenyewaActive
      ? activeChatUserId
      : isPemilikActive
        ? activePemilikChatUserId
        : null;

    // --- Polling badge permintaan (untuk pemilik) ---
    const user = getUser();
    if (user && user.role === "pemilik") {
      try {
        const rentalRes = await apiRequest(
          "GET",
          "/rentals/incoming?status=pending",
        );
        const count = rentalRes.success ? (rentalRes.data || []).length : 0;

        const badge = document.getElementById("badge-permintaan-pending");
        if (badge) {
          badge.textContent = count;
          badge.style.display = count > 0 ? "inline-flex" : "none";
        }

        if (
          typeof _lastRentalCount !== "undefined" &&
          count > _lastRentalCount
        ) {
          const diff = count - _lastRentalCount;
          showToast(`📗 ${diff} permintaan sewa baru masuk!`, "info");
          const tabPermintaan = document.getElementById("ptab-permintaan");
          if (tabPermintaan && tabPermintaan.style.display !== "none") {
            loadPermintaan();
          }
        }
        _lastRentalCount = count;
      } catch (_) {}
    }

    // Update badge pesan pemilik
    if (user && user.role === "pemilik") {
      try {
        const chatRes = await apiRequest("GET", "/chat/users");
        const chatContacts = (chatRes.data || []).filter(u => u.role !== "admin");
        const totalUnread = chatContacts.reduce((sum, u) => sum + (u.unread_count || 0), 0);
        const badgePesan = document.getElementById("badge-pesan-pemilik");
        if (badgePesan) {
          badgePesan.textContent = totalUnread;
          badgePesan.style.display = totalUnread > 0 ? "inline-flex" : "none";
        }
      } catch (_) {}
    }

    // Update badge pesan penyewa
    if (user && user.role === "penyewa") {
      try {
        const chatRes = await apiRequest("GET", "/chat/users");
        const chatContacts = (chatRes.data || []).filter(u => u.role !== "admin");
        const totalUnread = chatContacts.reduce((sum, u) => sum + (u.unread_count || 0), 0);
        const badgePesan = document.getElementById("badge-pesan-penyewa");
        if (badgePesan) {
          badgePesan.textContent = totalUnread;
          badgePesan.style.display = totalUnread > 0 ? "inline-flex" : "none";
        }
      } catch (_) {}
    }

    if (!targetUserId) return;

    try {
      const res = await apiRequest("GET", `/chat/${targetUserId}`);
      if (!res.success || !res.data.length) return;

      const messages = res.data;
      const lastMsg = messages[messages.length - 1];
      const key = `${targetUserId}`;

      // Hanya append pesan baru yang belum ditampilkan
      if (_lastMessageIds[key] === undefined) {
        // Inisialisasi: catat ID pesan terakhir saat ini saja, jangan re-render
        _lastMessageIds[key] = lastMsg.id ?? messages.length;
        return;
      }

      const lastKnown = _lastMessageIds[key];
      const newMessages = messages.filter(
        (m) => (m.id ?? 0) > lastKnown && !m.is_me,
      );

      newMessages.forEach((m) => {
        if (isPenyewaActive) {
          appendMessage(m.message, m.nama, m.time, false);
        } else if (isPemilikActive) {
          appendPemilikMessage(m.message, m.nama, m.time, false);
        }
      });

      if (newMessages.length > 0) {
        _lastMessageIds[key] = lastMsg.id ?? messages.length;
      }
    } catch (_) {
      // silent fail — polling akan coba lagi 3 detik kemudian
    }
  }, 3000);
}

// Hentikan polling (misal saat logout)
function stopPolling() {
  if (_chatPollingInterval) {
    clearInterval(_chatPollingInterval);
    _chatPollingInterval = null;
  }
}

// Handler pesan masuk (dari WebSocket)
function _handleIncomingMessage(data) {
  const penyewaScreen = document.getElementById("screen-chat-penyewa");
  const pemilikScreen = document.getElementById("screen-chat-pemilik");
  const isPenyewaActive = penyewaScreen?.classList.contains("active");
  const isPemilikActive = pemilikScreen?.classList.contains("active");

  if (
    isPenyewaActive &&
    activeChatUserId &&
    data.sender_id == activeChatUserId
  ) {
    appendMessage(data.message, data.nama, data.time, false);
    // Sinkronkan state polling agar tidak duplikat
    const key = `${activeChatUserId}`;
    if (data.id) _lastMessageIds[key] = data.id;
  } else if (
    isPemilikActive &&
    activePemilikChatUserId &&
    data.sender_id == activePemilikChatUserId
  ) {
    appendPemilikMessage(data.message, data.nama, data.time, false);
    const key = `${activePemilikChatUserId}`;
    if (data.id) _lastMessageIds[key] = data.id;
  } else {
    showToast(`💬 Pesan baru dari ${data.nama}`, "info");
    // Update preview kontak
    const penyewaContact = document.getElementById(`contact-${data.sender_id}`);
    const pemilikContact = document.getElementById(
      `pemilik-contact-${data.sender_id}`,
    );
    if (penyewaContact) {
      const previewEl = penyewaContact.querySelector(".preview");
      if (previewEl) previewEl.textContent = data.message;

      const container = document.getElementById("chat-contacts-penyewa");
      if (container) container.prepend(penyewaContact);
    }
    if (pemilikContact) {
      const previewEl = pemilikContact.querySelector(".preview");
      if (previewEl) previewEl.textContent = data.message;

      const container = document.getElementById("chat-contacts-pemilik");
      if (container) container.prepend(pemilikContact);
    }
  }
}

// Buka chat dengan user tertentu (penyewa)
async function openChat(userId, nama, fotoUrl) {
  closeModalDetail();
  activeChatUserId = userId;
  const contactEl = document.getElementById(`contact-${userId}`);
  if (contactEl) {
    const unreadEl = contactEl.querySelector(".unread");
    if (unreadEl) unreadEl.remove();
  }

  document.getElementById("chat-header-penyewa").style.display = "flex";
  document.getElementById("chat-input-area-penyewa").style.display = "flex";
  openChatWindow("penyewa");

  // Reset state polling untuk kontak ini
  delete _lastMessageIds[`${userId}`];

  // Update header
  const headerNama = document.getElementById("chat-header-nama");
  const headerRole = document.getElementById("chat-header-role");
  const headerAvatar = document.getElementById("chat-header-avatar");
  if (headerNama) headerNama.textContent = nama;
  if (headerRole) headerRole.textContent = "Pemilik Buku";
  if (headerAvatar) {
    if (user && user.foto_url) {
      headerAvatar.innerHTML = `<img src="${user.foto_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
      headerAvatar.style.padding = "0";
      headerAvatar.style.overflow = "hidden";
    } else {
      headerAvatar.textContent = nama.charAt(0).toUpperCase();
    }
  }

  // Highlight kontak aktif
  document
    .querySelectorAll("#chat-contacts-penyewa .chat-item")
    .forEach((el) => el.classList.remove("active"));
  const activeContact = document.getElementById(`contact-${userId}`);
  if (activeContact) activeContact.classList.add("active");

  // Tampilkan screen chat
  showScreen("screen-chat-penyewa");

  // Ambil riwayat chat
  const msgs = document.getElementById("chat-messages-penyewa");
  if (msgs)
    msgs.innerHTML =
      '<div style="padding:40px;text-align:center;color:#999;font-size:13px;">Memuat pesan...</div>';

  const res = await apiRequest("GET", `/chat/${userId}`);
  if (res.success && msgs) {
    msgs.innerHTML = "";
    if (res.data.length === 0) {
      msgs.innerHTML =
        '<div style="padding:40px;text-align:center;color:#999;font-size:13px;">Belum ada pesan. 👋</div>';
    } else {
      res.data.forEach((m) =>
        appendMessage(m.message, m.nama, m.time, m.is_me),
      );
      msgs.scrollTop = msgs.scrollHeight;
    }
  }
}

// Kirim pesan
async function sendChatMsg(inputId) {
  const id = inputId || "chat-input-field";
  const input = document.getElementById(id);
  if (!input || !input.value.trim()) return;
  if (!activeChatUserId) {
    showToast("Pilih kontak dulu.", "error");
    return;
  }

  const text = input.value.trim();
  input.value = "";

  // Tampilkan dulu, kirim belakangan
  const time = new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  appendMessage(text, "Kamu", time, true);

  const res = await apiRequest("POST", "/chat/send", {
    receiver_id: activeChatUserId,
    message: text,
  });

  if (!res.success) {
    showToast("Gagal kirim pesan.", "error");
    input.value = text;
  }
}

// Tambah bubble pesan ke layar (penyewa)
function appendMessage(text, nama, time, isMe) {
  // Gunakan ID spesifik agar tidak tabrakan dengan chat pemilik
  const msgs =
    document.getElementById("chat-messages-penyewa") ||
    document.querySelector("#screen-chat-penyewa .chat-messages");
  if (!msgs) return;
  const div = document.createElement("div");
  div.className = `msg ${isMe ? "me" : "them"}`;
  div.innerHTML = `
    <div class="msg-bubble">${text}</div>
    <div class="msg-time">${time}</div>
  `;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

// Ambil daftar user untuk chat (penyewa)
async function loadChatUsers() {
  const container = document.getElementById("chat-contacts-penyewa");
  if (!container) return;

  container.innerHTML =
    '<div style="padding:20px;text-align:center;color:#999;font-size:13px;">Memuat kontak...</div>';

  const res = await apiRequest("GET", "/chat/users");
  if (!res.success) {
    container.innerHTML =
      '<div style="padding:20px;text-align:center;color:#999;font-size:13px;">Gagal memuat kontak.</div>';
    return;
  }

  const contacts = (res.data || []).filter((u) => u.role !== "admin");

  if (contacts.length === 0) {
    container.innerHTML =
      '<div style="padding:20px;text-align:center;color:#999;font-size:13px;">Belum ada percakapan.<br>Mulai chat dari halaman detail buku.</div>';
    return;
  }

  // Update badge pesan di sidebar
  const totalUnread = contacts.reduce(
    (sum, u) => sum + (u.unread_count || 0),
    0,
  );
  const badgePesan = document.getElementById("badge-pesan-penyewa");
  if (badgePesan) {
    badgePesan.textContent = totalUnread;
    badgePesan.style.display = totalUnread > 0 ? "inline-flex" : "none";
  }

  container.innerHTML = "";
  contacts.forEach((user) => {
    const div = document.createElement("div");
    div.className = "chat-item";
    div.id = `contact-${user.id}`;
    div.style.cursor = "pointer";
    div.onclick = () => openChat(user.id, user.nama, user.foto_url);
    div.innerHTML = `
      <div class="avatar" style="overflow:hidden;padding:0;">
        ${
          user.foto_url
            ? `<img src="${user.foto_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
            : user.nama.charAt(0).toUpperCase()
        }
      </div>
        ${
          user.foto_url
            ? `<img src="${user.foto_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
            : user.nama.charAt(0).toUpperCase()
        }
      </div>
      <div class="chat-item-info">
        <div class="name">${user.nama}</div>
        <div class="preview">${user.last_message || (user.role === "pemilik" ? "Pemilik Buku" : "Penyewa")}</div>
      </div>
      <div class="chat-item-meta">
        ${user.last_time ? `<div class="time">${user.last_time}</div>` : ""}
        ${user.unread_count > 0 ? `<div class="unread">${user.unread_count}</div>` : ""}
      </div>
    `;
    container.appendChild(div);
  });
}
// =============================================
// BUKU FUNCTIONS
// =============================================

// Data buku yang sedang dilihat di detail
let currentBook = null;

function renderBintang(rating) {
  const bulat = Math.round(rating);
  let bintang = "";
  for (let i = 1; i <= 5; i++) {
    bintang += i <= bulat ? "★" : "☆";
  }
  return `<span style="color:var(--amber)">${bintang}</span>`;
}

// Load buku dari database untuk browse
async function loadBooks() {
  const grid = document.getElementById("browse-book-grid");
  if (!grid) return;

  const browseGenres =
    typeof getBrowseGenreFilter === "function" ? getBrowseGenreFilter() : [];
  const search = document.getElementById("browse-search")?.value || "";
  const genre = document.getElementById("browse-genre")?.value || "";
  const harga = document.getElementById("browse-harga")?.value || "";
  const activeChip =
    document.querySelector(".filter-chip.active")?.textContent?.trim() || "";

  grid.innerHTML =
    '<div style="grid-column:1/-1;padding:40px;text-align:center;color:#999;font-size:13px;">Memuat buku...</div>';

  let url = "/books?";
  if (search) url += `search=${encodeURIComponent(search)}&`;
  if (genre) url += `genre=${encodeURIComponent(genre)}&`;
  if (harga) url += `harga=${encodeURIComponent(harga)}&`;
  if (activeChip && activeChip !== "Semua")
    url += `filter=${encodeURIComponent(activeChip)}&`;
  if (browseGenres.length > 0)
    url += `genres=${encodeURIComponent(browseGenres.join(","))}&`;

  try {
    const res = await apiRequest("GET", url);
    if (!res.success || res.data.length === 0) {
      grid.innerHTML =
        '<div style="grid-column:1/-1;padding:40px;text-align:center;color:#999;font-size:13px;">Tidak ada buku yang tersedia saat ini.</div>';
      return;
    }

    const colors = [
      "#fff8ed",
      "#edf5ff",
      "#fff0f0",
      "#f0fff0",
      "#fff5e0",
      "#f5f0ff",
      "#edfcf5",
      "#fdf0ff",
    ];
    const emojis = ["📗", "📘", "📕", "📙", "📒", "📔"];

    grid.innerHTML = "";
    res.data.forEach((book, i) => {
      const div = document.createElement("div");
      div.className = "book-card";
      div.style.cursor = "pointer";
      div.onclick = () => showBookDetailFromApi(book);
      div.innerHTML = `
        <div class="book-cover" style="background:${colors[i % colors.length]};${book.foto_url ? "padding:0;overflow:hidden;" : ""}">
          ${
            book.foto_url
              ? `<img src="${book.foto_url}" style="width:100%;height:100%;object-fit:cover;" alt="${book.judul}" />`
              : emojis[i % emojis.length]
          }
          
          ${
            book.status === "tersedia"
              ? '<span class="status-badge status-available">Tersedia</span>'
              : '<span class="status-badge status-borrowed">Sedang Disewa</span>'
          }

        </div>
        <div class="book-info">
          <h4>${book.judul}</h4>
          <div class="genre">${book.genre} • ${book.pemilik?.nama || "-"}</div>
          <div class="stars">${renderBintang(book.rating || 0)} <span style="font-size:11px;color:var(--text-light)">${book.rating ? Number(book.rating).toFixed(1) : "—"}</span></div>
          <div class="price">Rp ${Number(book.harga_per_minggu).toLocaleString("id-ID")} <span>/ minggu</span></div>
        </div>
      `;
      grid.appendChild(div);
    });
  } catch (err) {
    grid.innerHTML =
      '<div style="grid-column:1/-1;padding:40px;text-align:center;color:#999;font-size:13px;">Gagal memuat buku.</div>';
  }
}

// Tampilkan detail buku dari API
function showBookDetailFromApi(book) {
  currentBook = book;

  // Update isi halaman detail
  const detail = document.getElementById("modal-bookdetail");
  if (detail) {
    const judul = detail.querySelector("h1");
    const penulis = detail.querySelector("#book-penulis-detail");
    const genre = detail.querySelector("#book-genre-detail");
    const pemilik = detail.querySelector("#book-pemilik-detail");
    const harga = detail.querySelector(".value");
    const deskripsi = detail.querySelector("#book-deskripsi-detail");
    const jurusanEl = detail.querySelector("#book-jurusan-detail");
    const cover = detail.querySelector(".book-cover-large");

    if (judul) judul.textContent = book.judul;
    if (penulis)
      penulis.innerHTML = `<i class="ti ti-user" style="font-size:15px"></i> Penulis: ${book.penulis}`;
    if (genre)
      genre.innerHTML = `<i class="ti ti-tag" style="font-size:15px"></i> Genre: ${book.genre}`;
    if (pemilik)
      pemilik.innerHTML = `<i class="ti ti-user-circle" style="font-size:15px"></i> Pemilik: <strong>${book.pemilik?.nama || "-"}</strong>`;
    if (deskripsi)
      deskripsi.textContent = book.deskripsi || "Tidak ada deskripsi.";
    if (jurusanEl)
      jurusanEl.innerHTML = `<i class="ti ti-school" style="font-size:15px"></i> Jurusan: <strong>${book.jurusan || "-"}</strong>`;

    const statusBadge = detail.querySelector("#book-status-badge");
    const hargaEl = detail.querySelector("#book-harga-detail");
    const avgEl = detail.querySelector("#book-avg-rating");
    const totalEl = detail.querySelector("#book-total-ulasan");

    if (statusBadge) {
      if (book.status === "tersedia") {
        statusBadge.textContent = "Tersedia";
        statusBadge.className = "badge badge-success";
      } else {
        statusBadge.textContent = "Sedang Disewa";
        statusBadge.className = "badge badge-danger";
      }
    }

    if (hargaEl)
      hargaEl.textContent = `Rp ${Number(book.harga_per_minggu).toLocaleString("id-ID")}`;
    if (avgEl) avgEl.textContent = "—";
    if (totalEl) totalEl.textContent = "(0 ulasan)";

    if (cover) {
      cover.innerHTML = book.foto_url
        ? `<img src="${book.foto_url}" onclick="openLightbox('${book.foto_url}')" style="width:100%;height:100%;object-fit:cover;border-radius:12px;" alt="${book.judul}" />`
        : "📗";
    }

    // Update foto 2 dan 3
    const foto2El = detail.querySelector("#book-foto-2");
    const foto3El = detail.querySelector("#book-foto-3");
    if (foto2El) {
      foto2El.innerHTML = book.foto_url_2
        ? `<img src="${book.foto_url_2}" onclick="openLightbox('${book.foto_url_2}')" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" alt="Foto 2" />`
        : "📷";
    }
    if (foto3El) {
      foto3El.innerHTML = book.foto_url_3
        ? `<img src="${book.foto_url_3}" onclick="openLightbox('${book.foto_url_3}')" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" alt="Foto 3" />`
        : "📷";
    }
  }

  // TAMBAHKAN
  loadUlasan(book.id);

  // Tampilkan form ulasan hanya untuk penyewa
  const user = getUser();
  const formUlasan = document.getElementById("form-ulasan");
  if (formUlasan && user && user.role === "penyewa") {
    if (book.can_review && !book.has_reviewed) {
      formUlasan.style.display = "block";
    } else if (book.has_reviewed) {
      formUlasan.style.display = "none";
    } else {
      formUlasan.style.display = "none";
    }
  }

  // Ubah tombol sewa sesuai status buku
  console.log("is_wishlisted:", book.is_wishlisted);
  const btnSewa = document.getElementById("btn-ajukan-sewa");
  const btnWishlist = document.getElementById("btn-wishlist");

  if (book.status !== "tersedia") {
    // Sembunyikan tombol wishlist kanan
    if (btnWishlist) btnWishlist.style.display = "none";

    // Tombol tengah jadi "Tambah ke Wishlist"
    if (btnSewa) {
      const sudahWishlist = book.is_wishlisted;
      btnSewa.innerHTML = sudahWishlist
        ? `<i class="ti ti-heart-filled" style="font-size:16px;vertical-align:-2px"></i> Di Wishlist`
        : `<i class="ti ti-heart" style="font-size:16px;vertical-align:-2px"></i> Tambah ke Wishlist`;
      if (sudahWishlist) {
        btnSewa.classList.add("wishlisted");
        btnSewa.style.background = "var(--amber-light)";
        btnSewa.style.color = "var(--warm-brown)";
        btnSewa.style.border = "0.5px solid var(--amber)";
      } else {
        btnSewa.classList.remove("wishlisted");
        btnSewa.style.background = "transparent";
        btnSewa.style.color = "var(--warm-brown)";
        btnSewa.style.border = "0.5px solid var(--warm-brown)";
      }
      btnSewa.onclick = () => toggleWishlistSewa(book.id);
    }
  } else {
    // Tampilkan tombol wishlist kanan
    if (btnWishlist) {
      btnWishlist.style.display = "";
      if (book.is_wishlisted) {
        btnWishlist.classList.add("wishlisted");
        btnWishlist.innerHTML = `<i class="ti ti-heart-filled" style="font-size:16px;vertical-align:-2px"></i> Wishlisted`;
        btnWishlist.style.background = "var(--amber-light)";
        btnWishlist.style.color = "var(--warm-brown)";
      } else {
        btnWishlist.classList.remove("wishlisted");
        btnWishlist.innerHTML = `<i class="ti ti-heart" style="font-size:16px;vertical-align:-2px"></i> Wishlist`;
        btnWishlist.style.background = "transparent";
        btnWishlist.style.color = "var(--warm-brown)";
      }
    }

    // Tombol tengah kembali jadi "Ajukan Sewa"
    if (btnSewa) {
      btnSewa.innerHTML = `<i class="ti ti-calendar-check" style="font-size:16px;vertical-align:-2px"></i> Ajukan Sewa`;
      btnSewa.classList.remove("wishlisted");
      btnSewa.onclick = () => openModalSewa();
    }
  }

  const modal = document.getElementById("modal-bookdetail");
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeModalDetail() {
  const modal = document.getElementById("modal-bookdetail");
  if (modal) modal.style.display = "none";
  document.body.style.overflow = "";
}

function handleModalOverlayClick(e) {
  if (e.target === document.getElementById("modal-bookdetail")) {
    closeModalDetail();
  }
}

// Load ulasan dari API
async function loadUlasan(bookId) {
  const list = document.getElementById("ulasan-list");
  if (!list) return;

  const res = await apiRequest("GET", `/books/${bookId}/reviews`);
  if (!res.success || res.data.length === 0) {
    list.innerHTML =
      '<div style="text-align:center;color:#999;font-size:13px;padding:1rem">Belum ada ulasan.</div>';
    return;
  }

  // Update rata-rata rating di header detail
  const avgEl = document.getElementById("book-avg-rating");
  const totalEl = document.getElementById("book-total-ulasan");
  if (avgEl) avgEl.textContent = res.avg;
  if (totalEl) totalEl.textContent = `(${res.total} ulasan)`;

  list.innerHTML = res.data
    .map(
      (r) => `
    <div class="card" style="margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <div class="avatar" style="width:28px;height:28px;font-size:11px">${r.inisial}</div>
        <strong style="font-size:13px">${r.nama}</strong>
        <span style="color:var(--amber);font-size:12px">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</span>
        <span style="font-size:11px;color:var(--text-light);margin-left:auto">${r.time_ago}</span>
      </div>
      <p style="font-size:13px;color:var(--text-mid)">${r.komentar || ""}</p>
    </div>
  `,
    )
    .join("");
}

// Set rating bintang
let selectedRating = 0;
function setRating(val) {
  selectedRating = val;
  const stars = document.querySelectorAll("#star-input span");
  stars.forEach((s, i) => (s.textContent = i < val ? "★" : "☆"));
}

// Kirim ulasan
async function submitUlasan() {
  if (!selectedRating) {
    showToast("Pilih bintang dulu.", "warning");
    return;
  }
  const komentar = document.getElementById("input-komentar").value.trim();
  const res = await apiRequest("POST", `/books/${currentBook.id}/reviews`, {
    rating: selectedRating,
    komentar,
  });
  if (res.success) {
    showToast("Ulasan berhasil dikirim!", "success");
    document.getElementById("form-ulasan").style.display = "none";
    document.getElementById("input-komentar").value = "";
    selectedRating = 0;
    loadUlasan(currentBook.id);
  } else {
    showToast(res.message || "Gagal mengirim ulasan.", "error");
  }
}

async function loadRiwayat() {
  const tbody = document.getElementById("riwayat-tbody");
  if (!tbody) return;

  tbody.innerHTML =
    '<tr><td colspan="6" style="text-align:center;color:#999;padding:20px">Memuat...</td></tr>';

  const res = await apiRequest("GET", "/rentals/completed");
  if (!res.success || res.data.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center;color:#999;padding:20px">Belum ada riwayat sewa.</td></tr>';
    return;
  }

  tbody.innerHTML = "";
  res.data.forEach((r) => {
    const sudahDinilai = r.has_review;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>📗 ${r.book?.judul || "-"}</td>
      <td>${r.book?.pemilik?.nama?.split(" ")[0] || "-"} ${r.book?.pemilik?.nama?.split(" ")[1]?.charAt(0) || ""}.</td>
      <td>${r.durasi} minggu</td>
      <td>Rp ${Number(r.total_harga).toLocaleString("id-ID")}</td>
      <td><span class="badge badge-success">Selesai</span></td>
      <td>
        ${
          sudahDinilai
            ? `<button style="font-size:11px;padding:3px 10px;border-radius:6px;background:var(--surface2);border:0.5px solid var(--border);color:var(--text-mid);cursor:default">Sudah Dinilai</button>`
            : `<button onclick="bukaUlasanDariRiwayat(${r.book_id})" style="font-size:11px;padding:3px 10px;border-radius:6px;background:var(--amber-light);border:0.5px solid var(--amber);color:var(--warm-brown);cursor:pointer">⭐ Ulasan</button>`
        }
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadSewaAktif() {
  const container = document.getElementById("sewa-aktif-list");
  if (!container) return;

  container.innerHTML =
    '<div style="padding:40px;text-align:center;color:#999;font-size:13px;">Memuat...</div>';

  function updateBadgeSewa(count) {
    const badge = document.getElementById("badge-sewa-aktif");
    if (!badge) return;
    badge.textContent = count;
    badge.style.display = count > 0 ? "inline-flex" : "none";
  }

  try {
    const res = await apiRequest("GET", "/rentals/active");

    if (!res.success || res.data.length === 0) {
      container.innerHTML =
        '<div style="padding:40px;text-align:center;color:#999;font-size:13px;">Tidak ada sewa aktif saat ini.</div>';
      updateBadgeSewa(0);
      return;
    }

    container.innerHTML = "";
    updateBadgeSewa(res.data.length);

    res.data.forEach((r) => {
      const totalHari = (r.durasi_minggu || 1) * 7;
      const sisaHari = r.sisa_hari ?? null;
      const sisaValid = sisaHari !== null;
      const persen = sisaValid
        ? Math.min(100, Math.round(((totalHari - sisaHari) / totalHari) * 100))
        : 0;
      const isUrgent = sisaValid && sisaHari <= 3;
      const isTerlambat = r.status === "terlambat";

      // Hitung tanggal jatuh tempo
      let tglKembali = "—";
      if (r.tanggal_kembali) {
        const d = new Date(r.tanggal_kembali);
        tglKembali = d.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
      } else if (r.created_at) {
        const d = new Date(r.created_at);
        d.setDate(d.getDate() + totalHari);
        tglKembali = d.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
      }

      const barColor = isUrgent ? "#e04545" : "var(--amber)";
      const label = isTerlambat
        ? `<div style="font-size:11px;color:var(--danger);margin-top:4px">⚠ Masa sewa sudah berakhir, segera kembalikan buku</div>`
        : !sisaValid
          ? `<div style="font-size:11px;color:var(--text-light);margin-top:4px">Data sisa hari belum tersedia</div>`
          : isUrgent
            ? `<div style="font-size:11px;color:var(--danger);margin-top:4px">⚠ Segera kembalikan buku</div>`
            : `<div style="font-size:11px;color:var(--text-light);margin-top:4px">${persen}% waktu sewa berlalu</div>`;

      const statusBadge = isTerlambat
        ? '<span class="badge badge-danger">Terlambat</span>'
        : isUrgent
          ? '<span class="badge badge-warning">Segera Berakhir</span>'
          : '<span class="badge badge-success">Aktif</span>';

      const card = document.createElement("div");
      card.className = "card";
      card.style.marginBottom = "0.75rem";
      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:1rem">
          <div style="font-size:36px">
            ${
              r.book?.foto_url
                ? `<img src="${r.book.foto_url}" style="width:44px;height:56px;object-fit:cover;border-radius:6px;">`
                : "📗"
            }
          </div>
          <div style="flex:1">
            <strong style="font-size:15px">${r.book?.judul || "—"}</strong>
            <div style="font-size:12px;color:var(--text-light);margin-top:2px">
              Pemilik: ${r.book?.pemilik?.nama || "—"} · ${r.book?.genre || "—"}
            </div>
            <div style="font-size:12px;margin-top:6px;color:var(--text-mid)">
              Durasi: ${r.durasi_minggu} minggu · Sisa: ${sisaValid ? sisaHari + " hari" : "—"}
            </div>
            <div style="font-size:12px;margin-top:2px;color:var(--text-mid)">
              Jatuh tempo: ${tglKembali}
            </div>
          </div>
          <div style="text-align:right">
            ${statusBadge}
            <div style="margin-top:8px;font-size:13px;color:var(--text-mid)">
              Total Rp ${Number(r.total_harga).toLocaleString("id-ID")}
            </div>
            <button
              onclick="openChat(${r.book?.pemilik?.id}, '${(r.book?.pemilik?.nama || "").replace(/'/g, "\\'")}'); openChatPenyewa();"
              style="margin-top:8px;font-size:12px;background:var(--amber-light);border:0.5px solid var(--amber);color:var(--warm-brown);padding:4px 12px;border-radius:6px;cursor:pointer;display:block;width:100%;">
              💬 Chat Pemilik
            </button>
            <button
              onclick="ajukanPengembalian(${r.id}, this)"
              style="margin-top:6px;font-size:12px;background:var(--success-bg);border:0.5px solid var(--success);color:var(--success);padding:4px 12px;border-radius:6px;cursor:pointer;display:block;width:100%;">
              📦 Ajukan Pengembalian
            </button>
          </div>
        </div>
        <div style="margin-top:12px;background:var(--surface2);border-radius:8px;height:6px;overflow:hidden;">
          <div style="width:${persen}%;height:100%;background:${barColor}"></div>
        </div>
        ${label}
      `;
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML =
      '<div style="padding:40px;text-align:center;color:#999;font-size:13px;">Gagal memuat data.</div>';
    updateBadgeSewa(0);
  }
}

async function ajukanPengembalian(rentalId, btn) {
  if (!confirm("Ajukan pengembalian buku ini ke pemilik?")) return;
  btn.disabled = true;
  btn.textContent = "Mengajukan...";
  try {
    const res = await apiRequest("POST", `/rentals/${rentalId}/request-return`);
    if (res.success) {
      showToast(
        "Permintaan pengembalian berhasil dikirim! Tunggu konfirmasi pemilik. ✓",
        "success",
      );
      btn.textContent = "✓ Diajukan";
    } else {
      showToast(res.message || "Gagal mengajukan pengembalian.", "error");
      btn.disabled = false;
      btn.textContent = "📦 Ajukan Pengembalian";
    }
  } catch (err) {
    showToast("Tidak bisa terhubung ke server.", "error");
    btn.disabled = false;
    btn.textContent = "📦 Ajukan Pengembalian";
  }
}

async function bukaUlasanDariRiwayat(bookId) {
  const res = await apiRequest("GET", `/books/${bookId}`);
  if (res.success) {
    showBookDetailFromApi(res.data);
    setTimeout(() => {
      const form = document.getElementById("form-ulasan");
      if (form) {
        form.style.display = "block"; // pastikan form tampil
        form.scrollIntoView({ behavior: "smooth" });
      }
    }, 300);
  } else {
    showToast("Gagal membuka detail buku.", "error");
  }
}

// Tombol "Chat & Ajukan Sewa" di detail buku
function chatDariDetailBuku() {
  if (!currentBook || !currentBook.pemilik) {
    showToast("Data pemilik buku tidak ditemukan.", "error");
    return;
  }

  const pemilik = currentBook.pemilik;
  const myUser = getUser();

  // Cegah chat dengan diri sendiri
  if (myUser && myUser.id === pemilik.id) {
    showToast("Ini adalah buku milik kamu sendiri.", "warning");
    return;
  }

  // Buka chat dengan pemilik buku
  openChatPenyewa();
  setTimeout(() => {
    openChat(pemilik.id, pemilik.nama, "pemilik");
  }, 300);
}

// Tambah buku baru (pemilik)
async function apiTambahBuku() {
  const judul = document.getElementById("book-judul")?.value.trim();
  const penulis = document.getElementById("book-penulis")?.value.trim();
  const penerbit = document.getElementById("book-penerbit")?.value.trim();
  const genre = document.getElementById("book-genre")?.value;
  const jurusan = document.getElementById("book-jurusan")?.value.trim();
  const harga = document.getElementById("book-harga")?.value;
  const kondisi = document.getElementById("book-kondisi")?.value;
  const deskripsi = document.getElementById("book-deskripsi")?.value.trim();
  const foto = document.getElementById("book-photo-file")?.files[0];

  if (!judul || !penulis || !genre || !harga || !kondisi) {
    showToast("Lengkapi semua field yang wajib diisi (*)", "error");
    return;
  }
  if (!deskripsi) {
    showToast("Deskripsi kondisi buku wajib diisi.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("judul", judul);
  formData.append("penulis", penulis);
  formData.append("penerbit", penerbit || "");
  formData.append("genre", genre);
  formData.append("jurusan", jurusan || "");
  formData.append("harga_per_minggu", harga);
  formData.append("kondisi", kondisi);
  formData.append("deskripsi", deskripsi);
  if (foto) formData.append("foto", foto);
  const foto2 = document.getElementById("book-photo-file-2")?.files[0];
  const foto3 = document.getElementById("book-photo-file-3")?.files[0];
  if (foto2) formData.append("foto2", foto2);
  if (foto3) formData.append("foto3", foto3);

  const btn = document.getElementById("btn-tambah-buku");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Mengirim...";
  }

  try {
    const res = await apiRequest("POST", "/books", formData, true);
    if (res.success) {
      showToast("Buku berhasil dikirim! Menunggu verifikasi admin.", "success");
      closeAddBook();
      // Reset form
      [
        "book-judul",
        "book-penulis",
        "book-penerbit",
        "book-jurusan",
        "book-harga",
        "book-deskripsi",
      ].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
      document.getElementById("book-genre").value = "";
      document.getElementById("book-kondisi").value = "baik";
      removeBookPhoto();
      removeBookPhoto2();
      removeBookPhoto3();
      // Refresh daftar buku pemilik
      loadMyBooks();
    } else {
      if (res.errors) {
        showToast(Object.values(res.errors).flat().join("\n"), "error");
      } else {
        showToast(res.message || "Gagal menambahkan buku.", "error");
      }
    }
  } catch (err) {
    showToast("Tidak bisa terhubung ke server.", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Kirim untuk Verifikasi";
    }
  }
}

// Load buku milik pemilik yang login
async function loadMyBooks() {
  const tbody = document.querySelector("#ptab-bukuku table tbody");
  if (!tbody) return;

  tbody.innerHTML =
    '<tr><td colspan="6" style="text-align:center;color:#999;padding:20px;">Memuat...</td></tr>';

  try {
    const res = await apiRequest("GET", "/my-books");
    if (!res.success || res.data.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align:center;color:#999;padding:20px;">Belum ada buku.</td></tr>';
      return;
    }

    const statusBadge = {
      pending: '<span class="badge badge-warning">Pending Admin</span>',
      tersedia: '<span class="badge badge-success">Tersedia</span>',
      dipinjam: '<span class="badge badge-danger">Dipinjam</span>',
      ditolak: '<span class="badge badge-danger">Ditolak Admin</span>',
    };

    tbody.innerHTML = "";
    res.data.forEach((book) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td style="vertical-align:middle;">
          <div style="display:flex;align-items:center;gap:8px;">
            ${
              book.foto_url
                ? `<img src="${book.foto_url}" style="width:32px;height:42px;object-fit:cover;border-radius:4px;flex-shrink:0;" alt="${book.judul}">`
                : `<span style="font-size:18px">📗</span>`
            }
            <span>${book.judul}</span>
          </div>
        </td>
        <td style="vertical-align:middle;">${book.genre}</td>
        <td style="vertical-align:middle;">Rp ${Number(book.harga_per_minggu).toLocaleString("id-ID")}/mg</td>
        <td style="vertical-align:middle;">${statusBadge[book.status] || book.status}</td>
        <td style="vertical-align:middle;">
          ${
            book.rating
              ? `<span style="color:var(--amber)">★</span> ${Number(book.rating).toFixed(1)}`
              : `<span style="color:#ccc;font-size:12px">--</span>`
          }
        </td>
        <td style="vertical-align:middle;">
          <div style="display:flex;gap:6px;align-items:center;justify-content:center;">
            ${
              book.status === "tersedia"
                ? `<button onclick="editBuku(${book.id})" style="font-size:11px;padding:3px 10px;border-radius:6px;background:var(--info-bg);border:0.5px solid var(--info);color:var(--info);cursor:pointer;">
                    Edit
                  </button>`
                : `<button disabled title="${book.status === "pending" ? "Menunggu verifikasi admin" : book.status === "dipinjam" ? "Sedang dipinjam, tidak bisa diedit" : "Buku ditolak, tidak bisa diedit"}"
                    style="font-size:11px;padding:3px 10px;border-radius:6px;background:var(--surface2);border:0.5px solid var(--border);color:var(--text-light);cursor:not-allowed;">
                    Edit
                  </button>`
            }
            <button onclick="hapusBuku(${book.id})" style="font-size:11px;padding:3px 10px;border-radius:6px;background:var(--danger-bg);border:0.5px solid var(--danger);color:var(--danger);cursor:pointer;">
              Hapus
            </button>
          </div>
        </td>
      `;

      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center;color:#999;">Gagal memuat.</td></tr>';
  }
}

async function editBuku(bookId) {
  try {
    const res = await apiRequest("GET", `/books/${bookId}`);
    if (!res.success) {
      showToast("Gagal memuat data buku.", "error");
      return;
    }
    const book = res.data;

    // Isi form Tambah Buku dengan data yang ada
    document.getElementById("book-judul").value = book.judul || "";
    document.getElementById("book-penulis").value = book.penulis || "";
    document.getElementById("book-penerbit").value = book.penerbit || "";
    document.getElementById("book-genre").value = book.genre || "";
    document.getElementById("book-jurusan").value = book.jurusan || "";
    document.getElementById("book-harga").value = book.harga_per_minggu || "";
    document.getElementById("book-kondisi").value = book.kondisi || "baik";
    document.getElementById("book-deskripsi").value = book.deskripsi || "";

    // Reset foto
    removeBookPhoto();
    removeBookPhoto2();
    removeBookPhoto3();

    // Ganti judul dan tombol jadi mode Edit
    document.querySelector("#modal-addbuku .modal-header h3").textContent =
      "✏️ Edit Buku";
    const btn = document.getElementById("btn-tambah-buku");
    btn.textContent = "Simpan Perubahan";
    btn.onclick = () => apiEditBuku(bookId);

    // Buka modal yang sama
    openAddBook();
  } catch (err) {
    showToast("Tidak bisa terhubung ke server.", "error");
  }
}

async function apiEditBuku(bookId) {
  const judul = document.getElementById("book-judul").value.trim();
  const penulis = document.getElementById("book-penulis").value.trim();
  const penerbit = document.getElementById("book-penerbit").value.trim();
  const genre = document.getElementById("book-genre").value;
  const jurusan = document.getElementById("book-jurusan").value.trim();
  const harga = document.getElementById("book-harga").value;
  const kondisi = document.getElementById("book-kondisi").value;
  const deskripsi = document.getElementById("book-deskripsi").value.trim();
  const foto = document.getElementById("book-photo-file").files[0];

  if (!judul || !penulis || !genre || !harga || !kondisi || !deskripsi) {
    showToast("Lengkapi semua field yang wajib diisi (*)", "error");
    return;
  }

  const formData = new FormData();
  formData.append("_method", "PUT");
  formData.append("judul", judul);
  formData.append("penulis", penulis);
  formData.append("penerbit", penerbit || "");
  formData.append("genre", genre);
  formData.append("jurusan", jurusan || "");
  formData.append("harga_per_minggu", harga);
  formData.append("kondisi", kondisi);
  formData.append("deskripsi", deskripsi);
  formData.append("status", "pending");
  if (foto) formData.append("foto", foto);

  const btn = document.getElementById("btn-tambah-buku");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Menyimpan...";
  }

  try {
    const res = await apiRequest("POST", `/books/${bookId}`, formData, true);
    if (res.success) {
      showToast(
        "Buku berhasil diperbarui! Menunggu verifikasi ulang dari admin.",
        "success",
      );
      _resetModalTambahBuku(); // kembalikan modal ke mode Tambah
      closeAddBook();
      loadMyBooks();
    } else {
      showToast(
        res.errors
          ? Object.values(res.errors).flat().join("\n")
          : res.message || "Gagal.",
        "error",
      );
    }
  } catch (err) {
    showToast("Tidak bisa terhubung ke server.", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Simpan Perubahan";
    }
  }
}

// Reset modal kembali ke mode Tambah Buku
function _resetModalTambahBuku() {
  document.querySelector("#modal-addbuku .modal-header h3").textContent =
    "📚 Tambah Buku Baru";
  const btn = document.getElementById("btn-tambah-buku");
  btn.textContent = "Kirim untuk Verifikasi";
  btn.onclick = () => apiTambahBuku();
}

function closeAddBook() {
  document.getElementById("modal-addbuku").style.display = "none";
  _resetModalTambahBuku(); // ← tambahkan ini
}

async function loadOverview() {
  const user = getUser();
  const greetEl = document.getElementById("overview-greeting");
  if (greetEl && user) greetEl.textContent = `Selamat datang, ${user.nama} 👋`;
  _updateBadgePermintaan();

  try {
    const res = await apiRequest("GET", "/my-books");
    const books = res.success ? res.data : [];
    const elTotal = document.getElementById("stat-total-buku");
    const elDisewa = document.getElementById("stat-disewa");
    if (elTotal) elTotal.textContent = books.length;
    if (elDisewa)
      elDisewa.textContent = books.filter(
        (b) => b.status === "dipinjam",
      ).length;

    const listEl = document.getElementById("overview-buku-list");
    if (listEl) {
      if (!books.length) {
        listEl.innerHTML = `<div style="text-align:center;padding:1.5rem;color:var(--text-light);font-size:13px">Belum ada buku.</div>`;
      } else {
        const badge = {
          pending: '<span class="badge badge-warning">Pending</span>',
          tersedia: '<span class="badge badge-success">Tersedia</span>',
          dipinjam: '<span class="badge badge-danger">Dipinjam</span>',
          ditolak: '<span class="badge badge-danger">Ditolak</span>',
        };
        listEl.innerHTML = books
          .map(
            (b, i) => `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;${i < books.length - 1 ? "border-bottom:0.5px solid var(--border)" : ""}">
            <div style="width:36px;height:48px;border-radius:4px;overflow:hidden;flex-shrink:0;">
              ${
                b.foto_url
                  ? `<img src="${b.foto_url}" style="width:100%;height:100%;object-fit:cover;" />`
                  : `<div style="width:100%;height:100%;background:#e8f4e8;display:flex;align-items:center;justify-content:center;font-size:16px">📗</div>`
              }
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.judul}</div>
              <div style="font-size:12px;color:var(--text-light)">Rp ${Number(b.harga_per_minggu).toLocaleString("id-ID")}/mg</div>
            </div>
            ${badge[b.status] || b.status}
          </div>`,
          )
          .join("");
      }
    }
  } catch (e) {}

  try {
    const res = await apiRequest("GET", "/rentals/incoming?status=pending");
    const rentals = res.success ? res.data : [];
    const listEl = document.getElementById("overview-permintaan-list");
    if (!listEl) return;
    if (!rentals.length) {
      listEl.innerHTML = `<div style="text-align:center;padding:1.5rem;color:var(--text-light);font-size:13px">Tidak ada permintaan masuk.</div>`;
      return;
    }
    listEl.innerHTML = rentals
      .map(
        (r, i) => `
      <div id="overview-rental-${r.id}" style="display:flex;align-items:center;gap:10px;padding:8px 0;${i < rentals.length - 1 ? "border-bottom:0.5px solid var(--border)" : ""}">
        <div style="width:36px;height:48px;border-radius:4px;overflow:hidden;flex-shrink:0;">
        ${
          r.book?.foto_path
            ? `<img src="${window.BUKUKU_SERVER}/storage/${r.book.foto_path}" style="width:100%;height:100%;object-fit:cover;" />`
          <div style="font-size:12px;color:var(--text-light)">${r.penyewa?.nama || "—"} · ${r.durasi_minggu || "?"} minggu</div>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <button onclick="overviewApprove(${r.id},this)" style="font-size:12px;padding:4px 10px;border-radius:6px;background:var(--success-bg);border:0.5px solid var(--success);color:var(--success);cursor:pointer;">Setujui</button>
          <button onclick="overviewReject(${r.id},this)" style="font-size:12px;padding:4px 10px;border-radius:6px;background:var(--danger-bg);border:0.5px solid var(--danger);color:var(--danger);cursor:pointer;">Tolak</button>
          <button onclick="openPemilikChatDirect(${r.penyewa.id},'${(r.penyewa.nama || "").replace(/'/g, "\\'")}','penyewa')" style="font-size:12px;padding:4px 10px;border-radius:6px;background:none;border:0.5px solid var(--border-strong);color:var(--text-mid);cursor:pointer;">Chat</button>
          </div>
      </div>`,
      )
      .join("");
  } catch (e) {}

  try {
    const res3 = await apiRequest("GET", "/notifications");
    const notifs = res3.success ? res3.data : [];
    const notifEl = document.getElementById("overview-notifikasi-list");
    if (!notifEl) return;
    if (!notifs.length) {
      notifEl.innerHTML = `<div style="text-align:center;padding:1rem;color:var(--text-light);font-size:13px">Belum ada notifikasi.</div>`;
    } else {
      notifEl.innerHTML = notifs
        .map(
          (n, i) => `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;${i < Math.min(notifs.length, 5) - 1 ? "border-bottom:0.5px solid var(--border)" : ""}">
        <div style="font-size:20px;flex-shrink:0">🔔</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:500">${n.title}</div>
          <div style="font-size:12px;color:var(--text-light);margin-top:2px">${n.body}</div>
        </div>
        <div style="font-size:11px;color:var(--text-light);flex-shrink:0">
          ${n.created_at ? new Date(n.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : ""}
        </div>
      </div>
    `,
        )
        .join("");
    }
  } catch (e) {}

  // Pendapatan bulan ini
  try {
    const res = await apiRequest(
      "GET",
      "/rentals/incoming?status=dikembalikan",
    );
    const rentals = res.success ? res.data : [];
    const now = new Date();
    let totalBulan = 0;
    rentals.forEach((r) => {
      const tgl = new Date(r.updated_at || r.created_at);
      if (
        tgl.getMonth() === now.getMonth() &&
        tgl.getFullYear() === now.getFullYear()
      ) {
        totalBulan += Number(r.total_harga) || 0;
      }
    });
    const elPend = document.getElementById("stat-pendapatan");
    if (elPend) elPend.textContent = "Rp " + totalBulan.toLocaleString("id-ID");
  } catch (e) {}

  // Rating rata-rata semua buku
  try {
    const res = await apiRequest("GET", "/my-books");
    const books = res.success ? res.data : [];
    const rated = books.filter((b) => b.rating && Number(b.rating) > 0);
    const elRating = document.getElementById("stat-rating");
    if (elRating) {
      if (rated.length) {
        const avg =
          rated.reduce((s, b) => s + Number(b.rating), 0) / rated.length;
        elRating.textContent = "⭐ " + avg.toFixed(1);
      } else {
        elRating.textContent = "—";
      }
    }
  } catch (e) {}
}

async function openPemilikChatDirect(userId, nama, role) {
  openChatPemilik(); // buka screen chat dulu
  // tunggu kontak selesai dimuat baru buka chat
  setTimeout(() => {
    openPemilikChat(userId, nama, role);
  }, 800);
}

async function overviewApprove(rentalId, btn) {
  btn.disabled = true;
  document
    .getElementById(`overview-rental-${rentalId}`)
    .querySelectorAll("button")
    .forEach((b) => (b.disabled = true));

  const res = await apiRequest("PUT", `/rentals/${rentalId}/approve`);
  if (res.success) {
    showToast("Permintaan disetujui.", "success");
    loadOverview();
  } else showToast(res.message || "Gagal.", "error");
}

async function overviewReject(rentalId, btn) {
  btn.disabled = true;
  document
    .getElementById(`overview-rental-${rentalId}`)
    .querySelectorAll("button")
    .forEach((b) => (b.disabled = true));

  const res = await apiRequest("PUT", `/rentals/${rentalId}/reject`);
  if (res.success) {
    showToast("Permintaan ditolak.", "success");
    setTimeout(() => loadOverview(), 1000);
  } else showToast(res.message || "Gagal.", "error");
}

// =============================================
// PERMINTAAN SEWA — Tab lengkap
// =============================================
async function loadPermintaan() {
  const container = document.getElementById("permintaan-list");
  if (!container) return;

  const filterEl = document.getElementById("filter-permintaan");
  const status = filterEl && filterEl.value ? filterEl.value : "";

  container.innerHTML =
    '<div style="text-align:center;padding:3rem;color:var(--text-light);font-size:14px">Memuat...</div>';

  let url = "/rentals/incoming";
  if (status) url += `?status=${status}`;

  try {
    const res = await apiRequest("GET", url);
    const rentals = res.success ? res.data : [];
    console.log("rental[0] book:", rentals[0]?.book);

    if (!rentals.length) {
      container.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--text-light);font-size:14px">Tidak ada permintaan.</div>`;
      return;
    }

    const statusMap = {
      pending: '<span class="badge badge-warning">Menunggu</span>',
      disetujui: '<span class="badge badge-success">Disetujui</span>',
      ditolak: '<span class="badge badge-danger">Ditolak</span>',
      dikembalikan: '<span class="badge badge-info">Selesai</span>',
      pengajuan_kembali:
        '<span class="badge badge-warning">Minta Dikembalikan</span>',
      terlambat: '<span class="badge badge-danger">Terlambat</span>',
    };

    container.innerHTML = "";
    rentals.forEach((r, i) => {
      const isPending = r.status === "pending";
      const isDisetujui = r.status === "disetujui";
      const isLast = i === rentals.length - 1;
      const card = document.createElement("div");
      card.className = "card";
      card.id = `rental-card-${r.id}`;
      card.style.marginBottom = isLast ? "0" : "0.75rem";
      card.innerHTML = `
        <div style="display:flex;align-items:flex-start;gap:12px;padding:4px 0">
          <div style="width:44px;height:56px;border-radius:6px;overflow:hidden;flex-shrink:0;background:#e8f4e8;display:flex;align-items:center;justify-content:center;font-size:22px;">
            ${
              r.book?.foto_path
                ? `<img src="${window.BUKUKU_SERVER}/storage/${r.book.foto_path}" style="width:100%;height:100%;object-fit:cover;" />`
                : `📗`
            }
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:600;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              ${r.book?.judul || "Buku"}
            </div>
            <div style="font-size:12px;color:var(--text-light);margin-bottom:2px">
              Diminta oleh: <strong>${r.penyewa?.nama || "—"}</strong>
              ${r.penyewa?.npm ? `(${r.penyewa.npm})` : ""}
            </div>
            <div style="font-size:12px;color:var(--text-mid)">
              Durasi: ${r.durasi_minggu || "?"} minggu
              · Total: Rp ${r.total_harga ? Number(r.total_harga).toLocaleString("id-ID") : "—"}
            </div>
            ${r.catatan ? `<div style="font-size:12px;color:var(--text-mid);margin-top:4px;font-style:italic">"${r.catatan}"</div>` : ""}
            <div style="font-size:11px;color:var(--text-light);margin-top:4px">
              ${r.created_at ? new Date(r.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0">
            ${statusMap[r.status] || `<span class="badge">${r.status}</span>`}
            ${
              isPending
                ? `
            <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
              <button onclick="approveRental(${r.id}, this)"
                style="padding:6px 14px;border-radius:8px;background:var(--success-bg);border:0.5px solid var(--success);color:var(--success);font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:500">
                Setujui
              </button>
              <button onclick="rejectRental(${r.id}, this)"
                style="padding:6px 14px;border-radius:8px;background:var(--danger-bg);border:0.5px solid var(--danger);color:var(--danger);font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:500">
                Tolak
              </button>
              ${
                r.penyewa?.id
                  ? `
              <button onclick="openPemilikChat(${r.penyewa.id},'${(r.penyewa.nama || "").replace(/'/g, "\\'")}','penyewa');openChatPemilik()"
                style="padding:6px 14px;border-radius:8px;background:var(--amber-light);border:0.5px solid var(--amber);color:var(--warm-brown);font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:500">
                 Chat
              </button>`
                  : ""
              }
            </div>`
                : r.status === "pengajuan_kembali" || isDisetujui
                  ? `
                  <button onclick="kembalikanRental(${r.id}, this)"
                    style="padding:6px 14px;border-radius:8px;background:var(--success-bg);border:0.5px solid var(--success);color:var(--success);font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:500">
                    📦 Buku Dikembalikan
                  </button>
                  ${
                    r.status === "pengajuan_kembali"
                      ? '<div style="font-size:11px;color:var(--success);margin-top:4px">✓ Penyewa sudah ajukan pengembalian</div>'
                      : '<div style="font-size:11px;color:var(--text-light);margin-top:4px">Penyewa belum ajukan pengembalian</div>'
                  }`
                  : ""
            }
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML =
      '<div style="text-align:center;padding:3rem;color:var(--text-light);font-size:14px">Gagal memuat permintaan.</div>';
  }
}

async function loadPendapatan() {
  const elTotal = document.getElementById("pend-total");
  const elBulan = document.getElementById("pend-bulan");
  const elSub = document.getElementById("pend-bulan-sub");
  const elTx = document.getElementById("pend-transaksi");
  const tbody = document.getElementById("pend-tbody");
  if (!tbody) return;

  tbody.innerHTML =
    '<tr><td colspan="5" style="text-align:center;color:#999;padding:20px">Memuat...</td></tr>';

  const res = await apiRequest("GET", "/rentals/incoming?status=dikembalikan");
  const rentals = res.success ? res.data : [];

  if (!rentals.length) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:#999;padding:20px">Belum ada transaksi selesai.</td></tr>';
    if (elTotal) elTotal.textContent = "Rp 0";
    if (elBulan) elBulan.textContent = "Rp 0";
    if (elTx) elTx.textContent = "0";
    return;
  }

  const now = new Date();
  const bulan = now.getMonth();
  const tahun = now.getFullYear();

  let total = 0;
  let totalBulan = 0;
  let totalBulanLalu = 0;

  rentals.forEach((r) => {
    const harga = Number(r.total_harga) || 0;
    total += harga;
    const tgl = new Date(r.updated_at || r.created_at);
    if (tgl.getMonth() === bulan && tgl.getFullYear() === tahun) {
      totalBulan += harga;
    }
    if (
      tgl.getMonth() === (bulan === 0 ? 11 : bulan - 1) &&
      tgl.getFullYear() === (bulan === 0 ? tahun - 1 : tahun)
    ) {
      totalBulanLalu += harga;
    }
  });

  const fmt = (n) => "Rp " + n.toLocaleString("id-ID");
  if (elTotal) elTotal.textContent = fmt(total);
  if (elBulan) elBulan.textContent = fmt(totalBulan);
  if (elTx) elTx.textContent = rentals.length;
  if (elSub) {
    if (totalBulanLalu > 0) {
      const pct = Math.round(
        ((totalBulan - totalBulanLalu) / totalBulanLalu) * 100,
      );
      elSub.textContent = (pct >= 0 ? "+" : "") + pct + "% vs bulan lalu";
      elSub.style.color = pct >= 0 ? "var(--success)" : "var(--danger)";
    } else {
      elSub.textContent = "";
    }
  }

  tbody.innerHTML = "";
  rentals
    .slice()
    .reverse()
    .forEach((r) => {
      const tgl = new Date(r.updated_at || r.created_at).toLocaleDateString(
        "id-ID",
        { day: "numeric", month: "short", year: "numeric" },
      );
      const tr = document.createElement("tr");
      tr.innerHTML = `
      <td>${r.book?.judul || "—"}</td>
      <td>${r.penyewa?.nama || "—"}</td>
      <td>${r.durasi_minggu || r.durasi || "?"} minggu</td>
      <td>Rp ${Number(r.total_harga).toLocaleString("id-ID")}</td>
      <td>${tgl}</td>
    `;
      tbody.appendChild(tr);
    });
}

async function approveRental(rentalId, btn) {
  const card = document.getElementById(`rental-card-${rentalId}`);
  if (card) card.querySelectorAll("button").forEach((b) => (b.disabled = true));

  try {
    const res = await apiRequest("PUT", `/rentals/${rentalId}/approve`);
    if (res.success) {
      showToast("Permintaan berhasil disetujui! 🎉", "success");
      loadPermintaan();
      loadOverview();
      _updateBadgePermintaan();
    } else {
      showToast(res.message || "Gagal menyetujui.", "error");
      if (card)
        card.querySelectorAll("button").forEach((b) => (b.disabled = false));
    }
  } catch (err) {
    showToast("Tidak bisa terhubung ke server.", "error");
    if (card)
      card.querySelectorAll("button").forEach((b) => (b.disabled = false));
  }
}

async function rejectRental(rentalId, btn) {
  const card = document.getElementById(`rental-card-${rentalId}`);
  if (card) card.querySelectorAll("button").forEach((b) => (b.disabled = true));

  try {
    const res = await apiRequest("PUT", `/rentals/${rentalId}/reject`);
    if (res.success) {
      showToast("Permintaan ditolak.", "info");
      loadPermintaan();
      loadOverview();
      _updateBadgePermintaan();
    } else {
      showToast(res.message || "Gagal menolak.", "error");
      if (card)
        card.querySelectorAll("button").forEach((b) => (b.disabled = false));
    }
  } catch (err) {
    showToast("Tidak bisa terhubung ke server.", "error");
    if (card)
      card.querySelectorAll("button").forEach((b) => (b.disabled = false));
  }
}

async function kembalikanRental(rentalId, btn) {
  if (!confirm("Tandai buku ini sudah dikembalikan oleh penyewa?")) return;
  const card = document.getElementById(`rental-card-${rentalId}`);
  if (card) card.querySelectorAll("button").forEach((b) => (b.disabled = true));

  try {
    const res = await apiRequest("PUT", `/rentals/${rentalId}/kembalikan`);
    if (res.success) {
      showToast("Buku ditandai sudah dikembalikan! ✅", "success");
      loadPermintaan();
      loadOverview();
    } else {
      showToast(res.message || "Gagal.", "error");
      if (card)
        card.querySelectorAll("button").forEach((b) => (b.disabled = false));
    }
  } catch (err) {
    showToast("Tidak bisa terhubung ke server.", "error");
    if (card)
      card.querySelectorAll("button").forEach((b) => (b.disabled = false));
  }
}

async function _updateBadgePermintaan() {
  try {
    const res = await apiRequest("GET", "/rentals/incoming?status=pending");
    const count = res.success ? (res.data || []).length : 0;
    const badge = document.getElementById("badge-permintaan-pending");
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? "inline-flex" : "none";
    }
  } catch (_) {}
}

// Hapus buku
async function hapusBuku(id) {
  if (!confirm("Yakin ingin menghapus buku ini?")) return;
  const res = await apiRequest("DELETE", `/books/${id}`);
  if (res.success) {
    showToast("Buku berhasil dihapus.", "success");
    loadMyBooks();
  } else {
    showToast("Gagal menghapus buku.", "error");
  }
}

// Buka tab chat penyewa + load kontak
function openChatPenyewa() {
  showScreen("screen-chat-penyewa");
  loadChatUsers();
}

// Switch tab pemilik
function switchPemilikTab(tab) {
  document
    .querySelectorAll("#pemilik-content > div")
    .forEach((d) => (d.style.display = "none"));
  const el = document.getElementById("ptab-" + tab);
  if (el) el.style.display = "block";
  document
    .querySelectorAll("#screen-pemilik .sidebar-item")
    .forEach((item, i) => {
      item.classList.remove("active");
      const tabs = [
        "overview",
        "bukuku",
        "permintaan",
        "notifikasi",
        "chat",
        "pendapatan",
        "profil",
      ];
      if (tabs[i] === tab) item.classList.add("active");
    });
  if (tab === "overview") loadOverview();
  if (tab === "bukuku") loadMyBooks();
  if (tab === "permintaan") loadPermintaan();
  if (tab === "notifikasi") loadNotifikasi();
  if (tab === "pendapatan") loadPendapatan();
  if (tab === "profil") loadProfil("pemilik");
}

// =============================================
// CHAT PEMILIK
// =============================================
let activePemilikChatUserId = null;

function openChatPemilik() {
  showScreen("screen-chat-pemilik");
  loadChatUsersPemilik();
}

async function loadChatUsersPemilik() {
  const container = document.getElementById("chat-contacts-pemilik");
  if (!container) return;

  container.innerHTML =
    '<div style="padding:20px;text-align:center;color:#999;font-size:13px;">Memuat kontak...</div>';

  const res = await apiRequest("GET", "/chat/users");
  if (!res.success) {
    container.innerHTML =
      '<div style="padding:20px;text-align:center;color:#999;font-size:13px;">Gagal memuat kontak.</div>';
    return;
  }

  const contacts = (res.data || []).filter((u) => u.role !== "admin");

  if (contacts.length === 0) {
    container.innerHTML =
      '<div style="padding:20px;text-align:center;color:#999;font-size:13px;">Belum ada pesan masuk.<br>Penyewa bisa menghubungi kamu dari halaman detail buku.</div>';
    return;
  }

  // Update badge pesan di sidebar pemilik
  const totalUnread = contacts.reduce(
    (sum, u) => sum + (u.unread_count || 0),
    0,
  );
  const badgePesan = document.getElementById("badge-pesan-pemilik");
  if (badgePesan) {
    badgePesan.textContent = totalUnread;
    badgePesan.style.display = totalUnread > 0 ? "inline-flex" : "none";
  }

  container.innerHTML = "";
  contacts.forEach((user) => {
    const div = document.createElement("div");
    div.className = "chat-item";
    div.id = `pemilik-contact-${user.id}`;
    div.style.cursor = "pointer";
    div.onclick = () =>
      openPemilikChat(user.id, user.nama, user.role, user.foto_url);
    div.innerHTML = `
    <div class="avatar" style="overflow:hidden;padding:0;">
      ${
        user.foto_url
          ? `<img src="${user.foto_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
          : user.nama.charAt(0).toUpperCase()
      }
    </div>
      <div class="chat-item-info">
        <div class="name">${user.nama}</div>
        <div class="preview">${user.last_message || (user.role === "penyewa" ? "Penyewa" : "Pemilik")}</div>
      </div>
        <div class="chat-item-meta">
          ${user.last_time ? `<div class="time">${user.last_time}</div>` : ""}
          ${user.unread_count > 0 ? `<div class="unread">${user.unread_count}</div>` : ""}
        </div>
      `;
    container.appendChild(div);
  });
}

async function openPemilikChat(userId, nama, role, fotoUrl) {
  activePemilikChatUserId = userId;
  const contactEl = document.getElementById(`pemilik-contact-${userId}`);
  if (contactEl) {
    const unreadEl = contactEl.querySelector(".unread");
    if (unreadEl) unreadEl.remove();
  }

  document.getElementById("chat-header-pemilik").style.display = "flex";
  document.getElementById("chat-input-area-pemilik").style.display = "flex";
  openChatWindow("pemilik");

  // Reset state polling untuk kontak ini
  delete _lastMessageIds[`${userId}`];

  const headerNama = document.getElementById("chat-pemilik-header-nama");
  const headerRole = document.getElementById("chat-pemilik-header-role");
  const headerAvatar = document.getElementById("chat-pemilik-header-avatar");
  if (headerNama) headerNama.textContent = nama;
  if (headerRole)
    headerRole.textContent = role === "penyewa" ? "Penyewa" : "Pemilik Buku";
  if (headerAvatar) {
    if (fotoUrl) {
      headerAvatar.innerHTML = `<img src="${fotoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
      headerAvatar.style.padding = "0";
      headerAvatar.style.overflow = "hidden";
    } else {
      headerAvatar.textContent = nama.charAt(0).toUpperCase();
    }
  }

  document
    .querySelectorAll("#chat-contacts-pemilik .chat-item")
    .forEach((el) => el.classList.remove("active"));
  const activeContact = document.getElementById(`pemilik-contact-${userId}`);
  if (activeContact) activeContact.classList.add("active");

  const msgs = document.getElementById("chat-messages-pemilik");
  if (msgs)
    msgs.innerHTML =
      '<div style="padding:20px;text-align:center;color:#999;font-size:13px;">Memuat pesan...</div>';

  const res = await apiRequest("GET", `/chat/${userId}`);
  if (res.success && msgs) {
    msgs.innerHTML = "";
    if (res.data.length === 0) {
      msgs.innerHTML =
        '<div style="padding:40px;text-align:center;color:#999;font-size:13px;">Belum ada pesan. 👋</div>';
    } else {
      res.data.forEach((m) =>
        appendPemilikMessage(m.message, m.nama, m.time, m.is_me),
      );
      msgs.scrollTop = msgs.scrollHeight;
    }
  }
}

async function sendPemilikMsg() {
  const input = document.getElementById("chat-pemilik-input");
  if (!input || !input.value.trim()) return;
  if (!activePemilikChatUserId) {
    showToast("Pilih kontak dulu.", "error");
    return;
  }

  const text = input.value.trim();
  input.value = "";

  // Tampilkan dulu, kirim belakangan
  const time = new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  appendPemilikMessage(text, "Kamu", time, true);

  const res = await apiRequest("POST", "/chat/send", {
    receiver_id: activePemilikChatUserId,
    message: text,
  });

  if (!res.success) {
    showToast("Gagal kirim pesan.", "error");
    input.value = text;
  }
}

function appendPemilikMessage(text, nama, time, isMe) {
  const msgs = document.getElementById("chat-messages-pemilik");
  if (!msgs) return;
  const div = document.createElement("div");
  div.className = `msg ${isMe ? "me" : "them"}`;
  div.innerHTML = `
    <div class="msg-bubble">${text.replace(/</g, "&lt;")}</div>
    <div class="msg-time">${time}</div>
  `;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

// listenChat sudah didefinisikan di atas (CHAT REAL-TIME CORE)
// Tidak perlu override di sini.

// =============================================
// WISHLIST
// =============================================
async function toggleWishlist(bookId) {
  const btn = document.getElementById("btn-wishlist");
  if (!btn) return;

  btn.style.width = btn.offsetWidth + "px";

  const isWishlisted = btn.classList.contains("wishlisted");

  try {
    if (isWishlisted) {
      const res = await apiRequest("DELETE", `/wishlist/${bookId}`);
      if (res.success) {
        btn.classList.remove("wishlisted");
        btn.innerHTML = `<i class="ti ti-heart" style="font-size:16px;vertical-align:-2px"></i> Wishlist`;
        btn.style.background = "transparent";
        btn.style.color = "var(--warm-brown)";
        showToast("Dihapus dari wishlist.", "info");
      }
    } else {
      const res = await apiRequest("POST", "/wishlist", { book_id: bookId });
      if (res.success) {
        btn.classList.add("wishlisted");
        btn.innerHTML = `<i class="ti ti-heart-filled" style="font-size:16px;vertical-align:-2px"></i> Wishlisted`;
        btn.style.background = "var(--amber-light)";
        btn.style.color = "var(--warm-brown)";
        showToast("Ditambahkan ke wishlist.", "success");
      } else {
        showToast(res.message || "Gagal.", "error");
      }
    }
  } catch (_) {
    showToast("Gagal terhubung ke server.", "error");
  }
}

async function toggleWishlistSewa(bookId) {
  const btn = document.getElementById("btn-ajukan-sewa");
  if (!btn) return;

  const isWishlisted = btn.classList.contains("wishlisted");

  try {
    if (isWishlisted) {
      const res = await apiRequest("DELETE", `/wishlist/${bookId}`);
      if (res.success) {
        btn.classList.remove("wishlisted");
        btn.innerHTML = `<i class="ti ti-heart" style="font-size:16px;vertical-align:-2px"></i> Tambah ke Wishlist`;
        btn.style.background = "transparent";
        btn.style.color = "var(--warm-brown)";
        btn.style.border = "0.5px solid var(--warm-brown)";
        showToast("Dihapus dari wishlist.", "info");
      }
    } else {
      const res = await apiRequest("POST", "/wishlist", { book_id: bookId });
      if (res.success) {
        btn.classList.add("wishlisted");
        btn.innerHTML = `<i class="ti ti-heart-filled" style="font-size:16px;vertical-align:-2px"></i> Di Wishlist`;
        btn.style.background = "var(--amber-light)";
        btn.style.color = "var(--warm-brown)";
        btn.style.border = "0.5px solid var(--amber)";
        showToast("Ditambahkan ke wishlist.", "success");
      } else {
        showToast(res.message || "Gagal.", "error");
      }
    }
  } catch (_) {
    showToast("Gagal terhubung ke server.", "error");
  }
}

async function loadWishlist() {
  const grid = document.getElementById("wishlist-grid");
  if (!grid) return;

  grid.innerHTML =
    '<div style="padding:40px;text-align:center;color:#999;font-size:13px;">Memuat wishlist...</div>';

  try {
    const res = await apiRequest("GET", "/wishlist");
    if (!res.success || res.data.length === 0) {
      grid.innerHTML =
        '<div style="padding:40px;text-align:center;color:#999;font-size:13px;">Belum ada buku di wishlist.</div>';
      return;
    }

    const colors = [
      "#fff8ed",
      "#edf5ff",
      "#fff0f0",
      "#f0fff0",
      "#fff5e0",
      "#f5f0ff",
    ];
    const emojis = ["📗", "📘", "📕", "📙", "📒", "📔"];

    grid.innerHTML = "";
    res.data.forEach((w, i) => {
      const book = w.book;
      const div = document.createElement("div");
      div.className = "book-card";
      div.style.cursor = "pointer";
      div.onclick = () => showBookDetailFromApi(book);
      div.innerHTML = `
        <div class="book-cover" style="background:${colors[i % colors.length]};${book.foto_url ? "padding:0;overflow:hidden;" : ""}">
          ${
            book.foto_url
              ? `<img src="${book.foto_url}" style="width:100%;height:100%;object-fit:cover;" alt="${book.judul}" />`
              : emojis[i % emojis.length]
          }
          <span class="status-badge ${book.status === "tersedia" ? "status-available" : "status-borrowed"}">
            ${book.status === "tersedia" ? "Tersedia" : "Disewa"}
          </span>
        </div>
        <div class="book-info">
          <h4>${book.judul}</h4>
          <div class="genre">${book.genre} • ${book.pemilik?.nama || "-"}</div>
          <div class="stars">★★★★☆</div>
          <div class="price">Rp ${Number(book.harga_per_minggu).toLocaleString("id-ID")} <span>/ minggu</span></div>
        </div>
      `;
      grid.appendChild(div);
    });
  } catch (err) {
    grid.innerHTML =
      '<div style="padding:40px;text-align:center;color:#999;font-size:13px;">Gagal memuat wishlist.</div>';
  }
}

// =============================================
// AJUKAN SEWA
// =============================================

let _durasingSgu = 1;

function openModalSewa() {
  if (!currentBook) {
    showToast("Data buku tidak ditemukan.", "error");
    return;
  }

  // Cegah pemilik sewa bukunya sendiri
  const me = getUser();
  if (me && currentBook.pemilik && me.id === currentBook.pemilik.id) {
    showToast("Ini adalah buku milik kamu sendiri.", "warning");
    return;
  }

  _durasingSgu = 1;
  document.getElementById("durasi-val").textContent = 1;
  document.getElementById("sewa-catatan").value = "";
  document.getElementById("modal-sewa-judulbuku").textContent =
    "📗 " + (currentBook.judul || "—");

  const harga = Number(currentBook.harga_per_minggu) || 0;
  document.getElementById("modal-harga-minggu").textContent =
    "Rp " + harga.toLocaleString("id-ID");
  document.getElementById("modal-total-harga").textContent =
    "Rp " + harga.toLocaleString("id-ID");

  const modal = document.getElementById("modal-sewa");
  modal.style.display = "flex";
}

function closeModalSewa() {
  document.getElementById("modal-sewa").style.display = "none";
}

function changeDurasi(delta) {
  const harga = Number(currentBook?.harga_per_minggu) || 0;
  _durasingSgu = Math.max(1, Math.min(12, _durasingSgu + delta));
  document.getElementById("durasi-val").textContent = _durasingSgu;
  document.getElementById("modal-total-harga").textContent =
    "Rp " + (harga * _durasingSgu).toLocaleString("id-ID");
}

async function apiAjukanSewa() {
  if (!currentBook) {
    showToast("Data buku tidak ditemukan.", "error");
    return;
  }

  const catatan = document.getElementById("sewa-catatan")?.value.trim() || "";
  const btn = document.getElementById("btn-submit-sewa");

  if (btn) {
    btn.disabled = true;
    btn.textContent = "Mengirim...";
  }

  try {
    const res = await apiRequest("POST", "/rentals", {
      book_id: currentBook.id,
      durasi_minggu: _durasingSgu,
      catatan: catatan,
    });

    if (res.success) {
      showToast(
        "Permintaan sewa berhasil dikirim! 🎉 Tunggu konfirmasi pemilik.",
        "success",
      );
      closeModalSewa();
    } else {
      showToast(res.message || "Gagal mengirim permintaan.", "error");
    }
  } catch (err) {
    showToast("Tidak bisa terhubung ke server.", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML =
        '<i class="ti ti-send" style="font-size:15px;vertical-align:-2px"></i> Kirim Permintaan Sewa';
    }
  }
}

// =============================================
// NOTIFIKASI
// =============================================
async function loadNotifikasi() {
  const list = document.getElementById("notifikasi-list");
  if (!list) return;

  list.innerHTML =
    '<div style="text-align:center;padding:2rem;color:var(--text-light);font-size:13px">Memuat...</div>';

  try {
    const res = await apiRequest("GET", "/notifications");
    const notifs = res.success ? res.data : [];

    if (!notifs.length) {
      list.innerHTML =
        '<div style="text-align:center;padding:2rem;color:var(--text-light);font-size:13px">Belum ada notifikasi.</div>';
      return;
    }

    const iconMap = {
      rental: { icon: "ti-book", cls: "new" },
      approved: { icon: "ti-check", cls: "info" },
      message: { icon: "ti-message", cls: "info" },
      review: { icon: "ti-star", cls: "info" },
      returned: { icon: "ti-arrow-back", cls: "info" },
    };

    list.innerHTML = notifs
      .map((n, i) => {
        const cfg = iconMap[n.type] || iconMap.rental;
        const isLast = i === notifs.length - 1;
        return `
        <div class="notif-item" style="cursor:pointer;${isLast ? "border:none" : ""}" 
            onclick="tandaiDibaca(${n.id}, '${n.type}')">
          <div class="notif-icon ${n.is_read ? "info" : cfg.cls}">
            <i class="ti ${cfg.icon}" aria-hidden="true"></i>
          </div>
          <div class="notif-text">
            <strong>${n.title}</strong>
            <p>${n.body}</p>
          </div>
          <div class="notif-time">${n.time_ago || "—"}</div>
        </div>
      `;
      })
      .join("");

    // Update badge notifikasi
    const unread = notifs.filter((n) => !n.is_read).length;
    const badge = document.getElementById("badge-notifikasi");
    if (badge) {
      badge.textContent = unread;
      badge.style.display = unread > 0 ? "inline-flex" : "none";
    }
  } catch (err) {
    list.innerHTML =
      '<div style="text-align:center;padding:2rem;color:var(--text-light);font-size:13px">Gagal memuat notifikasi.</div>';
  }
}

async function tandaiSemuaDibaca() {
  try {
    await apiRequest("PUT", "/notifications/read-all");
  } catch (_) {}

  // Update visual semua icon jadi dibaca
  document.querySelectorAll(".notif-icon.new").forEach((el) => {
    el.classList.remove("new");
    el.classList.add("info");
  });

  // Update badge jadi 0
  const badge = document.getElementById("badge-notifikasi");
  if (badge) badge.style.display = "none";

  showToast("Semua notifikasi ditandai dibaca.", "success");
}

async function tandaiDibaca(notifId, type) {
  // Tandai sebagai dibaca di server
  try {
    await apiRequest("PUT", `/notifications/${notifId}/read`);
  } catch (_) {}

  // Arahkan ke tab yang relevan
  if (type === "rental") {
    switchPemilikTab("permintaan");
  } else if (type === "message") {
    openChatPemilik();
  } else {
    switchPemilikTab("permintaan");
  }
}

async function loadNotifikasiPenyewa() {
  const list = document.getElementById("notifikasi-list-penyewa");
  if (!list) return;

  list.innerHTML =
    '<div style="text-align:center;padding:2rem;color:var(--text-light);font-size:13px">Memuat...</div>';

  try {
    const res = await apiRequest("GET", "/notifications");
    const notifs = res.success ? res.data : [];

    if (!notifs.length) {
      list.innerHTML =
        '<div style="text-align:center;padding:2rem;color:var(--text-light);font-size:13px">Belum ada notifikasi.</div>';
      return;
    }

    const iconMap = {
      rental: { icon: "ti-book", cls: "new" },
      approved: { icon: "ti-check", cls: "info" },
      message: { icon: "ti-message", cls: "info" },
      review: { icon: "ti-star", cls: "info" },
      returned: { icon: "ti-arrow-back", cls: "info" },
      wishlist: { icon: "ti-heart", cls: "new" },
      ditolak: { icon: "ti-x", cls: "new" },
    };

    list.innerHTML = notifs
      .map((n, i) => {
        const cfg = iconMap[n.type] || iconMap.rental;
        const isLast = i === notifs.length - 1;
        return `
        <div class="notif-item" style="cursor:pointer;${isLast ? "border:none" : ""}"
            onclick="tandaiDibacaPenyewa(${n.id})">
          <div class="notif-icon ${n.is_read ? "info" : cfg.cls}">
            <i class="ti ${cfg.icon}" aria-hidden="true"></i>
          </div>
          <div class="notif-text">
            <strong>${n.title}</strong>
            <p>${n.body}</p>
          </div>
          <div class="notif-time">${n.time_ago || "—"}</div>
        </div>
      `;
      })
      .join("");

    // Update badge
    const unread = notifs.filter((n) => !n.is_read).length;
    const badge = document.getElementById("badge-notif-penyewa");
    if (badge) {
      badge.textContent = unread;
      badge.style.display = unread > 0 ? "inline-flex" : "none";
    }
  } catch (err) {
    list.innerHTML =
      '<div style="text-align:center;padding:2rem;color:var(--text-light);font-size:13px">Gagal memuat notifikasi.</div>';
  }
}

async function tandaiDibacaPenyewa(notifId) {
  try {
    await apiRequest("PUT", `/notifications/${notifId}/read`);
  } catch (_) {}
  loadNotifikasiPenyewa();
}

async function tandaiSemuaDibacaPenyewa() {
  try {
    await apiRequest("PUT", "/notifications/read-all");
  } catch (_) {}
  loadNotifikasiPenyewa();
  const badge = document.getElementById("badge-notif-penyewa");
  if (badge) badge.style.display = "none";
  showToast("Semua notifikasi ditandai dibaca.", "success");
}



// =============================================
// PROFIL
// =============================================

async function loadProfil(role) {
  const user = getUser();
  if (!user) return;

  // Ambil data terbaru dari API termasuk ktm_url dan jurusan
  try {
    const res = await apiRequest("GET", "/me");
    if (res.success) {
      const fresh = res.data;
      const stored = getUser();
      stored.ktm_url = fresh.ktm_url;
      stored.jurusan = fresh.jurusan;
      localStorage.setItem("bukuku_user", JSON.stringify(stored));
    }
  } catch (_) {}

  const updatedUser = getUser(); // ambil ulang setelah update

  const suffix = role;
  const avatarEl = document.getElementById(`profil-avatar-${suffix}`);
  const namaEl   = document.getElementById(`profil-nama-${suffix}`);
  const npmEl    = document.getElementById(`profil-npm-${suffix}`);
  const emailEl  = document.getElementById(`profil-email-${suffix}`);
  const jurusanEl= document.getElementById(`profil-jurusan-${suffix}`);

  // Isi inisial avatar
  const inisial = updatedUser.nama
    .split(" ")
    .map((n) => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
  if (avatarEl) avatarEl.textContent = inisial;
  if (namaEl) namaEl.textContent = updatedUser.nama;
  if (npmEl) npmEl.textContent = updatedUser.npm;
  if (emailEl) emailEl.textContent = updatedUser.email;
  if (jurusanEl) jurusanEl.textContent = updatedUser.jurusan || "—";
}

function profilAction(action, role) {
  const panel = document.getElementById(`profil-panel-${role}`);
  if (!panel) return;

  const user = getUser();

  if (action === "ktm") {
    panel.innerHTML = `
      <h3 style="font-size:15px;font-weight:600;margin-bottom:1rem;">Foto KTM</h3>
      <img src="${user.ktm_url || ""}" 
        style="width:100%;max-height:260px;object-fit:contain;border-radius:10px;border:0.5px solid var(--border);cursor:zoom-in;"
        onclick="openLightbox('${user.ktm_url || ""}')"
        onerror="this.outerHTML='<div style=\\'padding:2rem;text-align:center;color:var(--text-light);font-size:13px;\\'>Foto KTM tidak tersedia.</div>'"
        alt="Foto KTM" />
      <p style="font-size:12px;color:var(--text-light);margin-top:8px;text-align:center;">Klik foto untuk memperbesar</p>
    `;

    // SESUDAH
  } else if (action === "uploadfoto") {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Preview lokal dulu
      const reader = new FileReader();
      reader.onload = (ev) => {
        const avatarEl = document.getElementById(`profil-avatar-${role}`);
        if (avatarEl) {
          avatarEl.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
        }
        const avatarNav = document.getElementById(`avatar-${role}`);
        if (avatarNav) {
          avatarNav.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
        }
      };
      reader.readAsDataURL(file);

      // Kirim ke server
      const formData = new FormData();
      formData.append("foto", file);

      try {
        const res = await apiRequest("POST", "/profile/foto", formData, true);
        console.log("Full response upload:", res); // ← tambah
        if (res.success) {
          console.log("foto_url dari server:", res.data.foto_url); // ← tambah
          const user = getUser();
          user.foto_url = res.data.foto_url;
          localStorage.setItem("bukuku_user", JSON.stringify(user));
          showToast("Foto profil diperbarui!", "success");
        } else {
          showToast(res.message || "Gagal mengunggah foto.", "error");
        }
      } catch (_) {
        console.log("Error upload foto:", _); // ← tambah
        showToast("Tidak bisa terhubung ke server.", "error");
      }
    };
    input.click();
  } else if (action === "edit") {
    panel.innerHTML = `
      <h3 style="font-size:15px;font-weight:600;margin-bottom:1rem;">Edit Profil</h3>
      <p style="font-size:12px;color:var(--text-light);margin-bottom:1rem;">Pastikan nama sesuai dengan KTM/identitas resmi kamu.</p>
      <div class="form-group">
        <label class="form-label">Nama Lengkap</label>
        <input type="text" id="edit-nama-${role}" class="form-input" value="${user.nama}" />
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input type="email" id="edit-email-${role}" class="form-input" value="${user.email}" />
      </div>
      <button onclick="apiEditProfil('${role}')" class="btn-full" style="margin-top:8px;">
        Simpan Perubahan
      </button>
    `;
  } else if (action === "password") {
    panel.innerHTML = `
      <h3 style="font-size:15px;font-weight:600;margin-bottom:1rem;">Ganti Password</h3>
      <div class="form-group">
        <label class="form-label">Password Lama</label>
        <input type="password" id="old-pass-${role}" class="form-input" placeholder="Masukkan password lama" />
      </div>
      <div class="form-group">
        <label class="form-label">Password Baru</label>
        <input type="password" id="new-pass-${role}" class="form-input" placeholder="Minimal 8 karakter" />
      </div>
      <div class="form-group">
        <label class="form-label">Konfirmasi Password Baru</label>
        <input type="password" id="new-pass2-${role}" class="form-input" placeholder="Ulangi password baru" />
      </div>
      <button onclick="apiGantiPassword('${role}')" class="btn-full" style="margin-top:8px;">
        Ganti Password
      </button>
    `;
  } else if (action === "keluar") {
    panel.innerHTML = `
      <h3 style="font-size:15px;font-weight:600;margin-bottom:1rem;">Keluar</h3>
      <p style="font-size:13px;color:var(--text-mid);margin-bottom:1.5rem;">Apakah kamu yakin ingin keluar dari BukuKu?</p>
      <div style="display:flex;gap:10px;">
        <button onclick="apiLogout()" style="flex:1;padding:10px;border-radius:10px;background:var(--danger-bg);border:0.5px solid var(--danger);color:var(--danger);font-size:13px;cursor:pointer;font-weight:500;">
          Ya, Keluar
        </button>
        <button onclick="document.getElementById('profil-panel-${role}').innerHTML='<div style=\\'text-align:center;padding:3rem;color:var(--text-light);font-size:13px;\\'>Pilih menu di kiri untuk menampilkan konten.</div>'" 
          style="flex:1;padding:10px;border-radius:10px;background:var(--surface2);border:0.5px solid var(--border);color:var(--text-mid);font-size:13px;cursor:pointer;">
          Tidak
        </button>
      </div>
    `;
  }
}

async function apiEditProfil(role) {
  const nama  = document.getElementById(`edit-nama-${role}`)?.value.trim();
  const email = document.getElementById(`edit-email-${role}`)?.value.trim();

  if (!nama || !email) {
    showToast("Nama dan email tidak boleh kosong.", "error");
    return;
  }

  try {
    const res = await apiRequest("PUT", "/profile", { nama, email });
    if (res.success) {
      // Update session
      const user = getUser();
      user.nama  = nama;
      user.email = email;
      localStorage.setItem("bukuku_user", JSON.stringify(user));

      // Update tampilan card
      document.getElementById(`profil-nama-${role}`).textContent  = nama;
      document.getElementById(`profil-email-${role}`).textContent = email;

      // Update inisial avatar
      const inisial = nama.split(" ").map(n => n.charAt(0).toUpperCase()).slice(0,2).join("");
      const avatarEl = document.getElementById(`profil-avatar-${role}`);
      if (avatarEl && !avatarEl.querySelector("img")) avatarEl.textContent = inisial;

      showToast("Profil berhasil diperbarui!", "success");
    } else {
      showToast(res.message || "Gagal memperbarui profil.", "error");
    }
  } catch (_) {
    showToast("Tidak bisa terhubung ke server.", "error");
  }
}

async function apiGantiPassword(role) {
  const oldPass  = document.getElementById(`old-pass-${role}`)?.value;
  const newPass  = document.getElementById(`new-pass-${role}`)?.value;
  const newPass2 = document.getElementById(`new-pass2-${role}`)?.value;

  if (!oldPass || !newPass || !newPass2) {
    showToast("Lengkapi semua field.", "error");
    return;
  }
  if (newPass.length < 8) {
    showToast("Password baru minimal 8 karakter.", "error");
    return;
  }
  if (newPass !== newPass2) {
    showToast("Konfirmasi password tidak cocok.", "error");
    return;
  }

  try {
    const res = await apiRequest("PUT", "/profile/password", {
      old_password: oldPass,
      password: newPass,
      password_confirmation: newPass2,
    });
    if (res.success) {
      showToast("Password berhasil diganti!", "success");
      document.getElementById(`old-pass-${role}`).value  = "";
      document.getElementById(`new-pass-${role}`).value  = "";
      document.getElementById(`new-pass2-${role}`).value = "";
    } else {
      showToast(res.message || "Gagal mengganti password.", "error");
    }
  } catch (_) {
    showToast("Tidak bisa terhubung ke server.", "error");
  }
}