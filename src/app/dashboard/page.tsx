'use client'

import { useEffect, useState } from 'react'
import { ref, onValue } from 'firebase/database'
import { database, isFirebaseConfigured } from '@/lib/firebase'
import { Book, Transaction, Member, Shelf } from '@/types'
import KPICard from '@/components/KPICard'
import StatusBadge from '@/components/StatusBadge'
import { KPICardSkeleton, TableSkeleton } from '@/components/SkeletonLoader'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { BookOpen, Users, ArrowLeftRight, AlertTriangle } from 'lucide-react'

// Day labels indexed by JS getDay() (0=Sun … 6=Sat), reordered Mon–Sun for display
const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
// JS day index → display slot (Mon=0 … Sun=6)
const JS_DAY_TO_SLOT: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 }

function buildWeeklyData(transactions: Transaction[]) {
  const counts = DAY_LABELS.map((day) => ({ day, peminjaman: 0, pengembalian: 0 }))

  // Get Monday of the current week
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  for (const tx of transactions) {
    if (tx.borrowDate) {
      const d = new Date(tx.borrowDate)
      if (d >= monday && d <= sunday) {
        counts[JS_DAY_TO_SLOT[d.getDay()]].peminjaman++
      }
    }
    if (tx.returnDate) {
      const d = new Date(tx.returnDate)
      if (d >= monday && d <= sunday) {
        counts[JS_DAY_TO_SLOT[d.getDay()]].pengembalian++
      }
    }
  }

  return counts
}

export default function DashboardPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [shelves, setShelves] = useState<Shelf[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isFirebaseConfigured || !database) {
      setLoading(false)
      return
    }

    const unsubs: Array<() => void> = []

    const listen = <T,>(
      path: string,
      setter: React.Dispatch<React.SetStateAction<T[]>>
    ) => {
      const unsubscribe = onValue(
        ref(database, path),
        (snap) => {
          if (snap.exists()) {
            const data = snap.val() as Record<string, Omit<T, 'id'>>
            setter(
              Object.entries(data).map(([id, val]) => ({ id, ...val } as T))
            )
          } else {
            setter([])
          }
        },
        () => setter([])
      )
      unsubs.push(unsubscribe)
    }

    listen<Book>('books', setBooks)
    listen<Member>('users', setMembers)
    listen<Transaction>('transactions', setTransactions)
    listen<Shelf>('shelves', setShelves)

    // Mark loading done after a short wait for first batch
    const t = setTimeout(() => setLoading(false), 800)
    unsubs.push(() => clearTimeout(t))

    return () => unsubs.forEach((u) => u())
  }, [])

  // KPI calculations
  const totalBooks = books.length
  const activeMembers = members.filter((m) => m.status === 'active').length
  const inCirculation = books.filter((b) => b.status === 'borrowed').length
  const overdueItems = transactions.filter((t) => t.status === 'overdue').length

  const today = new Date().toISOString().split('T')[0]
  const dueToday = transactions.filter(
    (t) => t.status === 'active' && t.dueDate === today
  ).length
  // "critical" = overdue with accumulated fine > 5000 (5+ days)
  const criticalCount = transactions.filter(
    (t) => t.status === 'overdue' && t.fine > 5000
  ).length

  const weeklyData = buildWeeklyData(transactions)

  // Recent transactions (last 5)
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.borrowDate).getTime() - new Date(a.borrowDate).getTime())
    .slice(0, 5)

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
        <TableSkeleton rows={5} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Selamat datang di RackGuard Admin</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          title="Total Buku"
          value={totalBooks}
          icon={BookOpen}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          subtitle="Seluruh koleksi"
        />
        <KPICard
          title="Anggota Aktif"
          value={activeMembers}
          icon={Users}
          iconColor="text-green-600"
          iconBg="bg-green-50"
          subtitle="Status aktif"
        />
        <KPICard
          title="Sedang Dipinjam"
          value={inCirculation}
          icon={ArrowLeftRight}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
          subtitle={dueToday > 0 ? `${dueToday} jatuh tempo hari ini` : 'Buku di luar rak'}
        />
        <KPICard
          title="Terlambat"
          value={overdueItems}
          icon={AlertTriangle}
          iconColor="text-red-600"
          iconBg="bg-red-50"
          subtitle={criticalCount > 0 ? `${criticalCount} denda tinggi` : 'Perlu tindakan'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Weekly Activity Chart */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Aktivitas Mingguan
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={weeklyData} margin={{ top: 4, right: 16, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  fontSize: 12,
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                formatter={(value) =>
                  value === 'peminjaman' ? 'Peminjaman' : 'Pengembalian'
                }
              />
              <Line
                type="monotone"
                dataKey="peminjaman"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="pengembalian"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Shelf Status Sidebar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Status Rak</h2>
          {shelves.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              Tidak ada rak terdaftar
            </p>
          ) : (
            <div className="space-y-4 overflow-y-auto max-h-56">
              {shelves.map((shelf) => {
                const pct = shelf.capacity.max > 0
                  ? Math.round((shelf.capacity.current / shelf.capacity.max) * 100)
                  : 0
                return (
                  <div key={shelf.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {shelf.name}
                      </span>
                      <StatusBadge status={shelf.connectivity} />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-10 text-right">
                        {shelf.capacity.current}/{shelf.capacity.max}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Aktivitas Terbaru</h2>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <ArrowLeftRight className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Belum ada transaksi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Buku
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Anggota
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Waktu
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      {tx.id}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 max-w-[200px] truncate">
                      {tx.bookTitle}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{tx.memberName}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={tx.type} />
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {formatDate(tx.borrowDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
