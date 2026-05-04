import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/**
 * Format a number as Indonesian Rupiah: "Rp 1.500"
 */
export function formatCurrency(amount: number): string {
  if (amount === 0) return 'Rp 0'
  return (
    'Rp ' +
    amount.toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  )
}

const MONTH_NAMES_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
]

/**
 * Format a date string or timestamp as "DD MMM YYYY" in Indonesian
 */
export function formatDate(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (isNaN(date.getTime())) return '-'
  const d = date.getDate().toString().padStart(2, '0')
  const m = MONTH_NAMES_ID[date.getMonth()]
  const y = date.getFullYear()
  return `${d} ${m} ${y}`
}

/**
 * Format as "Month Year" in Indonesian, e.g. "Januari 2024"
 */
const FULL_MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]
export function formatMonthYear(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (isNaN(date.getTime())) return '-'
  return `${FULL_MONTH_NAMES_ID[date.getMonth()]} ${date.getFullYear()}`
}

/**
 * Generate a deterministic color from a string (for avatar backgrounds)
 */
const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#06b6d4',
]
export function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

/**
 * Get initials from a name (up to 2 characters)
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Format a relative time label (e.g. "2 menit lalu")
 */
export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  return `${days} hari lalu`
}

/**
 * Translate Firebase Auth error codes to Indonesian messages
 */
export function translateFirebaseError(code: string): string {
  const map: Record<string, string> = {
    'auth/invalid-email': 'Format email tidak valid.',
    'auth/user-disabled': 'Akun ini telah dinonaktifkan.',
    'auth/user-not-found': 'Email tidak terdaftar.',
    'auth/wrong-password': 'Password salah.',
    'auth/invalid-credential': 'Email atau password salah.',
    'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi nanti.',
    'auth/network-request-failed': 'Koneksi jaringan gagal. Periksa koneksi internet Anda.',
  }
  return map[code] ?? 'Terjadi kesalahan. Silakan coba lagi.'
}

/**
 * Export data as CSV and trigger browser download
 */
export function exportCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return
  const headers = Object.keys(data[0])
  const rows = data.map((row) =>
    headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
