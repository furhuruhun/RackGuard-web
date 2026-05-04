/**
 * Firebase demo-data seeder
 * Run: node seed-firebase.mjs
 * Requires NEXT_PUBLIC_FIREBASE_* env vars in .env.local
 */
import { readFileSync } from 'fs'
import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set } from 'firebase/database'

// Load .env.local manually
const envFile = readFileSync('.env.local', 'utf8')
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => l.split('=').map(s => s.trim()))
)

const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
}

const app = initializeApp(firebaseConfig)
const db = getDatabase(app)

const now = Date.now()
const day = 86400000

const data = {
  books: {
    'BK-001': { title: 'Clean Code', author: 'Robert C. Martin', isbn: '978-0-13-235088-4', category: 'Software Engineering', rackLocation: 'A-1', rfidTag: 'RFID-0421', status: 'available', description: 'Panduan menulis kode yang bersih dan mudah dipelihara.' },
    'BK-002': { title: 'Design Patterns', author: 'Gang of Four', isbn: '978-0-20-163361-5', category: 'Software Engineering', rackLocation: 'A-2', rfidTag: 'RFID-0422', status: 'borrowed', description: 'Pola desain perangkat lunak yang dapat digunakan kembali.' },
    'BK-003': { title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', isbn: '978-0-26-204630-5', category: 'Algoritma', rackLocation: 'B-1', rfidTag: 'RFID-0423', status: 'overdue', description: 'Buku teks komprehensif tentang algoritma dan struktur data.' },
    'BK-004': { title: 'The Pragmatic Programmer', author: 'Andrew Hunt', isbn: '978-0-13-595705-9', category: 'Software Engineering', rackLocation: 'A-1', rfidTag: 'RFID-0424', status: 'available', description: 'Perjalanan dari journeyman ke master programming.' },
    'BK-005': { title: 'Database System Concepts', author: 'Abraham Silberschatz', isbn: '978-0-07-352332-3', category: 'Database', rackLocation: 'C-1', rfidTag: 'RFID-0425', status: 'available', description: 'Konsep dasar sistem basis data.' },
    'BK-006': { title: 'Computer Networks', author: 'Andrew Tanenbaum', isbn: '978-0-13-212695-3', category: 'Jaringan', rackLocation: 'C-2', rfidTag: 'RFID-0426', status: 'borrowed', description: 'Pengantar komprehensif jaringan komputer.' },
    'BK-007': { title: 'Artificial Intelligence', author: 'Stuart Russell', isbn: '978-0-13-604259-4', category: 'Kecerdasan Buatan', rackLocation: 'B-2', rfidTag: 'RFID-0427', status: 'available', description: 'Pendekatan modern terhadap kecerdasan buatan.' },
    'BK-008': { title: 'Operating System Concepts', author: 'Abraham Silberschatz', isbn: '978-1-11-888293-7', category: 'Sistem Operasi', rackLocation: 'B-1', rfidTag: 'RFID-0428', status: 'available', description: 'Konsep sistem operasi modern.' },
    'BK-009': { title: 'Refactoring', author: 'Martin Fowler', isbn: '978-0-13-468599-1', category: 'Software Engineering', rackLocation: 'A-2', rfidTag: 'RFID-0429', status: 'available', description: 'Meningkatkan desain kode yang sudah ada.' },
    'BK-010': { title: 'Structure and Interpretation of Computer Programs', author: 'Harold Abelson', isbn: '978-0-26-251087-5', category: 'Algoritma', rackLocation: 'B-2', rfidTag: 'RFID-0430', status: 'borrowed', description: 'SICP - buku klasik ilmu komputer.' },
    'BK-011': { title: 'Computer Organization and Design', author: 'David Patterson', isbn: '978-0-12-820331-6', category: 'Arsitektur Komputer', rackLocation: 'C-1', rfidTag: 'RFID-0431', status: 'available', description: 'Antarmuka perangkat keras/perangkat lunak.' },
    'BK-012': { title: 'Cracking the Coding Interview', author: 'Gayle Laakmann McDowell', isbn: '978-0-98-478280-7', category: 'Algoritma', rackLocation: 'A-1', rfidTag: 'RFID-0432', status: 'available', description: '189 pertanyaan dan solusi wawancara pemrograman.' },
  },
  users: {
    'M001': { name: 'Muhammad Farhan', email: 'farhan@student.itb.ac.id', status: 'active', memberSince: '2024-01-15', totalBorrowed: 5, currentBorrowed: 1, totalFines: 0 },
    'M002': { name: 'Anisa Rizky', email: 'anisa@student.itb.ac.id', status: 'active', memberSince: '2024-02-01', totalBorrowed: 8, currentBorrowed: 2, totalFines: 5000 },
    'M003': { name: 'Siti Putri', email: 'siti@student.itb.ac.id', status: 'warned', memberSince: '2023-09-10', totalBorrowed: 12, currentBorrowed: 1, totalFines: 15000 },
    'M004': { name: 'Budi Santoso', email: 'budi@student.itb.ac.id', status: 'active', memberSince: '2024-03-20', totalBorrowed: 3, currentBorrowed: 0, totalFines: 0 },
    'M005': { name: 'Rina Wulandari', email: 'rina@student.itb.ac.id', status: 'active', memberSince: '2023-11-05', totalBorrowed: 6, currentBorrowed: 1, totalFines: 0 },
    'M006': { name: 'Ahmad Fauzi', email: 'ahmad@student.itb.ac.id', status: 'suspended', memberSince: '2023-07-22', totalBorrowed: 15, currentBorrowed: 0, totalFines: 45000 },
  },
  transactions: {
    'TX-1001': { type: 'borrow', bookId: 'BK-002', bookTitle: 'Design Patterns', memberId: 'M001', memberName: 'Muhammad Farhan', borrowDate: new Date(now - 5*day).toISOString().split('T')[0], dueDate: new Date(now + 9*day).toISOString().split('T')[0], returnDate: null, fine: 0, status: 'active' },
    'TX-1002': { type: 'borrow', bookId: 'BK-006', bookTitle: 'Computer Networks', memberId: 'M002', memberName: 'Anisa Rizky', borrowDate: new Date(now - 8*day).toISOString().split('T')[0], dueDate: new Date(now + 6*day).toISOString().split('T')[0], returnDate: null, fine: 0, status: 'active' },
    'TX-1003': { type: 'borrow', bookId: 'BK-003', bookTitle: 'Introduction to Algorithms', memberId: 'M003', memberName: 'Siti Putri', borrowDate: new Date(now - 20*day).toISOString().split('T')[0], dueDate: new Date(now - 6*day).toISOString().split('T')[0], returnDate: null, fine: 15000, status: 'overdue' },
    'TX-1004': { type: 'return', bookId: 'BK-001', bookTitle: 'Clean Code', memberId: 'M002', memberName: 'Anisa Rizky', borrowDate: new Date(now - 18*day).toISOString().split('T')[0], dueDate: new Date(now - 4*day).toISOString().split('T')[0], returnDate: new Date(now - 1*day).toISOString().split('T')[0], fine: 5000, status: 'completed' },
    'TX-1005': { type: 'return', bookId: 'BK-004', bookTitle: 'The Pragmatic Programmer', memberId: 'M004', memberName: 'Budi Santoso', borrowDate: new Date(now - 12*day).toISOString().split('T')[0], dueDate: new Date(now + 2*day).toISOString().split('T')[0], returnDate: new Date(now).toISOString().split('T')[0], fine: 0, status: 'completed' },
    'TX-1006': { type: 'borrow', bookId: 'BK-010', bookTitle: 'SICP', memberId: 'M005', memberName: 'Rina Wulandari', borrowDate: new Date(now - 3*day).toISOString().split('T')[0], dueDate: new Date(now + 11*day).toISOString().split('T')[0], returnDate: null, fine: 0, status: 'active' },
    'TX-0999': { type: 'return', bookId: 'BK-009', bookTitle: 'Refactoring', memberId: 'M001', memberName: 'Muhammad Farhan', borrowDate: new Date(now - 30*day).toISOString().split('T')[0], dueDate: new Date(now - 16*day).toISOString().split('T')[0], returnDate: new Date(now - 14*day).toISOString().split('T')[0], fine: 0, status: 'completed' },
    'TX-0998': { type: 'return', bookId: 'BK-005', bookTitle: 'Database System Concepts', memberId: 'M003', memberName: 'Siti Putri', borrowDate: new Date(now - 45*day).toISOString().split('T')[0], dueDate: new Date(now - 31*day).toISOString().split('T')[0], returnDate: new Date(now - 28*day).toISOString().split('T')[0], fine: 0, status: 'completed' },
  },
  shelves: {
    'RACK-A-1': { name: 'Rak A-1', location: 'Lantai 1, Baris A', capacity: { current: 18, max: 25 }, lockStatus: 'locked', connectivity: 'online', lastUpdate: now - 2*60000 },
    'RACK-A-2': { name: 'Rak A-2', location: 'Lantai 1, Baris A', capacity: { current: 22, max: 25 }, lockStatus: 'locked', connectivity: 'online', lastUpdate: now - 5*60000 },
    'RACK-B-1': { name: 'Rak B-1', location: 'Lantai 1, Baris B', capacity: { current: 12, max: 25 }, lockStatus: 'locked', connectivity: 'online', lastUpdate: now - 1*60000 },
    'RACK-B-2': { name: 'Rak B-2', location: 'Lantai 1, Baris B', capacity: { current: 0, max: 25 }, lockStatus: 'locked', connectivity: 'offline', lastUpdate: now - 60*60000 },
    'RACK-C-1': { name: 'Rak C-1', location: 'Lantai 2, Baris C', capacity: { current: 25, max: 25 }, lockStatus: 'locked', connectivity: 'online', lastUpdate: now - 3*60000 },
    'RACK-C-2': { name: 'Rak C-2', location: 'Lantai 2, Baris C', capacity: { current: 9, max: 25 }, lockStatus: 'locked', connectivity: 'online', lastUpdate: now - 45000 },
  },
  settings: {
    general: { libraryName: 'Perpustakaan RackGuard ITB', address: 'Jl. Ganesha No. 10, Bandung', contact: 'admin@rackguard.id' },
    loan: { defaultLoanDuration: 14, maxBooksPerMember: 3 },
    fine: { fineRatePerDay: 1000, gracePeriod: 1 },
    notification: { notificationTemplate: 'Halo {nama}, buku "{judul}" Anda jatuh tempo pada {tanggal}. Segera kembalikan untuk menghindari denda.' },
  },
}

console.log('Seeding Firebase Realtime Database...')
for (const [path, value] of Object.entries(data)) {
  await set(ref(db, path), value)
  console.log(`  ✓ /${path}`)
}
console.log('Done! Seed data written to Firebase.')
process.exit(0)
