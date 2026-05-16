export interface Member {
  id: string
  name: string
  email: string
  avatar?: string
  status: 'active' | 'warned' | 'suspended'
  memberSince: string
  totalBorrowed: number
  currentBorrowed: number
  totalFines: number
}

export interface Book {
  id: string // BK-XXX
  title: string
  author: string
  isbn: string
  category: string
  rackLocation: string // e.g., "A-1"
  rfidTag: string
  status: 'available' | 'borrowed' | 'overdue'
  coverUrl?: string
  description?: string
}

export interface Transaction {
  id: string // TX-XXXX
  type: 'borrow' | 'return'
  bookId: string
  bookTitle: string
  memberId: string
  memberName: string
  borrowDate: string
  dueDate: string
  returnDate: string | null
  fine: number
  status: 'active' | 'completed' | 'overdue'
  paymentStatus?: 'pending' | 'success'
}

export interface Shelf {
  id: string // RACK-A-1
  name: string
  location: string
  capacity: { current: number; max: number }
  lockStatus: 'locked' | 'unlocked'
  connectivity: 'online' | 'offline'
  temperature?: number  // not always reported by IoT device
  lastUpdate: number
}

export interface Notification {
  id: string
  userId: string
  type: 'reminder' | 'overdue' | 'fine' | 'system'
  title: string
  message: string
  read: boolean
  createdAt: number
}

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
}

export interface Settings {
  libraryName: string
  address: string
  contact: string
  defaultLoanDuration: number
  maxBooksPerMember: number
  fineRatePerDay: number
  gracePeriod: number
  notificationTemplate: string
}
