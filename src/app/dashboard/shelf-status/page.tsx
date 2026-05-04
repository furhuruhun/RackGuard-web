'use client'

import { useEffect, useState } from 'react'
import { ref, onValue } from 'firebase/database'
import { database, isFirebaseConfigured } from '@/lib/firebase'
import { Shelf } from '@/types'
import StatusBadge from '@/components/StatusBadge'
import { CardGridSkeleton } from '@/components/SkeletonLoader'
import { formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Server, Thermometer, Lock, Unlock } from 'lucide-react'

// Fallback demo shelves so the page isn't empty without Firebase
const DEMO_SHELVES: Shelf[] = [
  {
    id: 'RACK-A-1',
    name: 'Rak A-1',
    location: 'Lantai 1, Baris A',
    capacity: { current: 18, max: 25 },
    lockStatus: 'locked',
    connectivity: 'online',
    temperature: 24.5,
    lastUpdate: Date.now() - 60000,
  },
  {
    id: 'RACK-A-2',
    name: 'Rak A-2',
    location: 'Lantai 1, Baris A',
    capacity: { current: 22, max: 25 },
    lockStatus: 'locked',
    connectivity: 'online',
    temperature: 25.1,
    lastUpdate: Date.now() - 90000,
  },
  {
    id: 'RACK-B-1',
    name: 'Rak B-1',
    location: 'Lantai 1, Baris B',
    capacity: { current: 12, max: 25 },
    lockStatus: 'unlocked',
    connectivity: 'online',
    temperature: 23.8,
    lastUpdate: Date.now() - 30000,
  },
  {
    id: 'RACK-B-2',
    name: 'Rak B-2',
    location: 'Lantai 1, Baris B',
    capacity: { current: 0, max: 25 },
    lockStatus: 'locked',
    connectivity: 'offline',
    temperature: 0,
    lastUpdate: Date.now() - 3600000,
  },
  {
    id: 'RACK-C-1',
    name: 'Rak C-1',
    location: 'Lantai 2, Baris C',
    capacity: { current: 25, max: 25 },
    lockStatus: 'locked',
    connectivity: 'online',
    temperature: 24.2,
    lastUpdate: Date.now() - 120000,
  },
  {
    id: 'RACK-C-2',
    name: 'Rak C-2',
    location: 'Lantai 2, Baris C',
    capacity: { current: 9, max: 25 },
    lockStatus: 'locked',
    connectivity: 'online',
    temperature: 26.0,
    lastUpdate: Date.now() - 45000,
  },
]

function ShelfCard({ shelf }: { shelf: Shelf }) {
  const pct =
    shelf.capacity.max > 0
      ? Math.round((shelf.capacity.current / shelf.capacity.max) * 100)
      : 0

  const isOffline = shelf.connectivity === 'offline'
  const isUnlocked = shelf.lockStatus === 'unlocked'

  return (
    <div
      className={cn(
        'bg-white rounded-xl p-5 shadow-sm border transition-all',
        isOffline && 'opacity-60 border-gray-200',
        isUnlocked && !isOffline && 'border-yellow-400 shadow-yellow-100',
        !isOffline && !isUnlocked && 'border-gray-100'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-900">{shelf.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{shelf.location}</p>
        </div>
        <StatusBadge status={shelf.connectivity} />
      </div>

      {/* Capacity */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
          <span>Kapasitas</span>
          <span className="font-medium">
            {shelf.capacity.current}/{shelf.capacity.max}
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              pct >= 90
                ? 'bg-red-400'
                : pct >= 70
                ? 'bg-orange-400'
                : 'bg-blue-500'
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{pct}% terisi</p>
      </div>

      {/* Details */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-50">
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            {isUnlocked ? (
              <Unlock className="w-4 h-4 text-yellow-500" />
            ) : (
              <Lock className="w-4 h-4 text-gray-400" />
            )}
          </div>
          <p className="text-xs text-gray-400">
            {isUnlocked ? 'Terbuka' : 'Terkunci'}
          </p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Thermometer className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xs text-gray-400">
            {isOffline || typeof shelf.temperature !== 'number'
              ? '—'
              : `${shelf.temperature.toFixed(1)}°C`}
          </p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Server className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-xs text-gray-400">
            {formatRelativeTime(shelf.lastUpdate)}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ShelfStatusPage() {
  const [shelves, setShelves] = useState<Shelf[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isFirebaseConfigured || !database) {
      setShelves(DEMO_SHELVES)
      setLoading(false)
      return
    }
    const unsubscribe = onValue(
      ref(database, 'shelves'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.val() as Record<string, Omit<Shelf, 'id'>>
          setShelves(Object.entries(data).map(([id, val]) => ({ id, ...val })))
        } else {
          // Fall back to demo when Firebase has no shelf data
          setShelves(DEMO_SHELVES)
        }
        setLoading(false)
      },
      () => {
        setShelves(DEMO_SHELVES)
        setLoading(false)
      }
    )
    return () => unsubscribe()
  }, [])

  const onlineCount = shelves.filter((s) => s.connectivity === 'online').length
  const unlockedCount = shelves.filter((s) => s.lockStatus === 'unlocked').length

  if (loading) return <div className="p-6"><CardGridSkeleton count={6} /></div>

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Status Rak</h1>
        <p className="text-gray-500 text-sm mt-0.5">Pemantauan IoT Real-Time</p>
      </div>

      {/* Summary strip */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-100 shadow-sm text-sm">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-gray-600">
            <strong className="text-gray-900">{onlineCount}</strong> Rak Online
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-100 shadow-sm text-sm">
          <span className="w-2 h-2 rounded-full bg-gray-300" />
          <span className="text-gray-600">
            <strong className="text-gray-900">{shelves.length - onlineCount}</strong> Rak Offline
          </span>
        </div>
        {unlockedCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 rounded-lg border border-yellow-200 shadow-sm text-sm">
            <Unlock className="w-3.5 h-3.5 text-yellow-600" />
            <span className="text-yellow-700">
              <strong>{unlockedCount}</strong> Rak Terbuka
            </span>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {shelves.map((shelf) => (
          <ShelfCard key={shelf.id} shelf={shelf} />
        ))}
      </div>
    </div>
  )
}
