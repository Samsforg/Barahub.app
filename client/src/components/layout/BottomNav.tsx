import { Link, useLocation } from 'wouter'

const navItems = [
  { href: '/',          icon: '🏠', label: 'Accueil'   },
  { href: '/search',   icon: '🔍', label: 'Rechercher' },
  { href: '/messages', icon: '💬', label: 'Messages'   },
  { href: '/profile',  icon: '👤', label: 'Profil'     },
]

export default function BottomNav() {
  const [location] = useLocation()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40 safe-area-pb">
      <div className="flex max-w-lg mx-auto">
        {navItems.map(item => {
          const active = location === item.href || (item.href !== '/' && location.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <div className={`flex flex-col items-center py-2.5 gap-0.5 ${active ? 'text-brand-600' : 'text-gray-500'}`}>
                <span className="text-xl">{item.icon}</span>
                <span className="text-xs">{item.label}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
