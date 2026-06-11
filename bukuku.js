// =============================================
// BukuKu Platform — JavaScript
// =============================================

// --- SCREEN NAVIGATION ---
function showScreen(id) {
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.remove("active"));
  const el = document.getElementById(id);
  if (el) el.classList.add("active");
  window.scrollTo(0, 0);
}

// --- LOGIN ---
function selectLoginRole(role) {
  document.getElementById("login-role-penyewa").classList.remove("selected");
  document.getElementById("login-role-pemilik").classList.remove("selected");
  document.getElementById("login-role-" + role).classList.add("selected");
}

function togglePass(id, btn) {
  const inp = document.getElementById(id);
  const isPass = inp.type === "password";
  inp.type = isPass ? "text" : "password";
  btn.innerHTML = isPass
    ? '<i class="ti ti-eye-off" aria-hidden="true"></i>'
    : '<i class="ti ti-eye" aria-hidden="true"></i>';
}

function forgotPassword() {
  const npm = document.getElementById("login-npm").value.trim();
  if (!npm) {
    alert("Masukkan NPM kamu terlebih dahulu, lalu klik Lupa Password.");
    return;
  }
  alert(
    "Instruksi reset password akan dikirim ke email yang terdaftar dengan NPM " +
      npm +
      ".",
  );
}

// --- REGISTER (multi-step) ---
function checkPass() {
  const val = document.getElementById("reg-pass").value;
  const wrap = document.getElementById("pass-strength");
  if (!val) {
    wrap.style.display = "none";
    return;
  }
  wrap.style.display = "block";
  let s = 0;
  if (val.length >= 8) s++;
  if (/[A-Z]/.test(val)) s++;
  if (/[0-9]/.test(val)) s++;
  if (/[^A-Za-z0-9]/.test(val)) s++;
  const cfg = [
    { w: "25%", c: "#E03030", t: "Terlalu lemah" },
    { w: "50%", c: "#D4A853", t: "Cukup" },
    { w: "75%", c: "#4A90D4", t: "Kuat" },
    { w: "100%", c: "#2D7A4A", t: "Sangat kuat" },
  ][Math.max(0, s - 1)];
  document.getElementById("pass-bar").style.width = cfg.w;
  document.getElementById("pass-bar").style.background = cfg.c;
  document.getElementById("pass-label").style.color = cfg.c;
  document.getElementById("pass-label").textContent = cfg.t;
}

function goToStep2() {
  const nama = document.getElementById("reg-nama").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const npm = document.getElementById("reg-npm").value.trim();
  const pass = document.getElementById("reg-pass").value;
  const pass2 = document.getElementById("reg-pass2").value;
  if (!nama || !email || !npm || !pass || !pass2) {
    alert("Mohon lengkapi semua field yang wajib diisi.");
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert("Format email tidak valid.");
    return;
  }
  if (npm.length < 8) {
    alert("NPM minimal 8 digit.");
    return;
  }
  if (pass.length < 8) {
    alert("Password minimal 8 karakter.");
    return;
  }
  if (pass !== pass2) {
    alert("Konfirmasi password tidak cocok.");
    return;
  }

  document.getElementById("preview-nama").textContent = nama;
  document.getElementById("preview-npm").textContent = npm;
  document.getElementById("preview-email").textContent = email;
  document.getElementById("reg-step1").style.display = "none";
  document.getElementById("reg-step2").style.display = "block";
  document.getElementById("s1").classList.remove("active");
  document.getElementById("s1").classList.add("done");
  document.getElementById("s1-num").textContent = "✓";
  document.getElementById("s2").classList.add("active");
}

function backToStep1() {
  document.getElementById("reg-step2").style.display = "none";
  document.getElementById("reg-step1").style.display = "block";
  document.getElementById("s1").classList.add("active");
  document.getElementById("s1").classList.remove("done");
  document.getElementById("s1-num").textContent = "1";
  document.getElementById("s2").classList.remove("active");
}

function handleFile(input) {
  if (!input.files || !input.files[0]) return;
  document.getElementById("ktm-zone").style.display = "none";
  document.getElementById("ktm-preview").style.display = "flex";
  document.getElementById("ktm-filename").textContent = input.files[0].name;
}

function removeUpload() {
  document.getElementById("ktm-file").value = "";
  document.getElementById("ktm-zone").style.display = "block";
  document.getElementById("ktm-preview").style.display = "none";
}

// FIX: upload foto buku di modal
function handleBookPhoto(input) {
  if (!input.files || !input.files[0]) return;
  const zone = document.getElementById("book-photo-zone");
  const preview = document.getElementById("book-photo-preview");
  const filename = document.getElementById("book-photo-filename");
  if (zone) zone.style.display = "none";
  if (preview) preview.style.display = "flex";
  if (filename) filename.textContent = input.files[0].name;
}

function removeBookPhoto() {
  const fileInput = document.getElementById("book-photo-file");
  if (fileInput) fileInput.value = "";
  const zone = document.getElementById("book-photo-zone");
  const preview = document.getElementById("book-photo-preview");
  if (zone) zone.style.display = "block";
  if (preview) preview.style.display = "none";
}

// --- FILTER CHIP ---
function setFilterChip(el) {
  document
    .querySelectorAll(".filter-chip")
    .forEach((c) => c.classList.remove("active"));
  el.classList.add("active");
}

// --- DASHBOARD PENYEWA ---
function showBookDetail() {
  showScreen("screen-bookdetail");
}

function switchPenyewaTab(tab) {
  document
    .querySelectorAll("#penyewa-content > div")
    .forEach((d) => (d.style.display = "none"));
  const el = document.getElementById("tab-" + tab);
  if (el) el.style.display = "block";
  document
    .querySelectorAll("#screen-penyewa .sidebar-item")
    .forEach((item, i) => {
      item.classList.remove("active");
      const tabs = [
        "browse",
        "sewa",
        "riwayat",
        "notifikasi",
        "chat",
        "wishlist",
        "profil",
      ];
      if (tabs[i] === tab) item.classList.add("active");
    });
  // Load buku dari database saat buka tab browse
  if (tab === "browse" && typeof loadBooks === "function") loadBooks();
  if (tab === "wishlist" && typeof loadWishlist === "function") loadWishlist();
  if (tab === "riwayat" && typeof loadRiwayat === "function") loadRiwayat();
  if (tab === "sewa" && typeof loadSewaAktif === "function") loadSewaAktif();
  if (tab === "notifikasi") loadNotifikasiPenyewa();
  if (tab === "profil") loadProfil("penyewa");
}

// --- DASHBOARD PEMILIK ---
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
  // Load buku milik pemilik dari database
  if (tab === "bukuku" && typeof loadMyBooks === "function") loadMyBooks();
}

function openAddBook() {
  document.getElementById("modal-addbuku").style.display = "block";
}

function closeAddBook() {
  document.getElementById("modal-addbuku").style.display = "none";
}

// FIX: setujui / tolak permintaan
function approveRequest(btn) {
  const row = btn.closest("div[style]") || btn.parentElement.parentElement;
  const badge = row.querySelector(".badge");
  if (badge) {
    badge.className = "badge badge-success";
    badge.textContent = "Disetujui";
  }
  btn.parentElement
    .querySelectorAll("button")
    .forEach((b) => (b.disabled = true));
}

function rejectRequest(btn) {
  const row = btn.closest("div[style]") || btn.parentElement.parentElement;
  const badge = row.querySelector(".badge");
  if (badge) {
    badge.className = "badge badge-danger";
    badge.textContent = "Ditolak";
  }
  btn.parentElement
    .querySelectorAll("button")
    .forEach((b) => (b.disabled = true));
}

// --- CHAT penyewa ---
function openChatPenyewa() {
  showScreen("screen-chat-penyewa");
  if (typeof loadChatUsers === "function") loadChatUsers();
}

// --- SEND MSG (fallback jika api.js belum load) ---
function sendMsg(inputId) {
  const id = inputId || "chat-input-field";
  const input = document.getElementById(id);
  if (!input || !input.value.trim()) return;
  const activeScreen = document.querySelector(".screen.active");
  const msgs = activeScreen
    ? activeScreen.querySelector(".chat-messages")
    : null;
  if (!msgs) return;
  const div = document.createElement("div");
  div.className = "msg me";
  div.innerHTML = `<div class="msg-bubble">${input.value.replace(/</g, "&lt;")}</div><div class="msg-time">Baru saja</div>`;
  msgs.appendChild(div);
  input.value = "";
  msgs.scrollTop = msgs.scrollHeight;
}

function handleBookPhoto2(input) {
  if (!input.files || !input.files[0]) return;
  document.getElementById("book-photo-zone-2").style.display = "none";
  document.getElementById("book-photo-preview-2").style.display = "flex";
  document.getElementById("book-photo-filename-2").textContent =
    input.files[0].name;
}

function removeBookPhoto2() {
  document.getElementById("book-photo-file-2").value = "";
  document.getElementById("book-photo-zone-2").style.display = "block";
  document.getElementById("book-photo-preview-2").style.display = "none";
}

function handleBookPhoto3(input) {
  if (!input.files || !input.files[0]) return;
  document.getElementById("book-photo-zone-3").style.display = "none";
  document.getElementById("book-photo-preview-3").style.display = "flex";
  document.getElementById("book-photo-filename-3").textContent =
    input.files[0].name;
}

function removeBookPhoto3() {
  document.getElementById("book-photo-file-3").value = "";
  document.getElementById("book-photo-zone-3").style.display = "block";
  document.getElementById("book-photo-preview-3").style.display = "none";
}

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
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };
  document.body.appendChild(overlay);
}

document.addEventListener("DOMContentLoaded", function () {
  const GDATA = {
    kategori: [
      "Novel",
      "Komik",
      "Manga",
      "Buku Akademik",
      "Buku Ilmiah",
      "Buku Pendidikan",
      "Jurnal",
      "Majalah",
      "Kamus",
      "Ensiklopedia",
      "Modul Pembelajaran",
      "Biografi",
      "Autobiografi",
      "Buku Anak",
      "Skripsi",
      "Tesis",
      "Disertasi",
      "Kumpulan Soal",
      "Buku Referensi",
      "Panduan Praktikum",
      "Buku Motivasi",
      "Buku Agama",
      "Umum",
    ],
    genre: [
      "Romance",
      "Horor",
      "Fantasi",
      "Misteri",
      "Thriller",
      "Action",
      "Petualangan",
      "Comedy",
      "Drama",
      "Sci-Fi",
      "Slice of Life",
      "Supernatural",
      "Kriminal",
      "Survival",
      "Sejarah",
      "Edukasi",
      "Motivasi",
      "Psikologi",
      "Religi",
      "Sports",
      "Keluarga",
      "Politik",
      "Filosofi",
      "Misteri Pembunuhan",
      "School Life",
      "Time Travel",
      "Cyberpunk",
      "Distopia",
      "Medical",
      "Military",
      "Musik",
      "Persahabatan",
      "Kehidupan Kampus",
      "Bisnis",
      "Self Improvement",
      "Teknologi",
      "Budaya",
      "Islami",
      "Anak-anak",
      "Umum",
    ],
    bidang: [
      "Sistem Informasi",
      "Teknologi Informasi",
      "Sains Data",
      "Informatika",
      "Teknik Sipil",
      "Teknik Elektro",
      "Teknik Mesin",
      "Arsitektur",
      "Kedokteran",
      "Ilmu Biomedis",
      "Keperawatan",
      "Farmasi",
      "Hukum",
      "Ilmu Komunikasi",
      "Administrasi Publik",
      "Kesejahteraan Sosial",
      "Manajemen",
      "Akuntansi",
      "Ekonomi Pembangunan",
      "Perpajakan",
      "Bisnis Digital",
      "Pendidikan Matematika",
      "Pendidikan Bahasa Indonesia",
      "Pendidikan Bahasa Inggris",
      "Pendidikan Akuntansi",
      "PPKn",
      "Bimbingan dan Konseling",
      "PGSD",
      "Pendidikan Agama Islam",
      "Perbankan Syariah",
      "Manajemen Bisnis Syariah",
      "Agroteknologi",
      "Agribisnis",
      "Teknologi Hasil Pertanian",
      "Statistik",
      "Matematika",
      "Fisika",
      "Kimia",
      "Biologi",
      "Sastra Indonesia",
      "Multimedia",
      "Desain Grafis",
      "Psikologi",
      "Agama",
      "Lainnya",
    ],
  };
  const gSel = { kategori: new Set(), genre: new Set(), bidang: new Set() };

  function gBuild() {
    Object.keys(GDATA).forEach((k) => {
      const grid = document.getElementById("ggrid-" + k);
      if (!grid || grid.children.length > 0) return;
      GDATA[k].forEach((v) => {
        const el = document.createElement("div");
        el.className = "cs-item-g";
        el.textContent = v;
        el.title = v;
        el.onclick = () => gToggleItem(k, v, el);
        grid.appendChild(el);
      });
    });
  }

  function gToggleItem(k, v, el) {
    if (gSel[k].has(v)) {
      gSel[k].delete(v);
      el.classList.remove("sel");
    } else {
      gSel[k].add(v);
      el.classList.add("sel");
    }
    gUpdateBadge(k);
    gRenderTags();
    gUpdateHidden();
  }

  function gUpdateBadge(k) {
    const n = gSel[k].size;
    const b = document.getElementById("gbadge-" + k);
    b.textContent = n;
    b.style.display = n > 0 ? "inline-block" : "none";
  }

  window.gClear = function (k) {
    gSel[k].clear();
    document
      .querySelectorAll("#ggrid-" + k + " .cs-item-g")
      .forEach((e) => e.classList.remove("sel"));
    gUpdateBadge(k);
    gRenderTags();
    gUpdateHidden();
  };

  function gRenderTags() {
    const c = document.getElementById("g-selected-tags");
    const all = [];
    Object.keys(gSel).forEach((k) =>
      gSel[k].forEach((v) => all.push({ k, v })),
    );
    c.innerHTML =
      all.length === 0
        ? ""
        : all
            .map(
              ({ k, v }) =>
                `<span class="cs-tag">${v}<span class="cs-tag-x" onclick="gRemoveTag('${k}','${v}')">✕</span></span>`,
            )
            .join("");
  }

  window.gRemoveTag = function (k, v) {
    gSel[k].delete(v);
    const el = document.querySelector(`#ggrid-${k} .cs-item-g[title="${v}"]`);
    if (el) el.classList.remove("sel");
    gUpdateBadge(k);
    gRenderTags();
    gUpdateHidden();
  };

  function gUpdateHidden() {
    const all = [];
    Object.keys(gSel).forEach((k) => gSel[k].forEach((v) => all.push(v)));
    document.getElementById("book-genre").value = all.join(",");
  }

  window.gToggle = function (k) {
    const dd = document.getElementById("gdd-" + k);
    const btn = document.getElementById("gbtn-" + k);
    const isOpen = dd.classList.contains("open");
    ["kategori", "genre", "bidang"].forEach((x) => {
      document.getElementById("gdd-" + x).classList.remove("open");
      document.getElementById("gbtn-" + x).classList.remove("open");
    });
    if (!isOpen) {
      dd.classList.add("open");
      btn.classList.add("open");
    }
    gBuild();
  };

  window.gClose = function (k) {
    document.getElementById("gdd-" + k).classList.remove("open");
    document.getElementById("gbtn-" + k).classList.remove("open");
  };

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".cs-wrap")) {
      ["kategori", "genre", "bidang"].forEach((k) => gClose(k));
    }
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const BDATA = {
    kategori: [
      "Novel",
      "Komik",
      "Manga",
      "Buku Akademik",
      "Buku Ilmiah",
      "Buku Pendidikan",
      "Jurnal",
      "Majalah",
      "Kamus",
      "Ensiklopedia",
      "Modul Pembelajaran",
      "Biografi",
      "Autobiografi",
      "Buku Anak",
      "Skripsi",
      "Tesis",
      "Disertasi",
      "Kumpulan Soal",
      "Buku Referensi",
      "Panduan Praktikum",
      "Buku Motivasi",
      "Buku Agama",
      "Umum",
    ],
    genre: [
      "Romance",
      "Horor",
      "Fantasi",
      "Misteri",
      "Thriller",
      "Action",
      "Petualangan",
      "Comedy",
      "Drama",
      "Sci-Fi",
      "Slice of Life",
      "Supernatural",
      "Kriminal",
      "Survival",
      "Sejarah",
      "Edukasi",
      "Motivasi",
      "Psikologi",
      "Religi",
      "Sports",
      "Keluarga",
      "Politik",
      "Filosofi",
      "Misteri Pembunuhan",
      "School Life",
      "Time Travel",
      "Cyberpunk",
      "Distopia",
      "Medical",
      "Military",
      "Musik",
      "Persahabatan",
      "Kehidupan Kampus",
      "Bisnis",
      "Self Improvement",
      "Teknologi",
      "Budaya",
      "Islami",
      "Anak-anak",
      "Umum",
    ],
    bidang: [
      "Sistem Informasi",
      "Teknologi Informasi",
      "Sains Data",
      "Informatika",
      "Teknik Sipil",
      "Teknik Elektro",
      "Teknik Mesin",
      "Arsitektur",
      "Kedokteran",
      "Ilmu Biomedis",
      "Keperawatan",
      "Farmasi",
      "Hukum",
      "Ilmu Komunikasi",
      "Administrasi Publik",
      "Kesejahteraan Sosial",
      "Manajemen",
      "Akuntansi",
      "Ekonomi Pembangunan",
      "Perpajakan",
      "Bisnis Digital",
      "Pendidikan Matematika",
      "Pendidikan Bahasa Indonesia",
      "Pendidikan Bahasa Inggris",
      "Pendidikan Akuntansi",
      "PPKn",
      "Bimbingan dan Konseling",
      "PGSD",
      "Pendidikan Agama Islam",
      "Perbankan Syariah",
      "Manajemen Bisnis Syariah",
      "Agroteknologi",
      "Agribisnis",
      "Teknologi Hasil Pertanian",
      "Statistik",
      "Matematika",
      "Fisika",
      "Kimia",
      "Biologi",
      "Sastra Indonesia",
      "Multimedia",
      "Desain Grafis",
      "Psikologi",
      "Agama",
      "Lainnya",
    ],
  };
  const bSel = { kategori: new Set(), genre: new Set(), bidang: new Set() };

  function bBuild() {
    Object.keys(BDATA).forEach((k) => {
      const grid = document.getElementById("ggrid-browse-" + k);
      if (!grid || grid.children.length > 0) return;
      BDATA[k].forEach((v) => {
        const el = document.createElement("div");
        el.className = "cs-item-g";
        el.textContent = v;
        el.title = v;
        el.onclick = () => bToggleItem(k, v, el);
        grid.appendChild(el);
      });
    });
  }

  function bToggleItem(k, v, el) {
    if (bSel[k].has(v)) {
      bSel[k].delete(v);
      el.classList.remove("sel");
    } else {
      bSel[k].add(v);
      el.classList.add("sel");
    }
    bUpdateBadge(k);
    if (typeof loadBooks === "function") loadBooks();
  }

  function bUpdateBadge(k) {
    const n = bSel[k].size;
    const b = document.getElementById("gbadge-browse-" + k);
    if (b) {
      b.textContent = n;
      b.style.display = n > 0 ? "inline-block" : "none";
    }
  }

  window.gClearBrowse = function (k) {
    bSel[k].clear();
    document
      .querySelectorAll("#ggrid-browse-" + k + " .cs-item-g")
      .forEach((e) => e.classList.remove("sel"));
    bUpdateBadge(k);
    if (typeof loadBooks === "function") loadBooks();
  };

  window.gToggleBrowse = function (k) {
    const dd = document.getElementById("gdd-browse-" + k);
    const btn = document.getElementById("gbtn-browse-" + k);
    const isOpen = dd.classList.contains("open");
    ["kategori", "genre", "bidang"].forEach((x) => {
      document.getElementById("gdd-browse-" + x).classList.remove("open");
      document.getElementById("gbtn-browse-" + x).classList.remove("open");
    });
    if (!isOpen) {
      dd.classList.add("open");
      btn.classList.add("open");
    }
    bBuild();
  };

  window.gCloseBrowse = function (k) {
    document.getElementById("gdd-browse-" + k).classList.remove("open");
    document.getElementById("gbtn-browse-" + k).classList.remove("open");
  };

  window.getBrowseGenreFilter = function () {
    const all = [];
    Object.keys(bSel).forEach((k) => bSel[k].forEach((v) => all.push(v)));
    return all;
  };

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".cs-wrap")) {
      ["kategori", "genre", "bidang"].forEach((k) => gCloseBrowse(k));
    }
  });
});

function setPmbnActive(id) {
  document.querySelectorAll("#pemilik-bottom-nav .mbn-item").forEach((el) => {
    el.classList.remove("active");
  });
  const el = document.getElementById(id);
  if (el) el.classList.add("active");
}

function openChatWindow(role) {
  if (window.innerWidth <= 768) {
    const list = document.querySelector(`#screen-chat-${role} .chat-list`);
    const win = document.querySelector(`#screen-chat-${role} .chat-window`);
    if (list) list.classList.add("hidden");
    if (win) win.classList.add("open");
  }
}

function closeChatWindow(role) {
  if (window.innerWidth <= 768) {
    const list = document.querySelector(`#screen-chat-${role} .chat-list`);
    const win = document.querySelector(`#screen-chat-${role} .chat-window`);
    if (list) list.classList.remove("hidden");
    if (win) win.classList.remove("open");
  }
}