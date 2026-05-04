import { getAvatarColor, getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface AvatarInitialsProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
}

export default function AvatarInitials({
  name,
  size = 'md',
  className,
}: AvatarInitialsProps) {
  const color = getAvatarColor(name)
  const initials = getInitials(name)

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold text-white flex-shrink-0',
        SIZE_CLASSES[size],
        className
      )}
      style={{ backgroundColor: color }}
      title={name}
    >
      {initials}
    </div>
  )
}
