import * as ToastPrimitive from '@radix-ui/react-toast'
import { cn } from '../../lib/utils'
import { createContext, useContext, useState } from 'react'
import { X } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  function toast(message, type = 'info') {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  return (
    <ToastContext.Provider value={toast}>
      <ToastPrimitive.Provider>
        {children}
        {toasts.map(t => (
          <ToastPrimitive.Root
            key={t.id}
            className={cn(
              'flex items-start gap-3 p-4 rounded-lg shadow-lg border text-sm max-w-sm',
              t.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              t.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
              'bg-white border-gray-200 text-gray-800'
            )}
            open
          >
            <ToastPrimitive.Description className="flex-1">{t.message}</ToastPrimitive.Description>
            <ToastPrimitive.Action asChild altText="Dismiss">
              <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}>
                <X className="w-3.5 h-3.5 opacity-60" />
              </button>
            </ToastPrimitive.Action>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 flex flex-col gap-2 z-[100]" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
