import { useEffect, useState } from 'react'
import { Link } from 'wouter'
import { supabase } from '../lib/supabase'
import type { Artisan } from '../lib/types'

const COMMUNES = ['Tous', 'Cocody', 'Yopougon', 'Plateau', 'Marcory', 'Abobo', 'Adjamé', 'Treichville']

export default function Search() {
  const [artisans, setArtisans] = useState<Artisan[]>([])
  const [loading, setLoading] = useState(true)
  const [commune, setCommune] = useState('Tous')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase
        .from('artisans')
        .select('*, profiles(full_name, avatar_url), categories(name, icon)')
        .order('rating', { ascending: false })
      if (commune !== 'Tous') query = query.eq('commune', commune)
      const { data } = await query
      setArtisans((data as Artisan[]) || [])
      setLoading(false)
    }
    load()
  }, [commune])

  function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  const filtered = artisans.filter(a =>
    !search || (a.profiles?.full_name || '').toLowerCase().includes(search.toLowerCase())
    || (a.categories?.name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 sticky top-0 z-10">
        <input
          type="text"
          placeholder="🔍 Électricien, plombier…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none"
        />
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
          {COMMUNES.map(c => (
            <button
              key={c}
              onClick={() => setCommune(c)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                commune === c
                  ? 'bg-brand-600 border-brand-600 text-white'
                  : 'border-gray-200 text-gray-500'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-3 flex gap-3 animate-pulse">
              <div className="w-12 h-12 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">🔍</div>
            <p className="text-sm">Aucun artisan trouvé</p>
          </div>
        ) : filtered.map(a => (
          <Link key={a.id} href={`/artisan/${a.id}`}>
            <div className="bg-white border border-gray-100 rounded-xl p-3 flex gap-3 shadow-sm">
              <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center text-brand-800 font-medium text-sm flex-shrink-0">
                {initials(a.profiles?.full_name || 'AR')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {a.status === 'online' && <span className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0" />}
                  <span className="text-sm font-medium truncate">{a.profiles?.full_name || 'Artisan'}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {a.categories?.icon} {a.categories?.name} · {a.commune || 'Abidjan'} · {a.years_experience} ans exp.
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-amber-600">⭐ {a.rating.toFixed(1)} ({a.review_count})</span>
                  <div className="flex items-center gap-2">
                    {a.verified && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Vérifié</span>}
                    {a.hourly_rate && <span className="text-xs font-medium text-brand-600">{a.hourly_rate.toLocaleString()} F/h</span>}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
