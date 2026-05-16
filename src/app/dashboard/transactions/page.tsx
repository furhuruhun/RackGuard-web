'use client'

import { useEffect, useState, useCallback } from 'react'
import { ref, onValue } from 'firebase/database'
import { database, isFirebaseConfigured } from '@/lib/firebase'
import { Transaction } from '@/types'
import StatusBadge from '@/components/StatusBadge'
import Modal from '@/components/Modal'
import { TableSkeleton } from '@/components/SkeletonLoader'
import { formatDate, formatCurrency, debounce, exportCSV } from '@/lib/utils'
import { Search, Download, ArrowLeftRight, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, Clock, CheckCircle2 } from 'lucide-react'

type SortField = 'id' | 'bookTitle' | 'memberName' | 'borrowDate' | 'dueDate' | 'fine' | 'status'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 10

type TxStatus = Transaction['status'] | 'all'
type TxType = Transaction['type'] | 'all'

// Returns page numbers to render; -1 means an ellipsis slot
function getPageRange(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, -1, total]
  if (current >= total - 3) return [1, -1, total - 4, total - 3, total - 2, total - 1, total]
  return [1, -1, current - 1, current, current + 1, -1, total]
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<TxStatus>('all')
  const [typeFilter, setTypeFilter] = useState<TxType>('all')
  const [page, setPage] = useState(1)
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [sortField, setSortField] = useState<SortField>('borrowDate')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
    setPage(1)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetQuery = useCallback(
    debounce((q: unknown) => {
      setDebouncedQuery(q as string)
      setPage(1)
    }, 300),
    []
  )

  useEffect(() => {
    debouncedSetQuery(query)
  }, [query, debouncedSetQuery])

  useEffect(() => {
    if (!isFirebaseConfigured || !database) {
      setLoading(false)
      return
    }
    const unsubscribe = onValue(
      ref(database, 'transactions'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.val() as Record<string, Omit<Transaction, 'id'>>
          const txs = Object.entries(data)
            .map(([id, val]) => ({ id, ...val }))
            .sort(
              (a, b) =>
                new Date(b.borrowDate).getTime() - new Date(a.borrowDate).getTime()
            )
          setTransactions(txs)
        } else {
          setTransactions([])
        }
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsubscribe()
  }, [])

  const filtered = transactions
    .filter((tx) => {
      const q = debouncedQuery.toLowerCase()
      const matchQuery =
        tx.id.toLowerCase().includes(q) ||
        tx.bookTitle.toLowerCase().includes(q) ||
        tx.memberName.toLowerCase().includes(q)
      const matchStatus = statusFilter === 'all' || tx.status === statusFilter
      const matchType = typeFilter === 'all' || tx.type === typeFilter
      return matchQuery && matchStatus && matchType
    })
    .sort((a, b) => {
      const aVal = a[sortField] ?? ''
      const bVal = b[sortField] ?? ''
      if (sortField === 'fine') {
        const diff = (a.fine ?? 0) - (b.fine ?? 0)
        return sortDir === 'asc' ? diff : -diff
      }
      const cmp = String(aVal).localeCompare(String(bVal), 'id')
      return sortDir === 'asc' ? cmp : -cmp
    })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleExport = () => {
    exportCSV(
      filtered.map((tx) => ({
        ID: tx.id,
        Jenis: tx.type === 'borrow' ? 'Pinjam' : 'Kembali',
        Buku: tx.bookTitle,
        Anggota: tx.memberName,
        'Tanggal Pinjam': formatDate(tx.borrowDate),
        'Tanggal Kembali': tx.dueDate,
        'Kembali Aktual': tx.returnDate ? formatDate(tx.returnDate) : '-',
        Denda: tx.fine,
        Pembayaran: tx.paymentStatus ?? '-',
        Status: tx.status,
      })),
      `transaksi-${new Date().toISOString().split('T')[0]}.csv`
    )
  }

  if (loading) return <div className="p-6"><TableSkeleton rows={10} /></div>

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transaksi</h1>
          <p className="text-gray-500 text-sm mt-0.5">{transactions.length} total transaksi</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Ekspor CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari ID, buku, anggota..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as TxStatus); setPage(1) }}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="completed">Selesai</option>
          <option value="overdue">Terlambat</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value as TxType); setPage(1) }}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Semua Jenis</option>
          <option value="borrow">Pinjam</option>
          <option value="return">Kembali</option>
        </select>
      </div>

      {/* Detail Modal */}
      <Modal
        open={!!selectedTx}
        onClose={() => setSelectedTx(null)}
        title="Detail Transaksi"
        size="sm"
      >
        {selectedTx && (
          <div className="space-y-3">
            {[
              { label: 'ID Transaksi', value: <span className="font-mono text-xs">{selectedTx.id}</span> },
              { label: 'Jenis', value: <StatusBadge status={selectedTx.type} /> },
              { label: 'Buku', value: <span className="font-medium">{selectedTx.bookTitle}</span> },
              { label: 'Anggota', value: selectedTx.memberName },
              { label: 'Tanggal Pinjam', value: formatDate(selectedTx.borrowDate) },
              { label: 'Jatuh Tempo', value: formatDate(selectedTx.dueDate) },
              {
                label: 'Tanggal Kembali',
                value: selectedTx.returnDate ? formatDate(selectedTx.returnDate) : <span className="text-gray-400">-</span>,
              },
              {
                label: 'Denda',
                value: selectedTx.fine > 0
                  ? <span className="text-red-600 font-medium">{formatCurrency(selectedTx.fine)}</span>
                  : <span className="text-gray-400">-</span>,
              },
              { label: 'Status', value: <StatusBadge status={selectedTx.status} /> },
              {
                label: 'Pembayaran',
                value: selectedTx.paymentStatus === 'success'
                  ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3" />Lunas</span>
                  : selectedTx.paymentStatus === 'pending'
                  ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3" />Pending</span>
                  : <span className="text-gray-400">-</span>,
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-gray-500 shrink-0">{label}</span>
                <span className="text-right">{value}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {paginated.length === 0 ? (
          <div className="py-16 text-center">
            <ArrowLeftRight className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Tidak ada transaksi ditemukan</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {(
                      [
                        { label: 'ID', field: 'id' as SortField },
                        { label: 'Jenis', field: null },
                        { label: 'Buku', field: 'bookTitle' as SortField },
                        { label: 'Anggota', field: 'memberName' as SortField },
                        { label: 'Tanggal Pinjam', field: 'borrowDate' as SortField },
                        { label: 'Jatuh Tempo', field: 'dueDate' as SortField },
                        { label: 'Denda', field: 'fine' as SortField },
                        { label: 'Pembayaran', field: null },
                        { label: 'Status', field: 'status' as SortField },
                      ] as { label: string; field: SortField | null }[]
                    ).map(({ label, field }) =>
                      field ? (
                        <th
                          key={label}
                          onClick={() => toggleSort(field)}
                          className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <span className="inline-flex items-center gap-1">
                            {label}
                            {sortField === field ? (
                              sortDir === 'asc' ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )
                            ) : (
                              <ChevronsUpDown className="w-3 h-3 opacity-30" />
                            )}
                          </span>
                        </th>
                      ) : (
                        <th
                          key={label}
                          className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                        >
                          {label}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedTx(tx)}
                    >
                      <td className="px-5 py-4 font-mono text-xs text-gray-400 whitespace-nowrap">
                        {tx.id}
                      </td>
                      <td className="px-5 py-4">
                        <span className="flex items-center gap-1 text-xs font-medium">
                          {tx.type === 'borrow' ? (
                            <span className="text-blue-600">↗ Pinjam</span>
                          ) : (
                            <span className="text-green-600">↙ Kembali</span>
                          )}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-medium text-gray-900 max-w-[180px]">
                        <span className="truncate block">{tx.bookTitle}</span>
                      </td>
                      <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                        {tx.memberName}
                      </td>
                      <td className="px-5 py-4 text-gray-500 whitespace-nowrap">
                        {formatDate(tx.borrowDate)}
                      </td>
                      <td className="px-5 py-4 text-gray-500 whitespace-nowrap">
                        {formatDate(tx.dueDate)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {tx.fine > 0 ? (
                          <span className="text-red-600 font-medium">
                            {formatCurrency(tx.fine)}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {tx.paymentStatus === 'success' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3" />
                            Lunas
                          </span>
                        ) : tx.paymentStatus === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={tx.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Menampilkan {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} transaksi
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {getPageRange(page, totalPages).map((n, idx) =>
                  n === -1 ? (
                    <span key={`e${idx}`} className="w-7 h-7 flex items-center justify-center text-xs text-gray-400">…</span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`w-7 h-7 rounded-md text-xs font-medium transition-colors ${
                        page === n
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {n}
                    </button>
                  )
                )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
