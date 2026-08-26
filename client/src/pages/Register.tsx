import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { useAuth } from '../hooks/use-auth'
import { normalizePhone } from './Login'

export default function Register() {
  const [step, setStep] = useState<'infos' | 'code' | 'done'>('infos')
  const [form, setForm] = useState({ fullName: '', phone: '', isArtisan: false })
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signInWithPhone, verifyOtp } = useAuth()
  const [, navigate] = useLocation()

  function update(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.fullName.trim().length < 3) {
      setError('Entrez votre nom complet')
      return
    }
    setLoading(true)
    try {
      await signInWithPhone(normalizePhone(form.phone), form.fullName.trim(), form.isArtisan)
      setStep('code')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi du code")
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await verifyOtp(normalizePhone(form.phone), code.replace(/\D/g, ''))
      setStep('done')
      setTimeout(() => navigate('/'), 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Code invalide ou expiré')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-brand-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl p-6 text-center shadow-sm">
          <div className="text-4xl mb-3">✅</div>
          <h2 className="text-lg font-semibold text-brand-900">Bienvenue sur Barahub !</h2>
          <p className="text-sm text-gray-500 mt-1">
            Votre compte est créé. Redirection...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-brand-900">Barahub</h1>
          <p className="text-sm text-gray-500 mt-1">
            {step === 'infos'
              ? 'Créez votre compte avec votre numéro'
              : `Code envoyé au ${form.phone}`}
          </p>
        </div>

        {step === 'infos' ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Nom complet</label>
              <input
                value={form.fullName}
                onChange={e => update('fullName', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-600"
                placeholder="Mariam Koné"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Numéro de téléphone</label>
              <div className="flex items-stretch border border-gray-200 rounded-lg overflow-hidden focus-within:border-brand-600">
                <span className="bg-gray-50 border-r border-gray-200 px-3 py-2.5 text-sm text-gray-600 flex items-center">
                  🇨🇮 +225
                </span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => update('phone', e.target.value)}
                  className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
                  placeholder="07 00 00 00 00"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                📱 Sert aussi pour vous contacter via WhatsApp
              </p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isArtisan}
                onChange={e => update('isArtisan', e.target.checked)}
                className="w-4 h-4 accent-brand-600"
              />
              <span className="text-sm text-gray-600">Je suis un artisan / prestataire</span>
            </label>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-60"
            >
              {loading ? 'Envoi...' : 'Recevoir mon code de vérification'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Code de vérification</label>
              <input
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-lg tracking-[0.4em] text-center focus:outline-none focus:border-brand-600"
                placeholder="000000"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full bg-brand-600 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-60"
            >
              {loading ? 'Vérification...' : 'Vérifier et créer mon compte'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('infos'); setCode(''); setError('') }}
              className="w-full text-xs text-brand-600"
            >
              ← Modifier mes informations
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-4">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-brand-600 font-medium">Se connecter</Link>
        </p>
      </div>
    </div>
  )
}
