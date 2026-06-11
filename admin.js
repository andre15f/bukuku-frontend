// =============================================
// BukuKu Admin Panel — JavaScript
// =============================================

// URL server dibaca dari config.js (load config.js sebelum admin.js di HTML)
const API_BASE = window.BUKUKU_API_BASE || "https://web-production-7dfb7.up.railway.app/api";

function getAdminToken() { return localStorage.getItem("bukuku_admin_token"); }
function getAdminUser() {
  const raw = localStorage.getItem("bukuku_admin_user");
  return raw ? JSON.parse(raw) : null;
}
function saveAdminSession(token, user) {
  localStorage.setItem("bukuku_admin_token", token);
  localStorage.setItem("bukuku_admin_user", JSON.stringify(user));
}
function clearAdminSession() {
  localStorage.removeItem("bukuku_admin_token");
  localStorage.removeItem("bukuku_admin_user");
}

async function apiAdmin(method, endpoint, body = null) {
  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
  const token = getAdminToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${endpoint}`, options);

    if (res.status === 401) {
      clearAdminSession();
      showAdminScreen("screen-admin-login");
      showAdminToast("Sesi habis, silakan login ulang.", "warning");
      return { success: false };
    }

  try {
    return await res.json();
  } catch (_) {
    return { success: false, message: "Response tidak valid dari server." };
  }
}

// =============================================
// SCREEN NAVIGATION
// =============================================
function showAdminScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const el = document.getElementById(id);
  if (el) el.classList.add("active");
}

// =============================================
// AUTH
// =============================================
function toggleAdminPass() {
  const inp = document.getElementById("admin-pass");
  const icon = document.getElementById("admin-pass-icon");
  const isPass = inp.type === "password";
  inp.type = isPass ? "text" : "password";
  icon.className = isPass ? "ti ti-eye-off" : "ti ti-eye";
}

async function adminLogin() {
  const npm = document.getElementById("admin-npm").value.trim();
  const pass = document.getElementById("admin-pass").value;
  if (!npm || !pass) { showAdminToast("Masukkan NPM dan password.", "error"); return; }

  const btn = document.getElementById("btn-admin-login");
  btn.disabled = true;
  btn.textContent = "Masuk...";

  try {
    const res = await apiAdmin("POST", "/login", {
      npm,
      password: pass,
      role: "admin",
    });


    if (res.success) {
      if (res.data.user.role !== "admin") {
        showAdminToast("Akun ini bukan admin.", "error");
        btn.disabled = false;
        btn.textContent = "Masuk";
        return;
      }
      saveAdminSession(res.data.token, res.data.user);
      document.getElementById("admin-nama-display").textContent =
        res.data.user.nama;
      showAdminScreen("screen-admin-dashboard");
      switchAdminTab("verifikasi");
    } else {
      showAdminToast(res.message || "Login gagal.", "error");
    }
  } catch (err) {
    showAdminToast("Tidak bisa terhubung ke server.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Masuk";
  }
}

async function adminLogout() {
  try { await apiAdmin("POST", "/logout"); } catch (_) {}
  clearAdminSession();
  showAdminScreen("screen-admin-login");
}

// =============================================
// TAB SWITCHING
// =============================================
function switchAdminTab(tab) {
  ["verifikasi", "buku", "users"].forEach((t) => {
    const el = document.getElementById(`atab-${t}`);
    const menu = document.getElementById(`amenu-${t}`);
    const mbn = document.getElementById(`ambn-${t}`);
    if (el) el.style.display = t === tab ? "block" : "none";
    if (menu) menu.classList.toggle("active", t === tab);
    if (mbn) mbn.classList.toggle("active", t === tab);
  });
  if (tab === "verifikasi") loadPendingUsers();
  if (tab === "buku") loadPendingBooks();
  if (tab === "users") loadAllUsers();
}

// =============================================
// VERIFIKASI USER
// =============================================
async function loadPendingUsers() {
  const container = document.getElementById("pending-users-list");
  container.innerHTML = '<div class="empty-admin">Memuat data...</div>';

  try {
    const res = await apiAdmin("GET", "/admin/pending-users");
    const badge = document.getElementById("badge-pending-users");

    if (!res.success || !res.data || res.data.length === 0) {
      badge.textContent = "0";
      container.innerHTML =
        '<div class="empty-admin">✅ Tidak ada pendaftaran yang menunggu verifikasi.</div>';
      return;
    }

    badge.textContent = res.data.length;
    const mbnUsers = document.getElementById("mbn-badge-users");
    if (mbnUsers) { mbnUsers.textContent = res.data.length; mbnUsers.style.display = "block"; }
    container.innerHTML = "";
    res.data.forEach(user => {
      const card = document.createElement("div");
      card.className = "user-card";
      card.id = `user-card-${user.id}`;
      card.innerHTML = `
        <div class="user-card-info">
          <strong>${user.nama}</strong>
          <span>NPM: ${user.npm}</span>
          <span>Email: ${user.email}</span>
          <span>Daftar: ${user.created_at}</span>
        </div>
        <button class="ktm-toggle" onclick="toggleKtm(${user.id})">
          <i class="ti ti-id"></i> Lihat Foto KTM
        </button>
        <div class="ktm-wrap" id="ktm-${user.id}">
          ${
            user.ktm_url
              ? `<img src="${user.ktm_url}" class="ktm-img" alt="KTM ${user.nama}" onclick="openLightbox('${user.ktm_url}')" style="cursor:zoom-in;" />`
              : '<p style="color:#999;font-size:12px;margin-top:8px">Tidak ada foto KTM.</p>'
          }
        </div>
        <div class="action-btns">
          <button class="btn-approve" id="btn-approve-${user.id}" onclick="approveUser(${user.id})">
            <i class="ti ti-check"></i> Setujui
          </button>
          <button class="btn-reject" id="btn-reject-${user.id}" onclick="toggleRejectForm(${user.id})">
            <i class="ti ti-x"></i> Tolak
          </button>
        </div>
        <textarea class="reject-reason" id="reject-reason-${user.id}"
          placeholder="Tuliskan alasan penolakan..."></textarea>
        <button class="btn-full" id="btn-confirm-reject-${user.id}"
          style="display:none;margin-top:8px;background:var(--danger);border-color:var(--danger)"
          onclick="rejectUser(${user.id})">Konfirmasi Tolak</button>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = '<div class="empty-admin">Gagal memuat data.</div>';
  }
}

function toggleKtm(userId) {
  const wrap = document.getElementById(`ktm-${userId}`);
  wrap.classList.toggle("open");
}

function toggleRejectForm(userId) {
  const reason = document.getElementById(`reject-reason-${userId}`);
  const btnConfirm = document.getElementById(`btn-confirm-reject-${userId}`);
  const isOpen = reason.classList.contains("open");
  reason.classList.toggle("open", !isOpen);
  btnConfirm.style.display = isOpen ? "none" : "block";
}

function toggleRejectBookForm(bookId) {
  const reason = document.getElementById(`reject-book-reason-${bookId}`);
  const btnConfirm = document.getElementById(
    `btn-confirm-reject-book-${bookId}`,
  );
  const isOpen = reason.classList.contains("open");
  reason.classList.toggle("open", !isOpen);
  btnConfirm.style.display = isOpen ? "none" : "block";
}

async function approveUser(userId) {
  const btn = document.getElementById(`btn-approve-${userId}`);
  const btnReject = document.getElementById(`btn-reject-${userId}`);
  btn.disabled = true;
  btn.textContent = "Memproses...";

  try {
    const res = await apiAdmin("POST", `/admin/approve-user/${userId}`);
    if (res.success) {
      showAdminToast("User berhasil disetujui.", "success");
      document.getElementById(`user-card-${userId}`)?.remove();
      updatePendingBadge("pending-users-list", "badge-pending-users");
    } else {
      showAdminToast(res.message || "Gagal menyetujui.", "error");
      btn.disabled = false;
      btn.textContent = "Setujui";
    }
  } catch (err) {
    showAdminToast("Tidak bisa terhubung ke server.", "error");
    btn.disabled = false;
    btn.textContent = "Setujui";
  }
}

async function rejectUser(userId) {
  const reason = document.getElementById(`reject-reason-${userId}`).value.trim();
  if (!reason) { showAdminToast("Tuliskan alasan penolakan.", "error"); return; }

  const btn = document.getElementById(`btn-confirm-reject-${userId}`);
  btn.disabled = true;
  btn.textContent = "Memproses...";

  try {
    const res = await apiAdmin("POST", `/admin/reject-user/${userId}`, { alasan: reason });
    if (res.success) {
      showAdminToast("User berhasil ditolak.", "success");
      document.getElementById(`user-card-${userId}`)?.remove();
      updatePendingBadge("pending-users-list", "badge-pending-users");
    } else {
      showAdminToast(res.message || "Gagal menolak.", "error");
      btn.disabled = false;
      btn.textContent = "Konfirmasi Tolak";
    }
  } catch (err) {
    showAdminToast("Tidak bisa terhubung ke server.", "error");
    btn.disabled = false;
    btn.textContent = "Konfirmasi Tolak";
  }
}

// =============================================
// VERIFIKASI BUKU
// =============================================
async function loadPendingBooks() {
  const container = document.getElementById("pending-books-list");
  container.innerHTML = '<div class="empty-admin">Memuat data...</div>';

  try {
    const res = await apiAdmin("GET", "/admin/pending-books");
    const badge = document.getElementById("badge-pending-books");

    if (!res.success || !res.data || res.data.length === 0) {
      badge.textContent = "0";
      container.innerHTML =
        '<div class="empty-admin">✅ Tidak ada buku yang menunggu verifikasi.</div>';
      return;
    }

    badge.textContent = res.data.length;
    const mbnBooks = document.getElementById("mbn-badge-books");
    if (mbnBooks) { mbnBooks.textContent = res.data.length; mbnBooks.style.display = "block"; }
    container.innerHTML = "";
    res.data.forEach(book => {
      const card = document.createElement("div");
      card.className = "book-card-admin";
      card.id = `book-card-${book.id}`;
      card.innerHTML = `
        <div class="book-info-row"><strong>${book.judul}</strong></div>
        <div class="book-info-row">Penulis: ${book.penulis} &nbsp;·&nbsp; Genre: ${book.genre}</div>
        <div class="book-info-row">Harga: Rp ${Number(book.harga_per_minggu).toLocaleString("id-ID")}/minggu &nbsp;·&nbsp; Kondisi: ${book.kondisi}</div>
        <div class="book-info-row">Pemilik: <strong>${book.pemilik?.nama || "-"}</strong> (${book.pemilik?.npm || "-"})</div>
        <div class="book-info-row" style="margin-top:6px;color:var(--text-dark)">${book.deskripsi || "-"}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
          ${book.foto_url ? `<img src="${book.foto_url}" onclick="openLightbox('${book.foto_url}')" style="width:120px;height:90px;object-fit:cover;border-radius:8px;border:0.5px solid var(--border)" alt="Foto 1" />` : ""}
          ${book.foto_url_2 ? `<img src="${book.foto_url_2}" onclick="openLightbox('${book.foto_url_2}')" style="width:120px;height:90px;object-fit:cover;border-radius:8px;border:0.5px solid var(--border)" alt="Foto 2" />` : ""}
          ${book.foto_url_3 ? `<img src="${book.foto_url_3}" onclick="openLightbox('${book.foto_url_3}')" style="width:120px;height:90px;object-fit:cover;border-radius:8px;border:0.5px solid var(--border)" alt="Foto 3" />` : ""}
        </div>        
        <div class="action-btns" style="margin-top:12px">
          <button class="btn-approve" onclick="approveBook(${book.id})">
            <i class="ti ti-check"></i> Setujui
          </button>
          <button class="btn-reject" id="btn-reject-book-${book.id}" onclick="toggleRejectBookForm(${book.id})">
            <i class="ti ti-x"></i> Tolak
          </button>
        </div>
        <textarea class="reject-reason" id="reject-book-reason-${book.id}"
          placeholder="Tuliskan alasan penolakan buku..."></textarea>
        <button class="btn-full" id="btn-confirm-reject-book-${book.id}"
          style="display:none;margin-top:8px;background:var(--danger);border-color:var(--danger)"
          onclick="rejectBook(${book.id})">Konfirmasi Tolak</button>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = '<div class="empty-admin">Gagal memuat data.</div>';
  }
}

async function approveBook(bookId) {
  try {
    const res = await apiAdmin("POST", `/admin/approve-book/${bookId}`);
    if (res.success) {
      showAdminToast("Buku berhasil disetujui.", "success");
      document.getElementById(`book-card-${bookId}`)?.remove();
      updatePendingBadge("pending-books-list", "badge-pending-books");
    } else {
      showAdminToast(res.message || "Gagal.", "error");
    }
  } catch (_) { showAdminToast("Gagal terhubung.", "error"); }
}

async function rejectBook(bookId) {
  const reason = document
    .getElementById(`reject-book-reason-${bookId}`)
    .value.trim();
  if (!reason) {
    showAdminToast("Tuliskan alasan penolakan.", "error");
    return;
  }

  const btn = document.getElementById(`btn-confirm-reject-book-${bookId}`);
  btn.disabled = true;
  btn.textContent = "Memproses...";

  try {
    const res = await apiAdmin("POST", `/admin/reject-book/${bookId}`, {
      alasan: reason,
    });
    if (res.success) {
      showAdminToast("Buku ditolak.", "success");
      document.getElementById(`book-card-${bookId}`)?.remove();
      updatePendingBadge("pending-books-list", "badge-pending-books");
    } else {
      showAdminToast(res.message || "Gagal.", "error");
      btn.disabled = false;
      btn.textContent = "Konfirmasi Tolak";
    }
  } catch (_) {
    showAdminToast("Gagal terhubung.", "error");
    btn.disabled = false;
    btn.textContent = "Konfirmasi Tolak";
  }
}
// =============================================
// SEMUA USER
// =============================================
async function loadAllUsers() {
  const tbody = document.getElementById("all-users-tbody");
  tbody.innerHTML =
    '<tr><td colspan="7" style="text-align:center;color:#999;padding:20px">Memuat...</td></tr>';

  // Reset search input
  const searchInput = document.getElementById("search-user-input");
  if (searchInput) searchInput.value = "";

  try {
    const res = await apiAdmin("GET", "/admin/users");
    if (!res.success || res.data.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" style="text-align:center;color:#999;padding:20px">Belum ada user.</td></tr>';
      return;
    }

    const roleBadge = {
      penyewa: '<span class="badge badge-info">Penyewa</span>',
      pemilik: '<span class="badge badge-warning">Pemilik</span>',
      admin:
        '<span class="badge" style="background:#1a1208;color:var(--amber)">Admin</span>',
    };
    const statusBadge = {
      aktif: '<span class="badge badge-success">Aktif</span>',
      pending: '<span class="badge badge-warning">Pending</span>',
      ditolak: '<span class="badge badge-danger">Ditolak</span>',
    };

    tbody.innerHTML = "";
    res.data.forEach((user) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
      <td>${user.nama}</td>
      <td>${user.npm}</td>
      <td>${user.email}</td>
      <td>${roleBadge[user.role] || user.role}</td>
      <td>${statusBadge[user.status] || user.status}</td>
      <td>${user.created_at}</td>
      <td>
        ${
          user.role !== "admin"
            ? `
          <button class="btn-reject" style="padding:5px 12px;font-size:12px"
            onclick="deleteUser(${user.id}, '${user.nama}')">
            <i class="ti ti-trash"></i> Hapus
          </button>
        `
            : "-"
        }
      </td>
    `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:#999">Gagal memuat.</td></tr>';
  }
}


async function deleteUser(userId, namaUser) {
  if (
    !confirm(
      `Yakin ingin menghapus user "${namaUser}"? Tindakan ini tidak bisa dibatalkan.`,
    )
  )
    return;

  try {
    const res = await apiAdmin("DELETE", `/admin/users/${userId}`);
    if (res.success) {
      showAdminToast(`User "${namaUser}" berhasil dihapus.`, "success");
      loadAllUsers();
    } else {
      showAdminToast(res.message || "Gagal menghapus user.", "error");
    }
  } catch (_) {
    showAdminToast("Tidak bisa terhubung ke server.", "error");
  }
}


function filterAllUsers() {
  const keyword = document
    .getElementById("search-user-input")
    .value.toLowerCase();
  const rows = document.querySelectorAll("#all-users-tbody tr");
  rows.forEach((row) => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(keyword) ? "" : "none";
  });
}


function openModalTambahUser() {
  document.getElementById("modal-tambah-user").style.display = "flex";
}

function closeModalTambahUser() {
  document.getElementById("modal-tambah-user").style.display = "none";
  document.getElementById("new-user-nama").value = "";
  document.getElementById("new-user-npm").value = "";
  document.getElementById("new-user-email").value = "";
  document.getElementById("new-user-password").value = "";
  document.getElementById("new-user-role").value = "penyewa";
}

async function apiTambahUser() {
  const nama = document.getElementById("new-user-nama").value.trim();
  const npm = document.getElementById("new-user-npm").value.trim();
  const email = document.getElementById("new-user-email").value.trim();
  const role = document.getElementById("new-user-role").value;
  const password = document.getElementById("new-user-password").value;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!nama || !npm || !email || !password) {
    showAdminToast("Lengkapi semua field yang wajib diisi.", "error");
    return;
  }
  if (!emailRegex.test(email)) {
    showAdminToast("Format email tidak valid.", "error");
    return;
  }
  if (password.length < 8) {
    showAdminToast("Password minimal 8 karakter.", "error");
    return;
  }

  const btn = document.getElementById("btn-simpan-user");
  btn.disabled = true;
  btn.textContent = "Menyimpan...";

  try {
    const res = await apiAdmin("POST", "/admin/create-user", {
      nama,
      npm,
      email,
      role,
      password,
    });

    if (res.success) {
      showAdminToast("Akun berhasil dibuat!", "success");
      closeModalTambahUser();
      loadAllUsers();
    } else {
      showAdminToast(res.message || "Gagal membuat akun.", "error");
    }
  } catch (err) {
    showAdminToast("Tidak bisa terhubung ke server.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Buat Akun";
  }
}


// =============================================
// HELPERS
// =============================================
function updatePendingBadge(containerId, badgeId) {
  const container = document.getElementById(containerId);
  const badge = document.getElementById(badgeId);
  const cards = container.querySelectorAll(".user-card, .book-card-admin");
  const count = cards.length;
  badge.textContent = count;

  // sync ke mobile bottom nav badge
  const mbnUsers = document.getElementById("mbn-badge-users");
  const mbnBooks = document.getElementById("mbn-badge-books");
  if (mbnUsers)
    mbnUsers.style.display =
      document.getElementById("badge-pending-users").textContent !== "0"
        ? "block"
        : "none";
  if (mbnBooks)
    mbnBooks.style.display =
      document.getElementById("badge-pending-books").textContent !== "0"
        ? "block"
        : "none";

  if (count === 0) {
    container.innerHTML =
      '<div class="empty-admin">✅ Semua sudah diverifikasi.</div>';
  }
}

function showAdminToast(message, type = "info") {
  const old = document.getElementById("admin-toast");
  if (old) old.remove();

  const colors = {
    success: { bg: "var(--success-bg)", border: "var(--success)", text: "var(--success)" },
    error:   { bg: "var(--danger-bg)",  border: "var(--danger)",  text: "var(--danger)"  },
    warning: { bg: "var(--warning-bg)", border: "var(--warning)", text: "var(--warning)" },
    info:    { bg: "var(--info-bg)",    border: "var(--info)",    text: "var(--info)"    },
  };
  const icons = { success: "✓", error: "✗", warning: "⚠", info: "ℹ" };
  const c = colors[type] || colors.info;

  const toast = document.createElement("div");
  toast.id = "admin-toast";
  toast.style.cssText = `
    position:fixed;top:70px;right:20px;z-index:9999;
    background:${c.bg};border:1px solid ${c.border};color:${c.text};
    padding:12px 18px;border-radius:10px;font-size:13px;
    font-family:'DM Sans',sans-serif;max-width:340px;
    box-shadow:0 4px 16px rgba(0,0,0,0.1);
    display:flex;align-items:center;gap:10px;line-height:1.5;
  `;
  toast.innerHTML = `<span style="font-size:16px">${icons[type]}</span><span>${message}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => toast?.remove(), 4000);
}

// =============================================
// AUTO LOGIN CHECK
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  const token = getAdminToken();
  const user = getAdminUser();
  if (token && user && user.role === "admin") {
    document.getElementById("admin-nama-display").textContent = user.nama;
    showAdminScreen("screen-admin-dashboard");
    switchAdminTab("verifikasi");
  }
});


// LIGHTBOX
function openLightbox(src) {
  const existing = document.getElementById("lightbox-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "lightbox-overlay";
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:9999;
    display:flex;align-items:center;justify-content:center;cursor:zoom-out;
  `;
  overlay.innerHTML = `
    <img src="${src}" style="max-width:90vw;max-height:90vh;border-radius:8px;object-fit:contain;" />
    <button onclick="document.getElementById('lightbox-overlay').remove()" 
      style="position:absolute;top:20px;right:20px;background:none;border:none;
      color:white;font-size:32px;cursor:pointer;line-height:1;">✕</button>
  `;
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}