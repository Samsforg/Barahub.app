import { useEffect, useState } from 'react'
import { Link } from 'wouter'
import { supabase } from '../lib/supabase'
import type { Category, Artisan } from '../lib/types'
import { useAuth } from '../hooks/use-auth'

export default function Home() {
  const { user, profile } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [artisans, setArtisans] = useState<Artisan[]>([])
  const [loading, setLoading] = useState(true)
  const [showUrgent, setShowUrgent] = useState(false)
  const [urgentForm, setUrgentForm] = useState({ problem_type: 'Coupure électrique', commune: 'Cocody', phone: '' })
  const [urgentSent, setUrgentSent] = useState(false)

  useEffect(() => {
    async function load() {
      const [catsRes, artRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('artisans').select('*, profiles(full_name, avatar_url), categories(name, icon)')
          .eq('verified', true).order('rating', { ascending: false }).limit(6),
      ])
      if (catsRes.data) setCategories(catsRes.data)
      if (artRes.data) setArtisans(artRes.data as Artisan[])
      setLoading(false)
    }
    load()
  }, [])

  async function sendUrgent() {
    await supabase.from('urgent_requests').insert({
      user_id: user?.id || null,
      problem_type: urgentForm.problem_type,
      description: urgentForm.problem_type,
      commune: urgentForm.commune,
      phone: urgentForm.phone,
      status: 'pending',
    })
    setUrgentSent(true)
    setTimeout(() => { setShowUrgent(false); setUrgentSent(false) }, 2000)
  }

  function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-brand-600 px-4 pt-12 pb-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1 text-white/80 text-xs">
            <span>📍</span> Abidjan, Côte d'Ivoire
          </div>
          {user ? (
            <Link href="/profile">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white text-xs font-medium">
                {initials(profile?.full_name || user.email || 'U')}
              </div>
            </Link>
          ) : (
            <Link href="/login" className="text-white/90 text-xs border border-white/30 rounded-full px-3 py-1">
              Connexion
            </Link>
          )}
        </div>
        <h1 className="text-white text-xl font-semibold mb-3">
          {profile ? `Bonjour ${profile.full_name.split(' ')[0]} 👋` : 'BáraHub 👋'}
        </h1>
        <Link href="/search">
          <div className="bg-white/15 border border-white/20 rounded-xl px-4 py-3 flex items-center gap-2 text-white/70 text-sm">
            🔍 Quel artisan cherchez-vous ?
          </div>
        </Link>
      </div>

      {/* Urgence */}
      <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3 cursor-pointer"
        onClick={() => setShowUrgent(true)}>
        <span className="text-2xl">🚨</span>
        <div className="flex-1">
          <div className="text-sm font-medium text-red-700">Dépannage urgent — 15 min</div>
          <div className="text-xs text-red-500">Un artisan chez vous rapidement</div>
        </div>
        <span className="text-red-400">›</span>
      </div>

      {/* Catégories */}
      <div className="mt-5">
        <div className="flex justify-between items-center px-4 mb-3">
          <h2 className="text-sm font-medium text-gray-600">Catégories</h2>
          <Link href="/search" className="text-xs text-brand-600">Voir tout</Link>
        </div>
        {loading ? (
          <div className="flex gap-3 px-4 overflow-x-auto">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-14 h-16 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex gap-3 px-4 overflow-x-auto pb-1 scrollbar-none">
            {categories.map(cat => (
              <Link key={cat.id} href={`/search?category=${cat.id}`}>
                <div className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer">
                  <div className="w-14 h-14 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-2xl shadow-sm">
                    {cat.icon}
                  </div>
                  <span className="text-xs text-gray-500 text-center max-w-14 leading-tight">{cat.name}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Artisans vedettes */}
      <div className="mt-6 px-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-medium text-gray-600">Artisans disponibles</h2>
          <Link href="/search" className="text-xs text-brand-600">Voir tout</Link>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-3 flex gap-3 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : artisans.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <div className="text-4xl mb-2">🔨</div>
            <p className="text-sm">Aucun artisan disponible pour l'instant</p>
            <p className="text-xs mt-1">Revenez bientôt !</p>
          </div>
        ) : (
          <div className="space-y-3">
            {artisans.map(a => (
              <Link key={a.id} href={`/artisan/${a.id}`}>
                <div className="bg-white border border-gray-100 rounded-xl p-3 flex gap-3 shadow-sm">
                  <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center text-brand-800 font-medium text-sm flex-shrink-0">
                    {initials(a.profiles?.full_name || 'AR')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {a.status === 'online' && <span className="w-2 h-2 bg-green-400 rounded-full" />}
                      <span className="text-sm font-medium">{a.profiles?.full_name || 'Artisan'}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {a.categories?.icon} {a.categories?.name} · {a.commune || 'Abidjan'}
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-amber-600">⭐ {(a.rating ?? 0).toFixed(1)} ({a.review_count ?? 0} avis)</span>
                      {a.verified && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Vérifié</span>}
                      {a.hourly_rate && <span className="text-xs font-medium text-brand-600">{a.hourly_rate.toLocaleString()} F/h</span>}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Modal urgence */}
      {showUrgent && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={() => setShowUrgent(false)}>
          <div className="bg-white rounded-t-2xl w-full p-5" onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 bg-gray-300 rounded mx-auto mb-4" />
            {urgentSent ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-2">✅</div>
                <p className="font-medium text-brand-900">Demande envoyée !</p>
                <p className="text-sm text-gray-500 mt-1">Un artisan vous contacte dans 15 minutes</p>
              </div>
            ) : (
              <>
                <h3 className="text-base font-semibold text-red-700 mb-1">🚨 Dépannage urgent</h3>
                <p className="text-xs text-gray-500 mb-4">Un artisan disponible vous contacte en moins de 15 minutes</p>
                <div className="space-y-3">
                  <select
                    value={urgentForm.problem_type}
                    onChange={e => setUrgentForm(f => ({ ...f, problem_type: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                  >
                    {['Coupure électrique','Fuite d\'eau','Porte bloquée','Climatiseur en panne','Serrure cassée'].map(v => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                  <select
                    value={urgentForm.commune}
                    onChange={e => setUrgentForm(f => ({ ...f, commune: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                  >
                    {['Cocody','Yopougon','Plateau','Marcory','Abobo','Adjamé','Treichville'].map(v => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    placeholder="+225 07 00 00 00 00"
                    value={urgentForm.phone}
                    onChange={e => setUrgentForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                  />
                  <button
                    onClick={sendUrgent}
                    disabled={!urgentForm.phone}
                    className="w-full bg-red-500 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50"
                  >
                    Envoyer la demande urgente
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
