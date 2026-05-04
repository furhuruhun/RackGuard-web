# RackGuard - Front-End Implementation Context

**Sistem:** Rak Buku Pintar dengan Sistem Penguncian Elektronik untuk Manajemen Peminjaman Mandiri
**Kelompok:** 01 - II3240 Rekayasa Sistem dan Teknologi Informasi
**Cakupan Dokumen:** Konteks komprehensif untuk implementasi Front-End (Mobile App & Web Dashboard)

> **Companion docs:** Read `CLAUDE.md` for behavioral guidelines and `DESIGN.md` for visual design tokens before implementing.

---

## 1. RINGKASAN SISTEM

### 1.1 Deskripsi Singkat
RackGuard adalah sistem manajemen peminjaman buku berbasis IoT yang mengintegrasikan rak fisik pintar dengan aplikasi mobile (untuk peminjam) dan web dashboard (untuk admin). Sistem ini bertujuan menyelesaikan masalah akuntabilitas, transparansi, dan keamanan dalam pengelolaan koleksi buku komunitas/perpustakaan kecil.

### 1.2 Komponen Utama Sistem
1. **Mobile Application** — Interface utama peminjam (iOS & Android)
2. **Web Dashboard** — Interface admin/pustakawan
3. **Backend (Firebase)** — Realtime Database, Auth, Cloud Functions, FCM
4. **IoT Smart Shelf** — Perangkat fisik (ESP32 + RFID + Solenoid Lock) — *out of frontend scope*

### 1.3 Stakeholder & Role
| Role | Akses | Platform |
|------|-------|----------|
| **Peminjam** | Pinjam, kembalikan, lihat katalog & riwayat | Mobile App (Flutter) |
| **Admin / Chief Librarian** | Manajemen inventaris, anggota, transaksi, laporan | Web Dashboard (Next.js) |
| **Sistem (IoT)** | Auto-update status, kontrol kunci | Background (firmware) |

> **Boundary rule:** features for `Peminjam` live in mobile only; features for `Admin` live in web only. No cross-pollination.

---

## 2. MOBILE APPLICATION — KEBUTUHAN FRONT-END

### 2.1 Tech Stack (LOCKED)
- **Framework:** Flutter (Dart)
- **State management:** Provider atau Riverpod
- **HTTP client:** Dio
- **Local storage / cache:** Hive atau SharedPreferences
- **NFC:** `nfc_manager` package (atau equivalent)
- **Push notifications:** Firebase Cloud Messaging (FCM)
- **Firebase SDK:** `firebase_core`, `firebase_auth`, `firebase_database`, `firebase_messaging`
- **Charts (jika perlu):** `fl_chart`
- **Min targets:** Android 8.0+ (API 26), iOS 13+
- **Loading interface katalog:** < 5 detik
- **Sinkronisasi:** Real-time via Firebase Realtime Database listeners

### 2.2 Aktor Utama
**Peminjam** — pengguna terdaftar yang ingin meminjam/mengembalikan buku.

### 2.3 Use Case Mobile App
1. **Mengautentikasi pengguna** — Login dengan kredensial (email institusi `@student.itb.ac.id`) via Firebase Auth
2. **Melihat katalog buku** — Browse semua buku dengan status real-time
3. **Melihat informasi denda & notifikasi** — Push notification (FCM) & in-app notification
4. **Melihat riwayat peminjaman** — Histori transaksi pengguna
5. **Melakukan pemindaian NFC tag** — Scan tag rak untuk membuka kunci

### 2.4 Struktur Halaman & Navigasi

#### 2.4.1 Bottom Navigation (5 Tab Utama)
| Tab | Icon | Halaman | Fungsi |
|-----|------|---------|--------|
| 1 | Home | Beranda | Dashboard pengguna, peminjaman aktif, rekomendasi |
| 2 | Book | Katalog | Daftar buku dengan filter & search |
| 3 | Scan (Center, elevated) | Scan & Unlock | NFC scan untuk buka rak |
| 4 | Clock | Riwayat | Histori peminjaman |
| 5 | Profile | Profil | Akun, denda, pengaturan |

#### 2.4.2 Detail Halaman Mobile App

##### A. Halaman Login/Authentication
- **Field:** Email (institusi), Password
- **Tombol:** Login, Lupa Password
- **Validasi:** Format email, autentikasi via Firebase Auth
- **Error Handling:** Pesan error yang jelas (kredensial salah, akun suspended, dll.)
- **State Loading:** Spinner saat proses autentikasi

##### B. Halaman Beranda (Home)
**Komponen yang ditampilkan:**
- **Header:** Sapaan personal ("Selamat Datang, [Nama]") + avatar inisial
- **Search Bar:** "Cari buku apa nih?" — search global
- **Card Peminjaman Aktif:**
  - Jumlah buku dipinjam (e.g., "2 Buku")
  - Persentase terbaca (e.g., "-52%")
  - Hari tersisa (e.g., "2 hari")
  - Total denda saat ini (e.g., "Rp 0")
- **Section "Sedang Dibaca":**
  - List buku yang dipinjam aktif
  - Per item: ikon buku, judul, penulis, sisa hari, progress bar
- **Section "Kategori":** Quick filter kategori (chips/buttons)

##### C. Halaman Katalog (Catalog)
**Komponen yang ditampilkan:**
- **Header:** "Katalog Buku"
- **Search Bar:** "Cari judul atau penulis..."
- **Filter Icon:** Filter advanced (kategori, ketersediaan, rak)
- **List Buku:** Setiap item menampilkan:
  - Ikon/cover buku
  - Judul buku
  - Penulis
  - Lokasi rak (e.g., "Rak A1")
  - Kategori (e.g., "Software")
  - Status badge: `Tersedia` (hijau) / `Dipinjam` (orange/merah)
- **Tap pada item:** Navigasi ke halaman detail buku

##### D. Halaman Detail Buku (Book Detail)
**Komponen yang harus ada:**
- Cover buku (besar)
- Judul, penulis, ISBN, kategori
- Status ketersediaan real-time
- Deskripsi singkat
- Lokasi rak fisik
- Rating (jika ada)
- Tombol: "Pinjam Sekarang" (jika tersedia) → memicu flow scan NFC

##### E. Halaman Kategori (Category Browse)
**Komponen yang ditampilkan:**
- **Header:** "Kategori"
- **Tabs Kategori:** Software, Algoritma, Database, dll. (chip-style)
- **Section "Rekomendasi Untukmu":**
  - Card horizontal scroll
  - Per card: ikon, judul, penulis, rating bintang, status
- **Section "Baru Dikembalikan":**
  - List vertical
  - Per item: judul, penulis, "X hari lalu"

##### F. Halaman Scan & Unlock (NFC)
**Dua state utama:**

**State 1 — Pre-Scan:**
- Header: "Peminjaman Buku" / "Scan & Unlock"
- Subtitle: "Tempelkan NFC untuk membuka rak buku"
- Animasi NFC icon (idle/pulsing)
- Tombol besar: "Mulai Scan NFC"
- Section "Cara Penggunaan":
  1. Pilih buku dari katalog
  2. Tekan Mulai Scan NFC
  3. Tempelkan HP ke tag rak

**State 2 — Scan Success:**
- Icon checkmark hijau (besar, dalam circle)
- Pesan: "🔓 Rak Terbuka!"
- Subtitle: "Rak A1 berhasil dibuka. Silakan ambil atau kembalikan buku Anda dalam 30 detik."
- Badge info: "SHELF-A1 | Unlocked"
- Link: "Scan lagi"
- Countdown timer 30 detik
- Section "Cara Penggunaan" tetap visible

**State Lain yang harus ditangani:**
- Scanning in progress (loading)
- Error: NFC tidak tersedia di device
- Error: Tag tidak dikenali
- Error: Akses ditolak (e.g., ada tunggakan denda)

##### G. Halaman Riwayat Peminjaman (History)
**Komponen yang ditampilkan:**
- **Header:** "Riwayat Peminjaman"
- **List Transaksi:** Setiap item menampilkan:
  - Icon arah (↗ untuk pinjam, ↙ untuk kembali)
  - Judul buku
  - Transaction ID (e.g., "TXN-0847")
  - Tanggal (e.g., "12 Apr 2026")
  - Badge status: `Pinjam` / `Kembali` (warna berbeda)
  - Icon detail (info circle)
- **Tap item:** Detail transaksi (durasi pinjam, denda jika ada, dll.)

##### H. Halaman Profil (Profile)
**Komponen yang ditampilkan:**
- **Card Profil Atas:**
  - Avatar inisial (e.g., "MF")
  - Nama lengkap (e.g., "Muhammad Farhan")
  - Email institusi
  - Badge status: `Active` / `Warned` / `Suspended`
- **Stats Cards (3 kolom):**
  - Buku Dipinjam (total): e.g., "3"
  - Member Sejak: e.g., "Jan 2024"
  - Total Denda: e.g., "Rp 5K"
- **Menu List:**
  - Edit Profil (>)
  - Riwayat Denda (>)
  - Bantuan (>)
  - Keluar (logout — warna merah)

### 2.5 Notifikasi & Reminder
- **H-3 sebelum jatuh tempo:** Push notification pengingat
- **H-1 sebelum jatuh tempo:** Push notification urgent
- **Saat jatuh tempo:** Notifikasi dengan info denda mulai berjalan
- **Notifikasi denda:** Update jika ada penambahan denda
- **Notifikasi sistem:** Buku baru ditambahkan, akun di-suspend, dll.

### 2.6 Visual Design
**Lihat `DESIGN.md` untuk color palette, typography, dan component patterns lengkap.**

Ringkasan:
- Background utama: putih/light gray (clean, minimalist)
- Primary blue untuk CTA dan card peminjaman aktif
- Status warna: hijau (tersedia/sukses), orange (dipinjam/warning), merah (overdue/error)
- Tipografi: platform default (SF Pro / Roboto)

### 2.7 State Management & Data
- **Real-time Sync:** Firebase Realtime Database listeners untuk update status buku
- **Offline Mode:** Cache katalog & riwayat lokal (Hive) untuk display saat offline
- **Optimistic UI:** Update UI dulu, sync ke server kemudian
- **Loading States:** Skeleton loaders untuk semua list
- **Empty States:** Pesan informatif untuk list kosong (e.g., "Belum ada peminjaman")

---

## 3. WEB DASHBOARD (ADMIN) — KEBUTUHAN FRONT-END

### 3.1 Tech Stack (LOCKED)
- **Framework:** Next.js (React) — App Router
- **Styling:** Tailwind CSS
- **State management:** Zustand atau React Context (no Redux unless explicitly requested)
- **Data fetching:** React Query (TanStack Query) atau SWR
- **Charts:** Recharts
- **Icons:** Lucide React (`lucide-react`)
- **Firebase SDK:** `firebase` (web) — Auth, Realtime Database
- **Real-time Updates:** Firebase listeners untuk shelf status, transactions feed
- **Auth:** Firebase Auth dengan role-based access (Chief Librarian, Staff)
- **Target browser:** Chrome, Firefox, Safari, Edge (modern versions)
- **Resolusi minimum:** 1280x720 (desktop-first)

### 3.2 Aktor Utama
**Admin / Chief Librarian** — pengelola sistem yang bertanggung jawab atas inventaris, anggota, dan operasional rak.

### 3.3 Use Case Web Dashboard
1. **Mengautentikasi pengguna (Admin)**
2. **Memantau inventori & mengawasi status rak**
3. **Manajemen anggota** (CRUD)
4. **Memantau transaksi seluruh anggota**
5. **Membuat laporan statistik penggunaan**
6. **Mengelola data buku** (CRUD)

### 3.4 Struktur Layout & Navigasi

#### 3.4.1 Layout Global
```
┌─────────────────────────────────────────────────┐
│  [Sidebar]          │  [Main Content Area]      │
│                     │                            │
│  RackGuard Logo     │  [Header / Breadcrumb]    │
│  ADMIN DASHBOARD    │                            │
│                     │  [Page Content]            │
│  MANAGEMENT         │                            │
│  - Dashboard        │                            │
│  - Inventory        │                            │
│  - Members          │                            │
│  - Transactions     │                            │
│  - Reports          │                            │
│                     │                            │
│  SYSTEM             │                            │
│  - Shelf Status     │                            │
│  - Settings         │                            │
│                     │                            │
│  [User Avatar]      │                            │
│  Admin              │                            │
│  Chief Librarian    │                            │
└─────────────────────────────────────────────────┘
```

#### 3.4.2 Sidebar Navigation
**Section "MANAGEMENT":**
- Dashboard
- Inventory
- Members
- Transactions
- Reports

**Section "SYSTEM":**
- Shelf Status
- Settings

**Footer Sidebar:**
- Avatar + Nama Admin + Role
- Icon Logout

### 3.5 Detail Halaman Web Dashboard

#### 3.5.1 Halaman Dashboard (Overview)
**Section "Overview" — KPI Cards (4 cards horizontal):**
| Card | Metric | Indikator |
|------|--------|-----------|
| Total Books | e.g., 14,548 | "+124 this month" |
| Active Members | e.g., 2,341 | "+58 this week" |
| In Circulation | e.g., 341 | "18 due today" |
| Overdue Items | e.g., 7 (warna merah) | "3 critical" |

**Section "Weekly Activity":**
- Line chart: Borrowings vs Returns (Mon-Sun)
- Trend indicator: "+12% this week"

**Section "Shelf Status" (sidebar kanan):**
- List rak dengan progress bar kapasitas
- Per item: Nama rak (Rack A-1, A-2, B-1, dst.) + capacity (e.g., 48/50)

**Section "Recent Activity":**
- Tabel transaksi terbaru
- Kolom: ID, Book, Member, Action (Borrowed/Returned/Overdue), Time
- Link "View all"

#### 3.5.2 Halaman Inventory (Book Management)
**Header:** "Inventory" + tombol "+ Add Book"
**Search Bar:** "Search by title, author, ISBN, or RFID..."
**Filter:** Dropdown filter

**Tabel Buku — Kolom:**
| ID | TITLE | AUTHOR | RACK | RFID | STATUS |
|----|-------|--------|------|------|--------|
| BK-001 | Clean Code | Robert C. Martin | A-1 | RFID-0421 | • Available |
| BK-002 | Design Patterns | Gang of Four | A-2 | RFID-0422 | • Borrowed |
| BK-003 | Introduction to Algorithms | Thomas H. Cormen | B-1 | RFID-0423 | • Overdue |

**Status Badges:**
- `Available` — hijau
- `Borrowed` — orange/kuning
- `Overdue` — merah

**Aksi per row:** Edit, Delete, View Details (CRUD)

**Modal Add/Edit Book:**
- Field: Title, Author, ISBN, Category, Rack Location, RFID Tag
- Tombol: Save, Cancel

#### 3.5.3 Halaman Members (Member Management)
**Header:** "Members" + tombol "+ Add Member"
**Search Bar:** "Search members..."

**Layout:** Grid card (3 kolom)
**Per Card:**
- Avatar inisial (warna berbeda per member, deterministic hash)
- Nama lengkap
- Email institusi
- Badge status: `Active` (hijau) / `Warned` (kuning) / `Suspended` (merah)
- Stats: "X books borrowed"
- Membership: "Since [Month Year]"

**Aksi:** Click card → detail member, edit, suspend/activate

#### 3.5.4 Halaman Transactions (Circulation Ledger)
**Header:** "Transactions" + tombol "Export"
**Search Bar:** "Search transactions..."
**Filter:** Date range, status, type

**Tabel — Kolom:**
| ID | TYPE | BOOK | MEMBER | DATE | DUE | FINE | STATUS |
|----|------|------|--------|------|-----|------|--------|
| TX-1001 | ↗ Borrow | Clean Code | M. Farhan | 2024-04-15 | 2024-04-29 | — | • Active |
| TX-1000 | ↙ Return | Design Patterns | A. Rizky | 2024-04-14 | 2024-04-28 | — | • Completed |
| TX-0999 | ↗ Borrow | Introduction to Algorithms | S. Putri | 2024-03-20 | 2024-04-03 | Rp 15.000 | • Overdue |

**Status Badges:**
- `Active` — biru
- `Completed` — hijau
- `Overdue` — merah

**Type Indicators:**
- `Borrow` — ikon panah keluar
- `Return` — ikon panah masuk

#### 3.5.5 Halaman Reports (Analytics)
**Header:** "Reports" + tombol "Export PDF"

**Section KPI Cards (4 cards):**
| Metric | Value | Trend |
|--------|-------|-------|
| Total Borrowings | 855 | +15% vs last month |
| Unique Visitors | 419 | +8% vs last month |
| Avg Return Time | 11.2d | -2.1d vs last month |
| Total Fines Collected | Rp 425K | +22% vs last month |

**Section "Monthly Borrowings vs Returns":**
- Bar chart per bulan (Jan, Feb, Mar, Apr) — Recharts

**Section "Popular Categories":**
- Donut chart (Recharts)
- Computer Science (42%), Mathematics (22%), Engineering (18%), Literature (12%), Others (6%)

**Section "Daily Active Visitors":**
- Line chart 30 hari terakhir (Recharts)

#### 3.5.6 Halaman Shelf Status (IoT Monitoring)
**Header:** "Shelf Status"
**Subtitle:** "IoT Monitoring"

**Layout:** Grid card (3 kolom)
**Per Card Rak:**
- **Header:** Nama rak (e.g., "Rack A-1") + lokasi (e.g., "Floor 1, Aisle A")
- **Status Connectivity:** Badge `online` (hijau) / `offline` (merah)
- **Capacity:**
  - Label: "Capacity"
  - Fill bar visual + angka (e.g., "48/50")
- **Status Indicators (3 ikon di bawah):**
  - Lock Status: `LOCKED` / `UNLOCKED`
  - Last Update: e.g., "2 MIN AGO" / "JUST NOW"

**Visual State:**
- Online & Locked: normal (default styling)
- Offline: card di-dim, badge merah
- Unlocked: highlight (e.g., warna khusus)
- Capacity hampir penuh (>90%): warning indicator

#### 3.5.7 Halaman Settings
**Sections yang dibutuhkan:**
- General Settings (nama perpustakaan, alamat, kontak)
- Loan Configuration (durasi peminjaman default, max books per member)
- Fine Configuration (rate denda per hari, grace period)
- Notification Settings (template H-3, H-1, overdue)
- Admin Account Management
- IoT Device Configuration (registrasi rak baru, firmware version)

### 3.6 Visual Design
**Lihat `DESIGN.md` untuk color palette, typography, dan component patterns lengkap.**

Ringkasan:
- Sidebar: dark navy (`#1A1F2E`) dengan teks putih
- Main content: light gray background (`#F5F7FA`), card putih
- Charts: multi-color palette (sesuai DESIGN.md)
- Tipografi: Inter

### 3.7 Interaksi & Behavior Web
- **Real-time Updates:** Status rak harus auto-refresh tanpa reload page (Firebase listeners)
- **Notifikasi In-App:** Toast/snackbar untuk action success/error
- **Modal Confirmations:** Untuk aksi destructive (delete book, suspend member)
- **Pagination/Infinite Scroll:** Untuk tabel besar (transactions, inventory)
- **Sorting & Filtering:** Pada semua tabel
- **Search Debouncing:** Untuk search input (300ms)
- **Loading States:** Skeleton loaders untuk tabel & card
- **Empty States:** Ilustrasi + CTA untuk list kosong
- **Error Handling:** Error boundary + retry mechanism
- **Export Functionality:** PDF export untuk reports, CSV export untuk transactions

---

## 4. INTEGRASI FRONT-END DENGAN BACKEND (FIREBASE)

> **Note:** Backend RackGuard menggunakan Firebase. Tidak ada custom backend server (Go/Node) dalam scope MVP. Semua interaksi adalah:
> 1. Firebase SDK calls langsung (Auth, Realtime Database)
> 2. Cloud Functions untuk logika sensitif (fine calculation, lock authorization)

### 4.1 Firebase Realtime Database — Struktur Data

```
rackguard-db/
├── users/
│   └── {userId}/
│       ├── name, email, avatar, status
│       ├── memberSince, totalBorrowed, currentBorrowed, totalFines
├── books/
│   └── {bookId}/  // BK-XXX
│       ├── title, author, isbn, category
│       ├── rackLocation, rfidTag, status, coverUrl, description
├── transactions/
│   └── {transactionId}/  // TX-XXXX
│       ├── type, bookId, bookTitle, memberId, memberName
│       ├── borrowDate, dueDate, returnDate, fine, status
├── shelves/
│   └── {shelfId}/  // RACK-A-1
│       ├── name, location
│       ├── capacity: { current, max }
│       ├── lockStatus, connectivity, lastUpdate
└── notifications/
    └── {userId}/
        └── {notificationId}/
            ├── type, title, message, read, createdAt
```

### 4.2 Cloud Functions Endpoints (Callable Functions)

| Function | Caller | Purpose |
|----------|--------|---------|
| `requestUnlock` | Mobile | Validate user (auth + no outstanding fines) → trigger shelf unlock signal |
| `calculateFine` | System (scheduled) | Daily job to recalculate fines for overdue transactions |
| `addBook` | Web (admin) | Validates RFID uniqueness, writes book record |
| `updateMemberStatus` | Web (admin) | Suspend/activate member with audit log |
| `exportReport` | Web (admin) | Generate PDF/CSV report and return download URL |

### 4.3 Real-time Listeners (Frontend Subscribes)

| Path | Subscriber | Purpose |
|------|-----------|---------|
| `shelves/` | Web admin | Live status of all shelves on Shelf Status & Dashboard pages |
| `books/{bookId}` | Mobile | Live status when viewing book detail |
| `transactions/` (filtered by userId) | Mobile | User's active transactions |
| `transactions/` (live feed) | Web admin | Recent activity on Dashboard |
| `notifications/{userId}` | Mobile | User notifications |

### 4.4 Data Models (TypeScript / Dart)

#### User / Member
```typescript
interface Member {
  id: string;
  name: string;
  email: string;
  avatar?: string;  // initials or URL
  status: 'active' | 'warned' | 'suspended';
  memberSince: string;  // ISO date
  totalBorrowed: number;
  currentBorrowed: number;
  totalFines: number;
}
```

#### Book
```typescript
interface Book {
  id: string;  // BK-XXX
  title: string;
  author: string;
  isbn: string;
  category: string;
  rackLocation: string;  // e.g., "A-1"
  rfidTag: string;  // RFID-XXXX
  status: 'available' | 'borrowed' | 'overdue';
  coverUrl?: string;
  description?: string;
}
```

#### Transaction
```typescript
interface Transaction {
  id: string;  // TX-XXXX
  type: 'borrow' | 'return';
  bookId: string;
  bookTitle: string;
  memberId: string;
  memberName: string;
  borrowDate: string;
  dueDate: string;
  returnDate: string | null;
  fine: number;
  status: 'active' | 'completed' | 'overdue';
}
```

#### Shelf
```typescript
interface Shelf {
  id: string;  // RACK-A-1
  name: string;
  location: string;
  capacity: { current: number; max: number };
  lockStatus: 'locked' | 'unlocked';
  connectivity: 'online' | 'offline';
  lastUpdate: number;  // timestamp ms
}
```

#### Notification
```typescript
interface Notification {
  id: string;
  userId: string;
  type: 'reminder' | 'overdue' | 'fine' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: number;  // timestamp ms
}
```

---

## 5. KEBUTUHAN NON-FUNGSIONAL FRONT-END

### 5.1 Performance
- **Mobile App (Flutter):**
  - Initial load < 3 detik
  - Katalog loading < 5 detik
  - Scan response < 1 detik
  - Smooth 60fps animations
- **Web Dashboard (Next.js):**
  - First Contentful Paint < 1.5 detik
  - Time to Interactive < 3 detik
  - Tabel render 100 row < 500ms

### 5.2 Accessibility (a11y)
- WCAG 2.1 Level AA compliance
- Keyboard navigation (web)
- Screen reader support
- Contrast ratio minimal 4.5:1
- Focus indicators yang jelas
- Alt text untuk semua gambar
- Status conveyed by both color AND text/icon (never color alone)

### 5.3 Responsive Design
- **Mobile App:** Optimal di 360px–428px width
- **Web Dashboard:** Desktop-first, minimal support 1280px

### 5.4 Security (Front-End Considerations)
- Firebase ID token disimpan di secure storage (Keychain iOS / Keystore Android via flutter_secure_storage)
- HTTPS only
- XSS protection (sanitize semua user input — gunakan React's default escaping)
- Auto logout setelah idle (e.g., 30 menit untuk admin)
- Tidak menyimpan password di local storage
- Firebase Security Rules harus restrict akses sesuai role

### 5.5 Internationalization (i18n)
- **MVP scope:** Bahasa Indonesia saja
- Format tanggal lokal (DD/MM/YYYY)
- Format mata uang Rupiah (Rp X.XXX)
- English/multi-bahasa: out of scope (lihat Scope Guard di CLAUDE.md)

### 5.6 Offline Support (Mobile)
- Cache katalog buku terakhir dilihat (Hive)
- Cache profil & riwayat user
- Queue actions saat offline (e.g., scan request) — execute saat online kembali
- Sinkronisasi otomatis saat online kembali (Firebase handles this for listeners)
- Indikator visual status koneksi

### 5.7 Error Handling
- **User-friendly error messages** (bukan stack trace)
- **Retry mechanism** untuk network errors
- **Fallback UI** untuk crash component (React Error Boundary, Flutter ErrorWidget)
- **Logging** error ke service (e.g., Firebase Crashlytics, Sentry)
- **Graceful degradation** saat fitur tidak tersedia (e.g., NFC tidak ada)

---

## 6. USER FLOW UTAMA

### 6.1 Flow Mobile App: Meminjam Buku
```
1. User buka app → Login (Firebase Auth)
2. Browse katalog → Pilih buku tersedia
3. Tap "Pinjam Sekarang"
4. App arahkan ke halaman Scan & Unlock
5. User tempel HP ke tag NFC pada rak
6. App call Cloud Function `requestUnlock` (validate auth + cek tunggakan)
7. Jika valid: Cloud Function trigger ESP32 → Solenoid unlock
8. Status berubah ke "Rak Terbuka" di UI
9. User ambil buku (RFID auto-detect oleh hardware)
10. Tutup pintu rak → Solenoid lock kembali
11. Status buku update real-time di app & cloud (Firebase listener)
12. Konfirmasi peminjaman + due date di app
```

### 6.2 Flow Mobile App: Mengembalikan Buku
```
1. User buka app → Tap Scan & Unlock
2. Tempel HP ke tag NFC rak
3. App call Cloud Function `requestUnlock`
4. Solenoid unlock
5. User letakkan buku di rak (RFID auto-detect)
6. Tutup pintu → Solenoid lock
7. Cloud Function update status buku ke "Available"
8. Cloud Function `calculateFine` hitung denda jika overdue
9. App tampilkan konfirmasi pengembalian + invoice denda (jika ada)
```

### 6.3 Flow Web Dashboard: Admin Memantau Operasional
```
1. Admin login (Firebase Auth, role check) → Dashboard Overview
2. Cek KPI cards (overdue items, in circulation)
3. Lihat Recent Activity → klik transaksi mencurigakan
4. Cek Shelf Status → verifikasi semua rak online (Firebase listener live)
5. Buka Reports → analisis tren bulanan
6. Export PDF report untuk meeting (via Cloud Function `exportReport`)
```

### 6.4 Flow Web Dashboard: Admin Mengelola Buku Baru
```
1. Admin → Inventory → Klik "+ Add Book"
2. Modal terbuka → isi form (title, author, ISBN, dll.)
3. Assign RFID tag & rack location
4. Submit → Cloud Function `addBook` (validates RFID uniqueness)
5. Buku muncul di tabel via Firebase listener
6. RFID tag fisik ditempel → ESP32 auto-detect saat buku ditaruh di rak
```

---

## 7. CHECKLIST FRONT-END DEVELOPMENT

### 7.1 Mobile App Checklist (Flutter)
- [ ] Setup Flutter project + Firebase config (google-services.json, GoogleService-Info.plist)
- [ ] Authentication flow (login, logout, forgot password) via Firebase Auth
- [ ] Bottom navigation 5-tab (with elevated center Scan tab)
- [ ] Halaman Beranda dengan card peminjaman aktif
- [ ] Halaman Katalog dengan search & filter
- [ ] Halaman Detail Buku
- [ ] Halaman Kategori dengan rekomendasi
- [ ] Halaman Scan & Unlock dengan integrasi NFC (`nfc_manager`)
- [ ] Halaman Riwayat Peminjaman
- [ ] Halaman Profil dengan stats
- [ ] Push Notification setup (FCM)
- [ ] Real-time sync dengan Firebase Realtime Database
- [ ] Offline mode & caching (Hive)
- [ ] Error handling & loading states
- [ ] Testing di Android 8+ & iOS 13+

### 7.2 Web Dashboard Checklist (Next.js)
- [ ] Setup Next.js project (App Router) + Tailwind CSS
- [ ] Firebase SDK setup (Auth + Realtime DB)
- [ ] Authentication & role-based access (Chief Librarian)
- [ ] Layout dengan sidebar (dark) & main content
- [ ] Halaman Dashboard dengan KPI cards & charts (Recharts)
- [ ] Halaman Inventory dengan CRUD buku
- [ ] Halaman Members dengan grid card
- [ ] Halaman Transactions dengan tabel & filter
- [ ] Halaman Reports dengan charts & export PDF
- [ ] Halaman Shelf Status dengan real-time IoT data
- [ ] Halaman Settings
- [ ] Modal components (Add/Edit/Delete confirmations)
- [ ] Toast notifications
- [ ] Search & filter di semua tabel
- [ ] Pagination
- [ ] Real-time updates (Firebase listeners)
- [ ] Responsive design (desktop minimum 1280px)
- [ ] Cross-browser testing

---

## 8. REFERENSI DESIGN ASSETS

### 8.1 Asset yang Perlu Disiapkan
- Logo RackGuard (SVG, PNG dengan berbagai ukuran)
- Icon set: Lucide React (web), Material Icons (mobile)
- Ilustrasi empty states (no books, no transactions, no members)
- Avatar placeholder (inisial-based generator)
- Loading spinners & skeleton components
- Onboarding screens (mobile)
- App store screenshots (mobile)

### 8.2 Tools yang Digunakan (Locked)
| Layer | Web | Mobile |
|-------|-----|--------|
| Framework | Next.js (App Router) | Flutter |
| Styling | Tailwind CSS | Flutter Theme |
| State | Zustand / React Context | Provider / Riverpod |
| Data fetching | React Query / SWR | Dio + Repository pattern |
| Forms | React Hook Form | flutter_form_builder |
| Charts | Recharts | fl_chart |
| Icons | lucide-react | Material/Cupertino Icons |
| HTTP | fetch + React Query | Dio |
| Firebase | `firebase` JS SDK | `firebase_*` Flutter packages |

### 8.3 Design Handoff
- Figma untuk mockup & spec (jika ada)
- Komponen di-reference dari `DESIGN.md`
- Color palette, typography, dan spacing semua di `DESIGN.md`

---

## 9. CATATAN PENTING UNTUK TIM FRONT-END

1. **Real-time adalah fitur kritis** — Status buku & rak harus selalu up-to-date dalam <5 detik. Gunakan Firebase Realtime Database listeners dengan benar (jangan fallback ke polling).

2. **NFC adalah fitur unik mobile** — Pastikan testing di device fisik (bukan emulator). Handle gracefully jika device tidak support NFC (tampilkan pesan, jangan crash).

3. **Akurasi data adalah prioritas** — Hindari race conditions saat update status. Gunakan optimistic UI dengan rollback jika gagal. Untuk operasi sensitif (unlock, fine calc), selalu via Cloud Functions.

4. **UX harus intuitif** — Target pengguna adalah mahasiswa/komunitas yang tidak technical. Hindari jargon teknis di UI.

5. **Performance di low-end device** — Mobile app harus tetap smooth di Android entry-level (RAM 2GB). Hindari rebuild widget yang tidak perlu di Flutter.

6. **Security first** — Firebase ID token di secure storage, HTTPS only, input sanitization. Firebase Security Rules harus benar (jangan rely on client-side validation only).

7. **Konsistensi cross-platform** — Status vocabulary, color semantics, dan terminology harus identik antara mobile dan web. Lihat `DESIGN.md` dan section 1.3 di doc ini.

8. **Accessibility** — Jangan lupakan a11y, terutama untuk web dashboard yang akan digunakan admin dalam waktu lama.

9. **Tracking & Analytics** — Implementasikan event tracking via Firebase Analytics untuk monitor usage (e.g., berapa kali fitur scan dipakai, halaman terpopuler).

10. **Iteratif & feedback-driven** — Lakukan user testing di setiap milestone development.

11. **Ikuti CLAUDE.md** — Untuk behavioral guidelines saat coding (think before coding, simplicity, surgical changes, goal-driven). Untuk visual rules, ikuti `DESIGN.md`.

12. **Scope discipline** — Lihat Scope Guard di `CLAUDE.md`. Jangan implement fitur di luar spec ini tanpa request eksplisit (e.g., no payment gateway, no multi-library, no IoT firmware code).

---

## 10. CATATAN PENTING UNTUK Firebase

project id: rackguard-project
project name: rackguard-Project

**End of Document**

*Dokumen ini disusun berdasarkan Deliverable 1 (Concept Definition) dan Deliverable 2 (Advanced Development) sistem RackGuard. Untuk update spesifikasi atau klarifikasi, hubungi Kelompok 01.*

*Companion docs:*
- `CLAUDE.md` — Behavioral guidelines untuk LLM coding assistants
- `DESIGN.md` — Visual design tokens dan component patterns
