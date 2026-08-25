import { useEffect, useState } from 'react'
import { useLocation, useRoute } from 'wouter'
import { supabase } from '../lib/supabase'
import type { Artisan } from '../lib/types'
import { useAuth } from '../hooks/use-auth'

export default function ArtisanDetail() {
  const [, params] = useRoute('/artisan/:id')
  const [artisan, setArtisan] = useState<Artisan | null>(null)
  const [loading, setLoading] = useState(true)
  const [showQuote, setShowQuote] = useState(false)
  const [quoteForm, setQuoteForm] = useState({ service_type: '', description: '', address: '', budget: '' })
  const [quoteSent, setQuoteSent] = useState(false)
  const { user } = useAuth()
  const [, navigate] = useLocation()

  useEffect(() => {
    if (!params?.id) return
    supabase
      .from('artisans')
      .select('*, profiles(*), categories(*), reviews(*, profiles(full_name))')
      .eq('id', params.id)
      .single()
      .then(({ data }) => {
        setArtisan(data as Artisan)
        setLoading(false)
      })
  }, [params?.id])

  async function sendQuote() {
    if (!user) { navigate('/login'); return }
    await supabase.from('quote_requests').insert({
      user_id: user.id,
      artisan_id: artisan!.id,
      service_type: quoteForm.service_type,
      description: quoteForm.description,
      address: quoteForm.address || null,
      budget: quoteForm.budget ? parseInt(quoteForm.budget) : null,
      status: 'pending',
    })
    setQuoteSent(true)
    setTimeout(() => { setShowQuote(false); setQuoteSent(false) }, 2000)
  }

  function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!artisan) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">
      <div className="text-center"><div className="text-4xl mb-2">😕</div><p>Artisan introuvable</p></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-brand-50 px-4 pt-12 pb-5">
        <button onClick={() => navigate(-1 as unknown as string)} className="text-brand-800 text-sm mb-4 flex items-center gap-1">
          ← Retour
        </button>
        <div className="flex gap-3">
          <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center text-brand-800 font-semibold text-xl flex-shrink-0">
            {initials(artisan.profiles?.full_name || 'AR')}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{artisan.profiles?.full_name}</h1>
            <div className="text-sm text-brand-600">{artisan.categories?.icon} {artisan.categories?.name}</div>
            <div className="text-xs text-gray-500 mt-0.5">📍 {artisan.commune} · {artisan.years_experience} ans d'exp.</div>
            <div className="flex gap-2 mt-1.5">
              {artisan.verified && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Vérifié</span>}
              <span className={`text-xs px-2 py-0.5 rounded-full ${artisan.status === 'online' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                {artisan.status === 'online' ? 'En ligne' : 'Hors ligne'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex mt-4 border border-brand-100 rounded-xl overflow-hidden bg-white/60">
          {[
            { val: artisan.rating.toFixed(1), lbl: 'Note' },
            { val: artisan.review_count, lbl: 'Avis' },
            { val: `${(artisan.hourly_rate || 0).toLocaleString()}F`, lbl: 'FCFA/h' },
          ].map((s, i) => (
            <div key={i} className={`flex-1 text-center py-3 ${i < 2 ? 'border-r border-brand-100' : ''}`}>
              <div className="text-base font-semibold text-gray-900">{s.val}</div>
              <div className="text-xs text-gray-500">{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bio */}
      <div className="px-4 py-4 border-b border-gray-100 bg-white">
        <h2 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">À propos</h2>
        <p className="text-sm text-gray-600 leading-relaxed">{artisan.description || 'Artisan professionnel disponible pour vos travaux.'}</p>
      </div>

      {/* Spécialités */}
      {artisan.specialties?.length > 0 && (
        <div className="px-4 py-4 border-b border-gray-100 bg-white">
          <h2 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">Spécialités</h2>
          <div className="flex flex-wrap gap-2">
            {artisan.specialties.map((s, i) => (
              <span key={i} className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Avis */}
      <div className="px-4 py-4 bg-white">
        <h2 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-3">Avis clients ({artisan.review_count})</h2>
        {artisan.reviews && artisan.reviews.length > 0 ? artisan.reviews.slice(0, 3).map((r, i) => (
          <div key={i} className="mb-4 pb-4 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                {initials(r.profiles?.full_name || 'U')}
              </div>
              <div>
                <div className="text-xs font-medium">{r.profiles?.full_name || 'Utilisateur'}</div>
                <div className="text-amber-500 text-xs">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
              </div>
            </div>
            {r.comment && <p className="text-xs text-gray-500 leading-relaxed">{r.comment}</p>}
          </div>
        )) : (
          <p className="text-sm text-gray-600">Pas encore d'avis. Soyez le premier !</p>
        )}
      </div>

      {/* CTA fixe */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-3 max-w-lg mx-auto">
        <button
          onClick={() => user ? navigate(`/chat/${artisan.user_id}`) : navigate('/login')}
          className="w-12 h-12 border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 flex-shrink-0"
        >
          💬
        </button>
        <button
          onClick={() => setShowQuote(true)}
          className="flex-1 bg-brand-600 text-white rounded-xl py-3 text-sm font-medium"
        >
          Demander un devis
        </button>
      </div>

      {/* Modal devis */}
      {showQuote && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={() => setShowQuote(false)}>
          <div className="bg-white rounded-t-2xl w-full p-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 bg-gray-300 rounded mx-auto mb-4" />
            {quoteSent ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-2">✅</div>
                <p className="font-medium">Demande envoyée !</p>
                <p className="text-sm text-gray-500 mt-1">L'artisan vous répondra bientôt.</p>
              </div>
            ) : (
              <>
                <h3 className="text-base font-semibold mb-4">Demande de devis</h3>
                <div className="space-y-3">
                  <input
                    placeholder="Type de service (ex: installation électrique)"
                    value={quoteForm.service_type}
                    onChange={e => setQuoteForm(f => ({ ...f, service_type: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                  />
                  <textarea
                    placeholder="Décrivez votre besoin en détail…"
                    value={quoteForm.description}
                    onChange={e => setQuoteForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none"
                    rows={3}
                  />
                  <input
                    placeholder="Adresse d'intervention"
                    value={quoteForm.address}
                    onChange={e => setQuoteForm(f => ({ ...f, address: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Budget estimé (FCFA)"
                    value={quoteForm.budget}
                    onChange={e => setQuoteForm(f => ({ ...f, budget: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                  />
                  <button
                    onClick={sendQuote}
                    disabled={!quoteForm.service_type || !quoteForm.description}
                    className="w-full bg-brand-600 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50"
                  >
                    Envoyer la demande
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
