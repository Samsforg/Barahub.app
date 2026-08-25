import { useLocation } from 'wouter'
import { useAuth } from '../hooks/use-auth'

export default function Profile() {
  const { user, profile, signOut, loading } = useAuth()
  const [, navigate] = useLocation()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!user) {
    navigate('/login')
    return null
  }

  function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const menuItems = [
    { icon: '📋', label: 'Mes demandes de devis', action: () => {} },
    { icon: '💬', label: 'Mes messages', action: () => navigate('/messages') },
    { icon: '⭐', label: 'Mes avis', action: () => {} },
    { icon: '📍', label: 'Mes adresses', action: () => {} },
    { icon: '📱', label: 'Paiements Mobile Money', action: () => {} },
    { icon: '⚙️', label: 'Paramètres', action: () => {} },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-brand-50 px-4 pt-12 pb-6 flex flex-col items-center gap-3 border-b border-brand-100">
        <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center text-brand-800 text-2xl font-semibold">
          {initials(profile?.full_name || user.email || 'U')}
        </div>
        <div className="text-center">
          <h1 className="text-lg font-semibold">{profile?.full_name || 'Utilisateur'}</h1>
          <p className="text-sm text-gray-500">{user.email}</p>
          {profile?.phone && <p className="text-xs text-gray-400 mt-0.5">{profile.phone}</p>}
        </div>
        {profile?.is_artisan && (
          <span className="bg-brand-600 text-white text-xs px-3 py-1 rounded-full">Artisan</span>
        )}
      </div>

      {/* Menu */}
      <div className="mt-4 bg-white border border-gray-100 rounded-xl mx-4 overflow-hidden">
        {menuItems.map((item, i) => (
          <button
            key={i}
            onClick={item.action}
            className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0 text-left"
          >
            <span className="text-xl w-8 text-center">{item.icon}</span>
            <span className="text-sm flex-1">{item.label}</span>
            <span className="text-gray-300">›</span>
          </button>
        ))}
      </div>

      <div className="mx-4 mt-4">
        <button
          onClick={handleSignOut}
          className="w-full bg-red-50 text-red-600 border border-red-100 rounded-xl py-3 text-sm font-medium"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
