'use client'

import { useEffect, useState } from 'react'
import KPICard from '@/components/KPICard'
import { KPICardSkeleton } from '@/components/SkeletonLoader'
import { formatCurrency } from '@/lib/utils'
import { Printer, BookOpen, Users, Clock, AlertTriangle, Hourglass } from 'lucide-react'
import { database, isFirebaseConfigured } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import type { Transaction, Book } from '@/types'

const CATEGORY_COLORS = [
  '#3b82f6', '#22c55e', '#f97316', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f59e0b', '#6366f1',
]

const MONTH_LABELS: Record<number, string> = {
  1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr',
  5: 'Mei', 6: 'Jun', 7: 'Jul', 8: 'Agt',
  9: 'Sep', 10: 'Okt', 11: 'Nov', 12: 'Des',
}

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? null : d
}

interface ReportStats {
  totalTransactions: number
  uniqueMembers: number
  avgReturnDays: number | null
  totalFines: number
  pendingPayments: number
  monthlyData: { month: string; peminjaman: number; pengembalian: number }[]
  categoryData: { name: string; value: number; color: string }[]
  dailyData: { day: string; transaksi: number }[]
}

function computeStats(
  transactions: Record<string, Transaction>,
  books: Record<string, Book>,
): ReportStats {
  const txList = Object.values(transactions)
  const bookList = Object.values(books)

  // Total transactions
  const totalTransactions = txList.length

  // Unique members
  const memberIds = new Set(txList.map((t) => t.memberId))
  const uniqueMembers = memberIds.size

  // Average return time (only completed transactions with both dates)
  const returnDurations: number[] = []
  for (const tx of txList) {
    if (tx.status === 'completed' && tx.returnDate && tx.borrowDate) {
      const borrow = parseDate(tx.borrowDate)
      const ret = parseDate(tx.returnDate)
      if (borrow && ret) {
        const days = (ret.getTime() - borrow.getTime()) / (1000 * 60 * 60 * 24)
        if (days >= 0) returnDurations.push(days)
      }
    }
  }
  const avgReturnDays =
    returnDurations.length > 0
      ? returnDurations.reduce((a, b) => a + b, 0) / returnDurations.length
      : null

  // Total fines — only from transactions with paymentStatus === 'success'
  const totalFines = txList
    .filter((t) => t.paymentStatus === 'success')
    .reduce((sum, t) => sum + (t.fine ?? 0), 0)

  // Pending payments count
  const pendingPayments = txList.filter((t) => t.paymentStatus === 'pending').length

  // Monthly borrowings & returns — group by month of borrowDate / returnDate
  // Show months that actually appear in the data
  const monthBorrow: Record<string, number> = {}
  const monthReturn: Record<string, number> = {}

  for (const tx of txList) {
    if (tx.borrowDate) {
      const d = parseDate(tx.borrowDate)
      if (d) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        monthBorrow[key] = (monthBorrow[key] ?? 0) + 1
      }
    }
    if (tx.returnDate) {
      const d = parseDate(tx.returnDate)
      if (d) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        monthReturn[key] = (monthReturn[key] ?? 0) + 1
      }
    }
  }

  // Merge all month keys, sort chronologically, format labels
  const allMonthKeys = Array.from(
    new Set([...Object.keys(monthBorrow), ...Object.keys(monthReturn)]),
  ).sort()

  const monthlyData =
    allMonthKeys.length > 0
      ? allMonthKeys.map((key) => {
          const [, m] = key.split('-')
          return {
            month: MONTH_LABELS[Number(m)] ?? m,
            peminjaman: monthBorrow[key] ?? 0,
            pengembalian: monthReturn[key] ?? 0,
          }
        })
      : [{ month: '-', peminjaman: 0, pengembalian: 0 }]

  // Category distribution from books
  const catCount: Record<string, number> = {}
  for (const book of bookList) {
    const cat = book.category || 'Lainnya'
    catCount[cat] = (catCount[cat] ?? 0) + 1
  }
  const total = bookList.length || 1
  const catEntries = Object.entries(catCount).sort((a, b) => b[1] - a[1])
  const categoryData = catEntries.map(([name, count], i) => ({
    name,
    value: Math.round((count / total) * 100),
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }))

  // Daily transaction activity — last 30 days
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dayMap: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    dayMap[key] = 0
  }
  for (const tx of txList) {
    const dates = [tx.borrowDate, tx.returnDate].filter(Boolean) as string[]
    for (const ds of dates) {
      if (dayMap[ds] !== undefined) {
        dayMap[ds]++
      }
    }
  }
  const dailyData = Object.entries(dayMap).map(([dateStr, count]) => ({
    day: dateStr.slice(5), // "MM-DD"
    transaksi: count,
  }))

  return {
    totalTransactions,
    uniqueMembers,
    avgReturnDays,
    totalFines,
    pendingPayments,
    monthlyData,
    categoryData,
    dailyData,
  }
}

export default function ReportsPage() {
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isFirebaseConfigured || !database) {
      // Show empty stats when Firebase not configured
      setStats(computeStats({}, {}))
      setLoading(false)
      return
    }

    let txData: Record<string, Transaction> = {}
    let bookData: Record<string, Book> = {}
    let txReady = false
    let bookReady = false

    const tryCompute = () => {
      if (txReady && bookReady) {
        setStats(computeStats(txData, bookData))
        setLoading(false)
      }
    }

    const unsubTx = onValue(ref(database, 'transactions'), (snap) => {
      txData = (snap.val() as Record<string, Transaction>) ?? {}
      txReady = true
      tryCompute()
    })

    const unsubBooks = onValue(ref(database, 'books'), (snap) => {
      bookData = (snap.val() as Record<string, Book>) ?? {}
      bookReady = true
      tryCompute()
    })

    return () => {
      unsubTx()
      unsubBooks()
    }
  }, [])

  const handlePrint = () => window.print()

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Analisis aktivitas perpustakaan berdasarkan data aktual
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
        >
          <Printer className="w-4 h-4" />
          Ekspor PDF
        </button>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <KPICardSkeleton /><KPICardSkeleton /><KPICardSkeleton /><KPICardSkeleton /><KPICardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <KPICard
            title="Total Transaksi"
            value={String(stats!.totalTransactions)}
            subtitle="Semua waktu"
            icon={BookOpen}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          />
          <KPICard
            title="Anggota Aktif"
            value={String(stats!.uniqueMembers)}
            subtitle="Pernah meminjam"
            icon={Users}
            iconColor="text-green-600"
            iconBg="bg-green-50"
          />
          <KPICard
            title="Rata-Rata Kembali"
            value={
              stats!.avgReturnDays !== null
                ? `${stats!.avgReturnDays.toFixed(1)} hari`
                : '—'
            }
            subtitle={
              stats!.avgReturnDays !== null
                ? 'Dari transaksi selesai'
                : 'Belum ada yang selesai'
            }
            icon={Clock}
            iconColor="text-orange-600"
            iconBg="bg-orange-50"
          />
          <KPICard
            title="Total Denda"
            value={formatCurrency(stats!.totalFines)}
            subtitle="Dari pembayaran lunas"
            icon={AlertTriangle}
            iconColor="text-red-600"
            iconBg="bg-red-50"
          />
          <KPICard
            title="Pembayaran Pending"
            value={String(stats!.pendingPayments)}
            subtitle="Belum dikonfirmasi"
            icon={Hourglass}
            iconColor="text-yellow-600"
            iconBg="bg-yellow-50"
          />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Monthly Bar Chart */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-1">
            Peminjaman &amp; Pengembalian per Bulan
          </h2>
          <p className="text-xs text-gray-400 mb-4">Berdasarkan tanggal transaksi aktual</p>
          {loading ? (
            <div className="h-[240px] bg-gray-50 rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={stats!.monthlyData}
                margin={{ top: 4, right: 16, bottom: 0, left: -20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                  formatter={(v) => (v === 'peminjaman' ? 'Peminjaman' : 'Pengembalian')}
                />
                <Bar dataKey="peminjaman" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pengembalian" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category Donut */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-1">
            Kategori Buku
          </h2>
          <p className="text-xs text-gray-400 mb-4">Distribusi dari koleksi aktual</p>
          {loading ? (
            <div className="h-[160px] bg-gray-50 rounded-lg animate-pulse" />
          ) : stats!.categoryData.length === 0 ? (
            <div className="h-[160px] flex items-center justify-center text-gray-400 text-sm">
              Belum ada buku
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={stats!.categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {stats!.categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                    formatter={(value, name) => [`${value}%`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5">
                {stats!.categoryData.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-gray-600">{cat.name}</span>
                    </div>
                    <span className="font-medium text-gray-700">{cat.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Daily Activity Line Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-1">
          Aktivitas Transaksi Harian (30 Hari Terakhir)
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Jumlah peminjaman/pengembalian per hari berdasarkan data aktual
        </p>
        {loading ? (
          <div className="h-[200px] bg-gray-50 rounded-lg animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={stats!.dailyData}
              margin={{ top: 4, right: 16, bottom: 0, left: -20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                interval={4}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                formatter={(v) => [v, 'Transaksi']}
              />
              <Line
                type="monotone"
                dataKey="transaksi"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
