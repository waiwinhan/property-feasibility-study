import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatRM(value, short = false) {
  if (value == null || isNaN(value)) return '—'
  const num = Number(value)
  if (short) {
    if (Math.abs(num) >= 1_000_000) return `RM ${(num / 1_000_000).toFixed(1)}M`
    if (Math.abs(num) >= 1_000) return `RM ${(num / 1_000).toFixed(0)}K`
    return `RM ${num.toFixed(0)}`
  }
  return `RM ${num.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function formatPct(value, decimals = 1) {
  if (value == null || isNaN(value)) return '—'
  return `${Number(value).toFixed(decimals)}%`
}

export function formatPSF(value) {
  if (value == null || isNaN(value)) return '—'
  return `RM ${Number(value).toFixed(2)}`
}

export function marginColor(margin, hurdle = 15) {
  if (margin == null) return 'text-gray-400'
  if (margin >= hurdle) return 'text-green-600'
  if (margin >= hurdle - 3) return 'text-amber-500'
  return 'text-red-600'
}

export function marginBg(margin, hurdle = 15) {
  if (margin == null) return 'bg-gray-100'
  if (margin >= hurdle) return 'bg-green-50 border-green-200'
  if (margin >= hurdle - 3) return 'bg-amber-50 border-amber-200'
  return 'bg-red-50 border-red-200'
}

export function statusColor(status) {
  switch (status) {
    case 'Active': return 'bg-green-100 text-green-700'
    case 'On Hold': return 'bg-amber-100 text-amber-700'
    case 'Completed': return 'bg-blue-100 text-blue-700'
    case 'Archived': return 'bg-gray-100 text-gray-500'
    default: return 'bg-gray-100 text-gray-500'
  }
}
