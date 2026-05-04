import { cn } from '@/lib/utils'

type StatusType =
  | 'available'
  | 'borrowed'
  | 'overdue'
  | 'active'
  | 'warned'
  | 'suspended'
  | 'completed'
  | 'online'
  | 'offline'
  | 'locked'
  | 'unlocked'
  | 'borrow'
  | 'return'

const STATUS_CONFIG: Record<
  StatusType,
  { label: string; className: string }
> = {
  available:  { label: 'Tersedia',     className: 'bg-green-100 text-green-700' },
  borrowed:   { label: 'Dipinjam',     className: 'bg-orange-100 text-orange-700' },
  overdue:    { label: 'Terlambat',    className: 'bg-red-100 text-red-700' },
  active:     { label: 'Aktif',        className: 'bg-blue-100 text-blue-700' },
  warned:     { label: 'Peringatan',   className: 'bg-orange-100 text-orange-700' },
  suspended:  { label: 'Ditangguhkan', className: 'bg-red-100 text-red-700' },
  completed:  { label: 'Selesai',      className: 'bg-green-100 text-green-700' },
  online:     { label: 'Online',       className: 'bg-green-100 text-green-700' },
  offline:    { label: 'Offline',      className: 'bg-gray-100 text-gray-500' },
  locked:     { label: 'Terkunci',     className: 'bg-gray-100 text-gray-600' },
  unlocked:   { label: 'Terbuka',      className: 'bg-yellow-100 text-yellow-700' },
  borrow:     { label: 'Pinjam',       className: 'bg-blue-100 text-blue-700' },
  return:     { label: 'Kembali',      className: 'bg-green-100 text-green-700' },
}

interface StatusBadgeProps {
  status: StatusType
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-600',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
