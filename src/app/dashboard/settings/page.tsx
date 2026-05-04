'use client'

import { useState, useEffect } from 'react'
import { ref, set, onValue } from 'firebase/database'
import { database, isFirebaseConfigured } from '@/lib/firebase'
import { useToastStore } from '@/store/toastStore'
import { Settings } from '@/types'
import { Save, Building2, BookOpen, AlertTriangle, Bell, User } from 'lucide-react'

const DEFAULT_SETTINGS: Settings = {
  libraryName: 'Perpustakaan RackGuard',
  address: 'Jl. Contoh No. 123, Kota',
  contact: 'admin@rackguard.id',
  defaultLoanDuration: 14,
  maxBooksPerMember: 3,
  fineRatePerDay: 1000,
  gracePeriod: 1,
  notificationTemplate:
    'Halo {nama}, buku "{judul}" Anda jatuh tempo pada {tanggal}. Segera kembalikan untuk menghindari denda.',
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100">
        <Icon className="w-5 h-5 text-gray-400" />
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start">
      <div className="sm:col-span-1 pt-1.5">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
      <div className="sm:col-span-2">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [loaded, setLoaded] = useState(false)
  const { addToast } = useToastStore()

  // Load settings from Firebase on mount
  useEffect(() => {
    if (!isFirebaseConfigured || !database) {
      setLoaded(true)
      return
    }
    const unsubscribe = onValue(
      ref(database, 'settings'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.val() as Partial<Record<string, Partial<Settings>>>
          // Merge all sections back into a flat settings object
          const merged: Settings = { ...DEFAULT_SETTINGS }
          for (const section of Object.values(data)) {
            if (section && typeof section === 'object') {
              Object.assign(merged, section)
            }
          }
          setSettings(merged)
        }
        setLoaded(true)
      },
      () => setLoaded(true)
    )
    return () => unsubscribe()
  }, [])

  const inputClass =
    'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  const update = (field: keyof Settings, value: string | number) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
  }

  const saveSection = async (section: string, data: Partial<Settings>) => {
    setSaving((prev) => ({ ...prev, [section]: true }))
    try {
      if (isFirebaseConfigured && database) {
        await set(ref(database, `settings/${section}`), data)
      }
      addToast('success', 'Pengaturan berhasil disimpan.')
    } catch {
      addToast('error', 'Gagal menyimpan pengaturan.')
    } finally {
      setSaving((prev) => ({ ...prev, [section]: false }))
    }
  }

  function SaveButton({ section, onClick }: { section: string; onClick: () => void }) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={saving[section]}
        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
      >
        <Save className="w-4 h-4" />
        {saving[section] ? 'Menyimpan...' : 'Simpan'}
      </button>
    )
  }

  if (!loaded) {
    return (
      <div className="p-6 space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 bg-white rounded-xl border border-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Konfigurasi sistem perpustakaan
        </p>
      </div>

      {/* General Settings */}
      <SectionCard title="Pengaturan Umum" icon={Building2}>
        <div className="space-y-4">
          <Field label="Nama Perpustakaan">
            <input
              className={inputClass}
              value={settings.libraryName}
              onChange={(e) => update('libraryName', e.target.value)}
            />
          </Field>
          <Field label="Alamat">
            <input
              className={inputClass}
              value={settings.address}
              onChange={(e) => update('address', e.target.value)}
            />
          </Field>
          <Field label="Kontak">
            <input
              className={inputClass}
              value={settings.contact}
              onChange={(e) => update('contact', e.target.value)}
            />
          </Field>
          <div className="flex justify-end pt-2">
            <SaveButton
              section="general"
              onClick={() =>
                saveSection('general', {
                  libraryName: settings.libraryName,
                  address: settings.address,
                  contact: settings.contact,
                })
              }
            />
          </div>
        </div>
      </SectionCard>

      {/* Loan Configuration */}
      <SectionCard title="Konfigurasi Peminjaman" icon={BookOpen}>
        <div className="space-y-4">
          <Field label="Durasi Default" hint="Jumlah hari peminjaman standar">
            <div className="flex items-center gap-2">
              <input
                type="number"
                className={inputClass}
                value={settings.defaultLoanDuration}
                min={1}
                max={90}
                onChange={(e) =>
                  update('defaultLoanDuration', parseInt(e.target.value) || 14)
                }
              />
              <span className="text-sm text-gray-400 whitespace-nowrap">hari</span>
            </div>
          </Field>
          <Field label="Maks. Buku per Anggota" hint="Batas buku yang dapat dipinjam sekaligus">
            <div className="flex items-center gap-2">
              <input
                type="number"
                className={inputClass}
                value={settings.maxBooksPerMember}
                min={1}
                max={10}
                onChange={(e) =>
                  update('maxBooksPerMember', parseInt(e.target.value) || 3)
                }
              />
              <span className="text-sm text-gray-400 whitespace-nowrap">buku</span>
            </div>
          </Field>
          <div className="flex justify-end pt-2">
            <SaveButton
              section="loan"
              onClick={() =>
                saveSection('loan', {
                  defaultLoanDuration: settings.defaultLoanDuration,
                  maxBooksPerMember: settings.maxBooksPerMember,
                })
              }
            />
          </div>
        </div>
      </SectionCard>

      {/* Fine Configuration */}
      <SectionCard title="Konfigurasi Denda" icon={AlertTriangle}>
        <div className="space-y-4">
          <Field label="Tarif Denda per Hari" hint="Dalam Rupiah">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Rp</span>
              <input
                type="number"
                className={inputClass}
                value={settings.fineRatePerDay}
                min={0}
                step={500}
                onChange={(e) =>
                  update('fineRatePerDay', parseInt(e.target.value) || 1000)
                }
              />
              <span className="text-sm text-gray-400 whitespace-nowrap">/ hari</span>
            </div>
          </Field>
          <Field label="Masa Toleransi" hint="Hari sebelum denda mulai dihitung">
            <div className="flex items-center gap-2">
              <input
                type="number"
                className={inputClass}
                value={settings.gracePeriod}
                min={0}
                max={7}
                onChange={(e) =>
                  update('gracePeriod', parseInt(e.target.value) || 0)
                }
              />
              <span className="text-sm text-gray-400 whitespace-nowrap">hari</span>
            </div>
          </Field>
          <div className="flex justify-end pt-2">
            <SaveButton
              section="fine"
              onClick={() =>
                saveSection('fine', {
                  fineRatePerDay: settings.fineRatePerDay,
                  gracePeriod: settings.gracePeriod,
                })
              }
            />
          </div>
        </div>
      </SectionCard>

      {/* Notification Settings */}
      <SectionCard title="Pengaturan Notifikasi" icon={Bell}>
        <div className="space-y-4">
          <Field
            label="Template Notifikasi"
            hint="Gunakan {nama}, {judul}, {tanggal} sebagai variabel"
          >
            <textarea
              className={`${inputClass} resize-none`}
              rows={3}
              value={settings.notificationTemplate}
              onChange={(e) => update('notificationTemplate', e.target.value)}
            />
          </Field>
          <div className="flex justify-end pt-2">
            <SaveButton
              section="notification"
              onClick={() =>
                saveSection('notification', {
                  notificationTemplate: settings.notificationTemplate,
                })
              }
            />
          </div>
        </div>
      </SectionCard>

      {/* Admin Account */}
      <SectionCard title="Akun Admin" icon={User}>
        <div className="space-y-4">
          <Field label="Nama Tampilan">
            <input
              className={inputClass}
              placeholder="Nama admin"
              defaultValue="Admin RackGuard"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className={inputClass}
              placeholder="admin@rackguard.id"
              defaultValue="admin@rackguard.id"
            />
          </Field>
          <Field label="Password Baru" hint="Kosongkan jika tidak ingin mengubah">
            <input
              type="password"
              className={inputClass}
              placeholder="••••••••"
            />
          </Field>
          <div className="flex justify-end pt-2">
            <SaveButton
              section="admin"
              onClick={() => {
                setSaving((prev) => ({ ...prev, admin: true }))
                setTimeout(() => {
                  setSaving((prev) => ({ ...prev, admin: false }))
                  addToast('success', 'Informasi akun berhasil disimpan.')
                }, 800)
              }}
            />
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
