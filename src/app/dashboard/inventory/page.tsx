'use client'

import { useEffect, useState, useCallback, FormEvent } from 'react'
import { ref, onValue, set, remove } from 'firebase/database'
import { database, isFirebaseConfigured } from '@/lib/firebase'
import { Book } from '@/types'
import StatusBadge from '@/components/StatusBadge'
import Modal from '@/components/Modal'
import { TableSkeleton } from '@/components/SkeletonLoader'
import { useToastStore } from '@/store/toastStore'
import { debounce } from '@/lib/utils'
import { Plus, Search, Pencil, Trash2, BookOpen, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

type SortField = 'id' | 'title' | 'author' | 'rackLocation' | 'status'
type SortDir = 'asc' | 'desc'

const EMPTY_FORM: Omit<Book, 'id'> = {
  title: '',
  author: '',
  isbn: '',
  category: '',
  rackLocation: '',
  rfidTag: '',
  status: 'available',
  coverUrl: '',
  description: '',
}

function BookForm({
  value,
  onChange,
}: {
  value: Omit<Book, 'id'>
  onChange: (field: keyof Omit<Book, 'id'>, val: string) => void
}) {
  const inputClass =
    'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelClass}>Judul Buku</label>
          <input
            className={inputClass}
            value={value.title}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="Judul buku"
          />
        </div>
        <div>
          <label className={labelClass}>Pengarang</label>
          <input
            className={inputClass}
            value={value.author}
            onChange={(e) => onChange('author', e.target.value)}
            placeholder="Nama pengarang"
          />
        </div>
        <div>
          <label className={labelClass}>ISBN</label>
          <input
            className={inputClass}
            value={value.isbn}
            onChange={(e) => onChange('isbn', e.target.value)}
            placeholder="978-xxxx-xxxx"
          />
        </div>
        <div>
          <label className={labelClass}>Kategori</label>
          <input
            className={inputClass}
            value={value.category}
            onChange={(e) => onChange('category', e.target.value)}
            placeholder="Fiksi, Sains, dll."
          />
        </div>
        <div>
          <label className={labelClass}>Lokasi Rak</label>
          <input
            className={inputClass}
            value={value.rackLocation}
            onChange={(e) => onChange('rackLocation', e.target.value)}
            placeholder="A-1"
          />
        </div>
        <div className="col-span-2">
          <label className={labelClass}>Tag RFID</label>
          <input
            className={inputClass}
            value={value.rfidTag}
            onChange={(e) => onChange('rfidTag', e.target.value)}
            placeholder="RFID-XXXX"
          />
        </div>
        <div className="col-span-2">
          <label className={labelClass}>URL Sampul <span className="text-gray-400 font-normal">(opsional)</span></label>
          <input
            className={inputClass}
            value={value.coverUrl ?? ''}
            onChange={(e) => onChange('coverUrl', e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className="col-span-2">
          <label className={labelClass}>Deskripsi <span className="text-gray-400 font-normal">(opsional)</span></label>
          <textarea
            className={`${inputClass} resize-none`}
            rows={2}
            value={value.description ?? ''}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="Deskripsi singkat buku"
          />
        </div>
      </div>
    </div>
  )
}

export default function InventoryPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [modalType, setModalType] = useState<'add' | 'edit' | 'delete' | null>(null)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [formData, setFormData] = useState<Omit<Book, 'id'>>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [sortField, setSortField] = useState<SortField>('id')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const { addToast } = useToastStore()

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  // Debounce search
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetQuery = useCallback(
    debounce((q: unknown) => setDebouncedQuery(q as string), 300),
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
      ref(database, 'books'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.val() as Record<string, Omit<Book, 'id'>>
          setBooks(
            Object.entries(data).map(([id, val]) => ({ id, ...val }))
          )
        } else {
          setBooks([])
        }
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsubscribe()
  }, [])

  const filtered = books
    .filter((b) => {
      const q = debouncedQuery.toLowerCase()
      return (
        (b.title ?? '').toLowerCase().includes(q) ||
        (b.author ?? '').toLowerCase().includes(q) ||
        (b.id ?? '').toLowerCase().includes(q) ||
        (b.isbn ?? '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      const aVal = a[sortField] ?? ''
      const bVal = b[sortField] ?? ''
      const cmp = String(aVal).localeCompare(String(bVal), 'id')
      return sortDir === 'asc' ? cmp : -cmp
    })

  const openAdd = () => {
    setFormData(EMPTY_FORM)
    setSelectedBook(null)
    setModalType('add')
  }

  const openEdit = (book: Book) => {
    setSelectedBook(book)
    setFormData({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      category: book.category,
      rackLocation: book.rackLocation,
      rfidTag: book.rfidTag,
      status: book.status,
      coverUrl: book.coverUrl ?? '',
      description: book.description ?? '',
    })
    setModalType('edit')
  }

  const openDelete = (book: Book) => {
    setSelectedBook(book)
    setModalType('delete')
  }

  const closeModal = () => {
    setModalType(null)
    setSelectedBook(null)
  }

  const handleFormChange = (field: keyof Omit<Book, 'id'>, val: string) => {
    setFormData((prev) => ({ ...prev, [field]: val }))
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!isFirebaseConfigured || !database) {
      addToast('error', 'Firebase belum dikonfigurasi.')
      return
    }
    if (!formData.title || !formData.author) {
      addToast('error', 'Judul dan pengarang wajib diisi.')
      return
    }
    setSaving(true)
    try {
      if (modalType === 'add') {
        // Generate next BK-XXX id based on existing books
        const maxNum = books.reduce((max, b) => {
          const m = b.id.match(/^BK-(\d+)$/)
          return m ? Math.max(max, parseInt(m[1], 10)) : max
        }, 0)
        const newId = `BK-${String(maxNum + 1).padStart(3, '0')}`
        await set(ref(database, `books/${newId}`), { ...formData })
        addToast('success', 'Buku berhasil ditambahkan.')
      } else if (modalType === 'edit' && selectedBook) {
        await set(ref(database, `books/${selectedBook.id}`), {
          ...formData,
        })
        addToast('success', 'Buku berhasil diperbarui.')
      }
      closeModal()
    } catch {
      addToast('error', 'Terjadi kesalahan. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedBook || !isFirebaseConfigured || !database) return
    setSaving(true)
    try {
      await remove(ref(database, `books/${selectedBook.id}`))
      addToast('success', 'Buku berhasil dihapus.')
      closeModal()
    } catch {
      addToast('error', 'Gagal menghapus buku.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6"><TableSkeleton rows={8} /></div>

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventaris</h1>
          <p className="text-gray-500 text-sm mt-0.5">{books.length} total buku</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Buku
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Cari judul, pengarang, ISBN..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Tidak ada buku ditemukan</p>
            <p className="text-gray-300 text-sm mt-1">
              {debouncedQuery ? 'Coba kata kunci lain' : 'Tambahkan buku pertama Anda'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {(
                    [
                      { label: 'ID', field: 'id' as SortField },
                      { label: 'Judul', field: 'title' as SortField },
                      { label: 'Pengarang', field: 'author' as SortField },
                      { label: 'Rak', field: 'rackLocation' as SortField },
                    ] as { label: string; field: SortField }[]
                  ).map(({ label, field }) => (
                    <th
                      key={field}
                      onClick={() => toggleSort(field)}
                      className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 hover:bg-gray-100 transition-colors"
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
                  ))}
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tag RFID
                  </th>
                  <th
                    onClick={() => toggleSort('status')}
                    className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <span className="inline-flex items-center gap-1">
                      Status
                      {sortField === 'status' ? (
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
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((book) => (
                  <tr key={book.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-gray-400">
                      {book.id}
                    </td>
                    <td className="px-5 py-4 font-medium text-gray-900 max-w-[200px]">
                      <span className="truncate block">{book.title}</span>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{book.author}</td>
                    <td className="px-5 py-4 text-gray-600 font-mono text-xs">
                      {book.rackLocation}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-400">
                      {book.rfidTag}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={book.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(book)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDelete(book)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={modalType === 'add' || modalType === 'edit'}
        onClose={closeModal}
        title={modalType === 'add' ? 'Tambah Buku' : 'Edit Buku'}
        size="lg"
      >
        <form onSubmit={handleSave}>
          <BookForm value={formData} onChange={handleFormChange} />
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={modalType === 'delete'}
        onClose={closeModal}
        title="Hapus Buku"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-2">
          Apakah Anda yakin ingin menghapus buku ini?
        </p>
        <p className="font-semibold text-gray-900 mb-6">
          &quot;{selectedBook?.title}&quot;
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={closeModal}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
          >
            Batal
          </button>
          <button
            onClick={handleDelete}
            disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60"
          >
            {saving ? 'Menghapus...' : 'Hapus'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
