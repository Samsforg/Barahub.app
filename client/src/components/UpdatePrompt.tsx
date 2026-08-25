import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>

export default function UpdatePrompt() {
  const [updateSW, setUpdateSW] = useState<UpdateServiceWorker | null>(null)
  const [needRefresh, setNeedRefresh] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)

  useEffect(() => {
    setUpdateSW(
      registerSW({
        onNeedRefresh: () => setNeedRefresh(true),
        onOfflineReady: () => setOfflineReady(true),
      })
    )
  }, [])

  if (!needRefresh && !offlineReady) return null

  function close() {
    setNeedRefresh(false)
    setOfflineReady(false)
  }

  return (
    <div className="fixed bottom-20 left-0 right-0 z-[60] flex justify-center px-4">
      <div className="bg-gray-900 text-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3 w-full max-w-md text-sm">
        <span className="flex-1 leading-snug">
          {needRefresh ? (
            <>🔄 <span className="font-medium">Nouvelle version disponible !</span><br />
              <span className="text-white/60 text-xs">Recharge pour profiter des dernières fonctionnalités</span>
            </>
          ) : (
            <>✅ <span className="font-medium">Barahub est prête hors ligne</span></>
          )}
        </span>
        {needRefresh ? (
          <>
            <button
              onClick={() => updateSW?.(true)}
              className="bg-brand-600 hover:bg-brand-800 text-white text-xs font-medium px-3 py-2 rounded-xl flex-shrink-0"
            >
              Mettre à jour
            </button>
            <button
              onClick={close}
              className="text-white/50 hover:text-white px-1 flex-shrink-0"
              aria-label="Fermer"
            >
              ✕
            </button>
          </>
        ) : (
          <button
            onClick={close}
            className="bg-brand-600 text-white text-xs font-medium px-3 py-2 rounded-xl flex-shrink-0"
          >
            OK
          </button>
        )}
      </div>
    </div>
  )
}
