import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { useAuth } from '../hooks/use-auth'

export function normalizePhone(raw: string): string {
  let p = raw.replace(/[\s.\-()]/g, '')
  if (p.startsWith('+')) return p
  p = p.replace(/^00/, '')
  if (p.startsWith('225')) p = '+' + p
  else if (p.startsWith('0')) p = '+225' + p.slice(1)
  else p = '+225' + p
  return p
}

export default function Login() {
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signInWithPhone, verifyOtp } = useAuth()
  const [, navigate] = useLocation()

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithPhone(normalizePhone(phone))
      setStep('code')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\u2019envoi du code')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await verifyOtp(normalizePhone(phone), code.replace(/\D/g, ''))
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Code invalide ou expiré')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-brand-900">Barahub</h1>
          <p className="text-sm text-gray-500 mt-1">
            {step === 'phone'
              ? 'Connectez-vous avec votre numéro de téléphone'
              : `Code envoyé au ${phone}`}
          </p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Numéro de téléphone</label>
              <div className="flex items-stretch border border-gray-200 rounded-lg overflow-hidden focus-within:border-brand-600">
                <span className="bg-gray-50 border-r border-gray-200 px-3 py-2.5 text-sm text-gray-600 flex items-center">
                  🇨🇮 +225
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
                  placeholder="07 00 00 00 00"
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-60"
            >
              {loading ? 'Envoi...' : 'Recevoir mon code'}
            </button>
            <p className="text-xs text-gray-500 text-center">
              📱 Vous recevrez un code de vérification par SMS/WhatsApp
            </p>
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
              {loading ? 'Vérification...' : 'Vérifier et me connecter'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('phone'); setCode(''); setError('') }}
              className="w-full text-xs text-brand-600"
            >
              ← Modifier le numéro / Renvoyer le code
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-4">
          Pas encore de compte ?{' '}
          <Link href="/register" className="text-brand-600 font-medium">S'inscrire</Link>
        </p>
      </div>
    </div>
  )
}
