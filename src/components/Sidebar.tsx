'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ArrowLeftRight,
  BarChart2,
  Server,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import AvatarInitials from './AvatarInitials'

const MANAGEMENT_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/inventory', label: 'Inventaris', icon: BookOpen },
  { href: '/dashboard/members', label: 'Anggota', icon: Users },
  { href: '/dashboard/transactions', label: 'Transaksi', icon: ArrowLeftRight },
  { href: '/dashboard/reports', label: 'Laporan', icon: BarChart2 },
]

const SYSTEM_LINKS = [
  { href: '/dashboard/shelf-status', label: 'Status Rak', icon: Server },
  { href: '/dashboard/settings', label: 'Pengaturan', icon: Settings },
]

interface NavItemProps {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  exact?: boolean
}

function NavItem({ href, label, icon: Icon, exact }: NavItemProps) {
  const pathname = usePathname()
  const isActive = exact ? pathname === href : pathname.startsWith(href)

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'bg-white/10 text-white'
          : 'text-white/60 hover:text-white hover:bg-white/5'
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {label}
    </Link>
  )
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? 'Admin'

  return (
    <aside
      className="flex flex-col w-60 min-h-screen flex-shrink-0"
      style={{ backgroundColor: '#1A1F2E' }}
    >
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/10">
        <p className="text-white font-bold text-xl tracking-tight">RackGuard</p>
        <p className="text-white/40 text-xs mt-0.5 font-medium tracking-widest uppercase">
          Admin Dashboard
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        <div>
          <p className="text-white/30 text-xs font-semibold tracking-widest uppercase px-3 mb-2">
            Management
          </p>
          <div className="space-y-0.5">
            {MANAGEMENT_LINKS.map((link) => (
              <NavItem key={link.href} {...link} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-white/30 text-xs font-semibold tracking-widest uppercase px-3 mb-2">
            System
          </p>
          <div className="space-y-0.5">
            {SYSTEM_LINKS.map((link) => (
              <NavItem key={link.href} {...link} />
            ))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <AvatarInitials name={displayName} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{displayName}</p>
            <p className="text-white/40 text-xs truncate">Kepala Pustakawan</p>
          </div>
          <button
            onClick={logout}
            title="Keluar"
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
