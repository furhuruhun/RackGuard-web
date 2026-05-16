'use client'

import { useEffect, useState, useCallback, FormEvent } from 'react'
import { ref, onValue, set, update, get } from 'firebase/database'
import { database, isFirebaseConfigured } from '@/lib/firebase'
import { Member, Notification } from '@/types'
import StatusBadge from '@/components/StatusBadge'
import Modal from '@/components/Modal'
import AvatarInitials from '@/components/AvatarInitials'
import { CardGridSkeleton } from '@/components/SkeletonLoader'
import { useToastStore } from '@/store/toastStore'
import { debounce, formatMonthYear, formatDate } from '@/lib/utils'
import { Plus, Search, Users, Bell } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const EMPTY_FORM = {
  name: '',
  email: '',
  status: 'active' as Member['status'],
  memberSince: new Date().toISOString().split('T')[0],
  totalBorrowed: 0,
  currentBorrowed: 0,
  totalFines: 0,
}

type FormData = Omit<Member, 'id' | 'avatar'>

function MemberForm({
  value,
  onChange,
}: {
  value: FormData
  onChange: (field: keyof FormData, val: string | number) => void
}) {
  const inputClass =
    'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Nama Lengkap</label>
        <input
          className={inputClass}
          value={value.name}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="Nama anggota"
        />
      </div>
      <div>
        <label className={labelClass}>Email</label>
        <input
          type="email"
          className={inputClass}
          value={value.email}
          onChange={(e) => onChange('email', e.target.value)}
          placeholder="email@contoh.com"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Status</label>
          <select
            className={inputClass}
            value={value.status}
            onChange={(e) => onChange('status', e.target.value as Member['status'])}
          >
            <option value="active">Aktif</option>
            <option value="warned">Peringatan</option>
            <option value="suspended">Ditangguhkan</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Anggota Sejak</label>
          <input
            type="date"
            className={inputClass}
            value={value.memberSince}
            onChange={(e) => onChange('memberSince', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [modalType, setModalType] = useState<'add' | 'edit' | 'confirm' | 'notifications' | null>(null)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [memberNotifs, setMemberNotifs] = useState<Notification[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'suspend' | 'activate' | null>(null)
  const { addToast } = useToastStore()

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
      ref(database, 'users'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.val() as Record<string, Omit<Member, 'id'>>
          setMembers(Object.entries(data).map(([id, val]) => ({ id, ...val })))
        } else {
          setMembers([])
        }
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsubscribe()
  }, [])

  const filtered = members.filter((m) => {
    const q = debouncedQuery.toLowerCase()
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q)
    )
  })

  const openAdd = () => {
    setFormData(EMPTY_FORM)
    setSelectedMember(null)
    setModalType('add')
  }

  const openEdit = (member: Member) => {
    setSelectedMember(member)
    setFormData({
      name: member.name,
      email: member.email,
      status: member.status,
      memberSince: member.memberSince,
      totalBorrowed: member.totalBorrowed,
      currentBorrowed: member.currentBorrowed,
      totalFines: member.totalFines,
    })
    setModalType('edit')
  }

  const openConfirm = (member: Member, action: 'suspend' | 'activate') => {
    setSelectedMember(member)
    setConfirmAction(action)
    setModalType('confirm')
  }

  const openNotifications = (member: Member) => {
    setSelectedMember(member)
    setMemberNotifs([])
    setModalType('notifications')
    if (!isFirebaseConfigured || !database) return
    setNotifLoading(true)
    get(ref(database, `notifications/${member.id}`))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.val() as Record<string, Omit<Notification, 'id'>>
          setMemberNotifs(
            Object.entries(data)
              .map(([id, v]) => ({ id, ...v } as Notification))
              .sort((a, b) => b.createdAt - a.createdAt)
          )
        }
      })
      .catch(() => {})
      .finally(() => setNotifLoading(false))
  }

  const closeModal = () => {
    setModalType(null)
    setSelectedMember(null)
    setConfirmAction(null)
    setMemberNotifs([])
  }

  const handleFormChange = (field: keyof FormData, val: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: val }))
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!isFirebaseConfigured || !database) {
      addToast('error', 'Firebase belum dikonfigurasi.')
      return
    }
    if (!formData.name || !formData.email) {
      addToast('error', 'Nama dan email wajib diisi.')
      return
    }
    setSaving(true)
    try {
      if (modalType === 'add') {
        // Generate next M00X id based on existing members
        const maxNum = members.reduce((max, m) => {
          const match = m.id.match(/^M(\d+)$/)
          return match ? Math.max(max, parseInt(match[1], 10)) : max
        }, 0)
        const newId = `M${String(maxNum + 1).padStart(3, '0')}`
        await set(ref(database, `users/${newId}`), formData)
        addToast('success', 'Anggota berhasil ditambahkan.')
      } else if (modalType === 'edit' && selectedMember) {
        await set(ref(database, `users/${selectedMember.id}`), formData)
        addToast('success', 'Anggota berhasil diperbarui.')
      }
      closeModal()
    } catch {
      addToast('error', 'Terjadi kesalahan. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmAction = async () => {
    if (!selectedMember || !isFirebaseConfigured || !database) return
    setSaving(true)
    try {
      const newStatus = confirmAction === 'suspend' ? 'suspended' : 'active'
      await update(ref(database, `users/${selectedMember.id}`), { status: newStatus })
      addToast(
        'success',
        confirmAction === 'suspend'
          ? 'Anggota berhasil ditangguhkan.'
          : 'Anggota berhasil diaktifkan.'
      )
      closeModal()
    } catch {
      addToast('error', 'Terjadi kesalahan.')
    } finally {
      setSaving(false)
    }
  }

  if (loading)
    return (
      <div className="p-6">
        <CardGridSkeleton count={6} />
      </div>
    )

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Anggota</h1>
          <p className="text-gray-500 text-sm mt-0.5">{members.length} total anggota</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Anggota
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Cari nama, email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-16 text-center shadow-sm border border-gray-100">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Tidak ada anggota ditemukan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <AvatarInitials name={member.name} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{member.name}</p>
                  <p className="text-gray-400 text-sm truncate">{member.email}</p>
                  <div className="mt-1.5">
                    <StatusBadge status={member.status} />
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-4 text-xs text-gray-500">
                <span>{member.currentBorrowed} buku dipinjam</span>
                <span>•</span>
                <span>Sejak {formatMonthYear(member.memberSince)}</span>
              </div>

              {member.totalFines > 0 && (
                <div className="mt-2 px-2.5 py-1 bg-red-50 rounded-md text-xs text-red-600 font-medium">
                  Denda: {formatCurrency(member.totalFines)}
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => openEdit(member)}
                  className="flex-1 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => openNotifications(member)}
                  className="py-1.5 px-3 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                  title="Riwayat Notifikasi"
                >
                  <Bell className="w-3.5 h-3.5" />
                </button>
                {member.status !== 'suspended' ? (
                  <button
                    onClick={() => openConfirm(member, 'suspend')}
                    className="flex-1 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Tangguhkan
                  </button>
                ) : (
                  <button
                    onClick={() => openConfirm(member, 'activate')}
                    className="flex-1 py-1.5 text-xs font-medium text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                  >
                    Aktifkan
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalType === 'add' || modalType === 'edit'}
        onClose={closeModal}
        title={modalType === 'add' ? 'Tambah Anggota' : 'Edit Anggota'}
      >
        <form onSubmit={handleSave}>
          <MemberForm value={formData} onChange={handleFormChange} />
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Notification History Modal */}
      <Modal
        open={modalType === 'notifications'}
        onClose={closeModal}
        title={`Riwayat Notifikasi — ${selectedMember?.name ?? ''}`}
        size="lg"
      >
        {notifLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : memberNotifs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Bell className="w-10 h-10 text-gray-300" />
            <p className="text-gray-400 font-medium">Belum ada notifikasi</p>
            <p className="text-gray-300 text-sm">Sistem belum mengirim notifikasi ke anggota ini.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto -mx-1 px-1">
            {memberNotifs.map((notif) => (
              <div
                key={notif.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50"
              >
                <span
                  className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold shrink-0 ${
                    notif.type === 'overdue'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {notif.type === 'overdue' ? 'Terlambat' : 'Pengingat'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 leading-snug">{notif.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(notif.createdAt)}</p>
                </div>
                <span
                  className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                    notif.read ? 'bg-gray-300' : 'bg-blue-500'
                  }`}
                  title={notif.read ? 'Sudah dibaca' : 'Belum dibaca'}
                />
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Confirm Modal */}
      <Modal
        open={modalType === 'confirm'}
        onClose={closeModal}
        title={confirmAction === 'suspend' ? 'Tangguhkan Anggota' : 'Aktifkan Anggota'}
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-2">
          {confirmAction === 'suspend'
            ? 'Apakah Anda yakin ingin menangguhkan anggota ini?'
            : 'Apakah Anda yakin ingin mengaktifkan kembali anggota ini?'}
        </p>
        <p className="font-semibold text-gray-900 mb-6">{selectedMember?.name}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={closeModal}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
          >
            Batal
          </button>
          <button
            onClick={handleConfirmAction}
            disabled={saving}
            className={`px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60 transition-colors ${
              confirmAction === 'suspend'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {saving ? 'Memproses...' : 'Ya, Konfirmasi'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
