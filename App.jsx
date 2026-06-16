import { useState, useEffect, useCallback } from 'react'
import { getSections, TRANSLATIONS, ALL_FIELD_IDS } from './sections.js'
import { saveSubmission, loadSubmissions, clearSubmissions } from './storage.js'
import { exportToExcel } from './export.js'

const C = {
  navy:'#0D1B2A',blue:'#1A56DB',teal:'#047481',green:'#057A55',
  violet:'#5521B5',orange:'#B45309',red:'#BE123C',gold:'#FBBF24',
  g1:'#F9FAFB',g3:'#E5E7EB',gt:'#6B7280',gd:'#111928',
}
const ADMIN_CODE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADMIN_CODE) || 'GSMI2025'

// ── DOI Field ──────────────────────────────────────────────────────────────
function DoiField({ value, onChange, lang }) {
  const T = TRANSLATIONS[lang]
  const [dois, setDois] = useState(value ? value.split('\n').filter(Boolean) : [''])
  const [statuses, setStatuses] = useState({})
  const [checking, setChecking] = useState({})

  function update(idx, val) {
    const next = [...dois]; next[idx] = val; setDois(next)
    onChange(next.filter(Boolean).join('\n'))
  }
  function addRow() { setDois([...dois, '']) }
  function removeRow(idx) {
    const next = dois.filter((_, i) => i !== idx); setDois(next.length ? next : [''])
    onChange(next.filter(Boolean).join('\n'))
  }

  async function checkDoi(idx, doi) {
    if (!doi || doi.length < 5) return
    const clean = doi.trim().replace(/^https?:\/\/doi\.org\//i, '')
    if (!/^10\.\d{4,}\//.test(clean)) {
      setStatuses(p => ({ ...p, [idx]: { ok: false, msg: T.err_doi_format } }))
      return
    }
    setChecking(p => ({ ...p, [idx]: true }))
    setStatuses(p => ({ ...p, [idx]: { ok: null, msg: '🔍 Vérification...' } }))
    try {
      const r = await fetch(`https://doi.org/api/handles/${clean}`)
      const ok = r.ok && r.status === 200
      setStatuses(p => ({ ...p, [idx]: ok
        ? { ok: true,  msg: '✅ DOI valide et résolu' }
        : { ok: false, msg: '⚠️ DOI introuvable — vérifier la valeur' }
      }))
    } catch {
      setStatuses(p => ({ ...p, [idx]: { ok: null, msg: '🌐 Vérification hors ligne — format valide' } }))
    }
    setChecking(p => ({ ...p, [idx]: false }))
  }

  return (
    <div>
      {dois.map((doi, idx) => (
        <div key={idx} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={doi}
              onChange={e => update(idx, e.target.value)}
              onBlur={e => checkDoi(idx, e.target.value)}
              placeholder="10.XXXX/XXXXX"
              style={{
                flex: 1, padding: '9px 12px', border: `1.5px solid ${statuses[idx]?.ok === false ? C.red : statuses[idx]?.ok === true ? C.green : C.g3}`,
                borderRadius: 8, fontSize: 14, color: C.gd, fontFamily: 'monospace', outline: 'none', background: '#fff',
              }}
            />
            <button onClick={() => checkDoi(idx, doi)} disabled={checking[idx]}
              style={{ padding: '9px 12px', background: C.blue, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {checking[idx] ? '...' : '🔍 Vérifier'}
            </button>
            {dois.length > 1 && (
              <button onClick={() => removeRow(idx)}
                style={{ padding: '9px 10px', background: 'transparent', color: C.gt, border: `1px solid ${C.g3}`, borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                ✕
              </button>
            )}
          </div>
          {statuses[idx] && (
            <p style={{ fontSize: 12, color: statuses[idx].ok === true ? C.green : statuses[idx].ok === false ? C.red : C.orange, margin: '4px 0 0' }}>
              {statuses[idx].msg}
            </p>
          )}
        </div>
      ))}
      <button onClick={addRow}
        style={{ marginTop: 4, background: 'transparent', color: C.blue, border: `1px dashed ${C.blue}`, borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer', width: '100%' }}>
        + Ajouter un DOI
      </button>
    </div>
  )
}

// ── Field ──────────────────────────────────────────────────────────────────
function Field({ f, form, onChange, errors, lang }) {
  const val = form[f.id] ?? ''
  const err = errors[f.id]
  const [focused, setFocused] = useState(false)

  const base = {
    width: '100%', padding: '10px 12px', outline: 'none',
    border: `1.5px solid ${err ? C.red : focused ? C.blue : C.g3}`,
    borderRadius: 8, fontSize: 14, color: C.gd, background: '#fff',
    fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color .15s',
    boxShadow: focused ? `0 0 0 3px ${C.blue}18` : 'none',
  }

  if (f.type === 'doi_field') return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.gd, marginBottom: 5 }}>
        {f.label}
      </label>
      {f.hint && <p style={{ fontSize: 12, color: C.gt, margin: '0 0 8px' }}>{f.hint}</p>}
      <DoiField value={val} onChange={v => onChange(f.id, v)} lang={lang} />
      {err && <p style={{ fontSize: 12, color: C.red, margin: '4px 0 0' }}>⚠ {err}</p>}
    </div>
  )

  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.gd, marginBottom: 5 }}>
        {f.label}{f.required && <span style={{ color: C.red, marginLeft: 3 }}>*</span>}
      </label>
      {f.hint && <p style={{ fontSize: 12, color: C.gt, margin: '0 0 6px', lineHeight: 1.4 }}>{f.hint}</p>}
      {f.type === 'textarea' ? (
        <textarea value={val} onChange={e => onChange(f.id, e.target.value)} placeholder={f.placeholder || ''}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ ...base, minHeight: 80, resize: 'vertical', lineHeight: 1.5 }} />
      ) : f.type === 'select' ? (
        <select value={val} onChange={e => onChange(f.id, e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ ...base, cursor: 'pointer' }}>
          <option value="">— Sélectionner —</option>
          {f.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={f.type === 'number' ? 'number' : f.type} value={val}
          onChange={e => onChange(f.id, e.target.value)}
          placeholder={f.placeholder || ''}
          min={f.min ?? undefined} max={f.max ?? undefined}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={base} />
      )}
      {err && <p style={{ fontSize: 12, color: C.red, margin: '5px 0 0' }}>⚠ {err}</p>}
    </div>
  )
}

function Toast({ t, bottom = 24 }) {
  return (
    <div style={{
      position: 'fixed', bottom, left: '50%', transform: 'translateX(-50%)',
      background: t.type === 'error' ? C.red : t.type === 'info' ? C.blue : C.gd,
      color: '#fff', padding: '11px 22px', borderRadius: 10, fontSize: 13,
      zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,.18)',
    }}>{t.msg}</div>
  )
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang]       = useState('fr')
  const [view, setView]       = useState('home')
  const [mode, setMode]       = useState(null)
  const [step, setStep]       = useState(0)
  const [form, setForm]       = useState({})
  const [errors, setErrors]   = useState({})
  const [subs, setSubs]       = useState([])
  const [loading, setLoading] = useState(false)
  const [adminCode, setAdminCode] = useState('')
  const [adminOk, setAdminOk]    = useState(false)
  const [toast, setToast]        = useState(null)

  const T = TRANSLATIONS[lang]

  useEffect(() => { loadSubmissions().then(setSubs) }, [])

  function showToast(msg, type = 'success') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  const sections = mode ? getSections(mode, lang) : []

  const handleChange = useCallback((id, value) => {
    setForm(p => ({ ...p, [id]: value }))
    setErrors(p => { const n = { ...p }; delete n[id]; return n })
  }, [])

  function validate(stepIdx) {
    const sec = sections[stepIdx]
    const errs = {}
    sec.fields.forEach(f => {
      const val = form[f.id] ?? ''
      if (f.required && (!val || val === '')) { errs[f.id] = lang === 'fr' ? 'Ce champ est requis' : 'This field is required'; return }
      if (f.validate) {
        const msg = f.validate(val, form)
        if (msg) errs[f.id] = msg
      }
      if (f.type === 'number' && val !== '' && (isNaN(+val) || +val < (f.min ?? -Infinity) || +val > (f.max ?? Infinity))) {
        errs[f.id] = f.max ? `${lang === 'fr' ? 'Valeur entre' : 'Value between'} ${f.min ?? 0} ${lang === 'fr' ? 'et' : 'and'} ${f.max}` : lang === 'fr' ? 'Valeur invalide' : 'Invalid value'
      }
    })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function startForm(selectedMode) {
    setMode(selectedMode)
    setForm({ mode: selectedMode })
    setStep(0)
    setErrors({})
    setView('form')
    window.scrollTo(0, 0)
  }

  function next() {
    if (!validate(step)) { showToast(lang === 'fr' ? 'Veuillez corriger les erreurs' : 'Please fix the errors', 'error'); return }
    if (step < sections.length - 1) { setStep(s => s + 1); window.scrollTo(0, 0) }
    else handleSubmit()
  }
  function prev() { setStep(s => Math.max(0, s - 1)); setErrors({}); window.scrollTo(0, 0) }

  async function handleSubmit() {
    if (!validate(step)) return
    setLoading(true)
    try {
      const all = await saveSubmission({ ...form, mode })
      setSubs(all); setView('thanks')
    } catch { showToast(lang === 'fr' ? 'Erreur. Réessayez.' : 'Error. Please retry.', 'error') }
    setLoading(false)
  }

  function handleExport() {
    if (!subs.length) { showToast(lang === 'fr' ? 'Aucune donnée' : 'No data', 'error'); return }
    exportToExcel(subs)
    showToast(lang === 'fr' ? 'Export Excel téléchargé (3 onglets)' : 'Excel export downloaded (3 tabs)')
  }

  const sec = sections[step]

  // ── HOME ──────────────────────────────────────────────────────────────
  if (view === 'home') return (
    <div style={{ minHeight: '100vh', background: C.g1, fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <style>{`*{box-sizing:border-box}button{transition:opacity .15s,transform .1s}button:hover{opacity:.87}button:active{transform:scale(.97)}`}</style>

      {/* Lang toggle */}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 100 }}>
        <div style={{ display: 'flex', background: '#fff', border: `1px solid ${C.g3}`, borderRadius: 8, overflow: 'hidden' }}>
          {['fr','en'].map(l => (
            <button key={l} onClick={() => setLang(l)}
              style={{ padding: '7px 14px', border: 'none', background: lang === l ? C.navy : 'transparent',
                       color: lang === l ? '#fff' : C.gt, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {l === 'fr' ? '🇫🇷 FR' : '🇬🇧 EN'}
            </button>
          ))}
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: C.navy, padding: '56px 24px 48px', textAlign: 'center' }}>
        {/* Logos */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 28, flexWrap: 'wrap' }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 6, background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16, color: C.gold }}>U</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.navy, letterSpacing: '.03em' }}>UM6P</span>
          </div>
          <div style={{ width: 1, height: 36, background: '#2D3F55' }} />
          <div style={{ background: '#fff', borderRadius: 10, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 6, background: C.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, color: '#fff' }}>G</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.navy, letterSpacing: '.03em' }}>GSMI</span>
          </div>
        </div>

        <p style={{ color: C.gold, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', margin: '0 0 14px', fontWeight: 600 }}>
          Green & Sustainable Mining Institute  ·  UM6P
        </p>
        <h1 style={{ color: '#fff', fontSize: 34, fontWeight: 700, margin: '0 0 10px', lineHeight: 1.15 }}>
          {lang === 'fr' ? 'Carnet du Chercheur' : 'Researcher Notebook'}
        </h1>
        <p style={{ color: '#8899BB', fontSize: 15, margin: '0 0 14px', maxWidth: 500, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
          {lang === 'fr'
            ? 'Outil de pilotage des activités académiques et de recherche — Saisie des prévisions, révision semestrielle et bilan annuel'
            : 'Academic and research activity management tool — Forecast entry, mid-year revision and annual review'}
        </p>
      </div>

      {/* Description / Axes GSMI */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px 0' }}>
        <div style={{ background: '#fff', border: `0.5px solid ${C.g3}`, borderRadius: 12, padding: '22px 24px', marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: C.navy }}>
            {lang === 'fr' ? '🎯 Objectif de l\'outil' : '🎯 Tool objective'}
          </h3>
          <p style={{ margin: '0 0 14px', fontSize: 14, color: C.gt, lineHeight: 1.65 }}>
            {lang === 'fr'
              ? 'Chaque professeur GSMI documente ses prévisions annuelles, les révise à mi-année, puis présente son bilan lors de l\'Academic Meeting (tous les 6 mois). Les données sont automatiquement consolidées pour la Direction.'
              : 'Each GSMI professor documents annual forecasts, revises them at mid-year, then presents their annual review at the Academic Meeting (every 6 months). Data is automatically consolidated for management.'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            {[
              { icon: '🗺️', label: 'Geology & Exploration', color: C.teal },
              { icon: '⚙️', label: 'Mine & Mineral Processing (MMP)', color: C.green },
              { icon: '🌍', label: 'Sustainable Mining & Environment (SME)', color: C.violet },
            ].map(ax => (
              <div key={ax.label} style={{ padding: '10px 14px', borderRadius: 8, background: ax.color + '12', borderLeft: `3px solid ${ax.color}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>{ax.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: ax.color, lineHeight: 1.3 }}>{ax.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cycle */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 28 }}>
          {[
            { mode: 'prevision',   icon: '🎯', color: C.blue,   title: T.mode_prevision,  hint: T.mode_hint_prev },
            { mode: 'revision_s1', icon: '🔄', color: C.teal,   title: T.mode_revision,   hint: T.mode_hint_rev },
            { mode: 'bilan_annuel',icon: '📊', color: C.violet, title: T.mode_bilan,      hint: T.mode_hint_bilan },
          ].map(m => (
            <button key={m.mode} onClick={() => startForm(m.mode)}
              style={{ background: '#fff', border: `1.5px solid ${C.g3}`, borderRadius: 12, padding: '18px 16px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', borderTop: `4px solid ${m.color}` }}>
              <span style={{ fontSize: 26 }}>{m.icon}</span>
              <p style={{ margin: '10px 0 5px', fontWeight: 700, fontSize: 13, color: C.gd, lineHeight: 1.2 }}>{m.title}</p>
              <p style={{ margin: 0, fontSize: 11, color: C.gt, lineHeight: 1.4 }}>{m.hint}</p>
            </button>
          ))}
        </div>

        {/* Admin link */}
        <div style={{ textAlign: 'center', paddingBottom: 40 }}>
          <button onClick={() => setView('admin')}
            style={{ background: 'transparent', color: C.gt, border: `0.5px solid ${C.g3}`, borderRadius: 8, padding: '10px 20px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            🔒 {lang === 'fr' ? 'Accès Direction GSMI' : 'GSMI Management Access'}
          </button>
        </div>
      </div>
      {toast && <Toast t={toast} />}
    </div>
  )

  // ── FORM ──────────────────────────────────────────────────────────────
  if (view === 'form' && sec) return (
    <div style={{ minHeight: '100vh', background: C.g1, fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <style>{`*{box-sizing:border-box}button:hover{opacity:.87}button:active{transform:scale(.97)}`}</style>

      {/* Header */}
      <div style={{ background: sec.color, padding: '18px 20px 0', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button onClick={() => setView('home')} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,.7)', fontSize: 13, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
              ← {lang === 'fr' ? 'Accueil' : 'Home'}
            </button>
            <span style={{ color: 'rgba(255,255,255,.65)', fontSize: 12, fontWeight: 500 }}>
              {T[`mode_${mode === 'prevision' ? 'prevision' : mode === 'revision_s1' ? 'revision' : 'bilan'}`]} · {step + 1}/{sections.length}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 22 }}>{sec.icon}</span>
            <div>
              <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 10, margin: '0 0 1px', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                {lang === 'fr' ? 'Section' : 'Section'} {step + 1} / {sections.length}
              </p>
              <h2 style={{ color: '#fff', fontSize: 17, fontWeight: 700, margin: 0 }}>{sec.title}</h2>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            {sections.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: '3px 3px 0 0',
                background: i < step ? '#4ADE80' : i === step ? '#fff' : 'rgba(255,255,255,.2)', transition: 'background .3s' }} />
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 20px 120px' }}>
        {sec.hint && (
          <div style={{ background: sec.color + '12', border: `1px solid ${sec.color}30`, borderRadius: 8, padding: '10px 14px', marginBottom: 22, borderLeft: `3px solid ${sec.color}` }}>
            <p style={{ margin: 0, fontSize: 13, color: sec.color, lineHeight: 1.5 }}>{sec.hint}</p>
          </div>
        )}
        {sec.fields.map(f => (
          <Field key={f.id} f={f} form={form} onChange={handleChange} errors={errors} lang={lang} />
        ))}
      </div>

      {/* Nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: `0.5px solid ${C.g3}`, padding: '13px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box', zIndex: 10 }}>
        <button onClick={prev} disabled={step === 0}
          style={{ background: 'transparent', border: `1px solid ${C.g3}`, borderRadius: 8, padding: '10px 18px', fontSize: 14, cursor: step === 0 ? 'not-allowed' : 'pointer', color: step === 0 ? C.gt : C.gd, opacity: step === 0 ? .35 : 1, fontFamily: 'inherit' }}>
          ← {lang === 'fr' ? 'Précédent' : 'Back'}
        </button>
        <div style={{ display: 'flex', gap: 6 }}>
          {sections.map((_, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i === step ? sec.color : i < step ? C.green : C.g3, transition: 'background .25s, transform .2s', transform: i === step ? 'scale(1.3)' : 'scale(1)' }} />
          ))}
        </div>
        <button onClick={next} disabled={loading}
          style={{ background: sec.color, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', minWidth: 110, fontFamily: 'inherit' }}>
          {loading ? '...' : step === sections.length - 1 ? (lang === 'fr' ? 'Soumettre ✓' : 'Submit ✓') : (lang === 'fr' ? 'Suivant →' : 'Next →')}
        </button>
      </div>
      {toast && <Toast t={toast} bottom={90} />}
    </div>
  )

  // ── THANKS ────────────────────────────────────────────────────────────
  if (view === 'thanks') return (
    <div style={{ minHeight: '100vh', background: C.g1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,sans-serif', padding: 20 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, margin: '0 auto 20px' }}>✓</div>
        <h2 style={{ color: C.gd, fontSize: 22, fontWeight: 700, margin: '0 0 10px' }}>
          {lang === 'fr' ? 'Réponse enregistrée !' : 'Response saved!'}
        </h2>
        <p style={{ color: C.gt, fontSize: 14, lineHeight: 1.65, margin: '0 0 24px' }}>
          {lang === 'fr'
            ? 'Votre saisie a été transmise à la Direction GSMI et consolidée dans le tableau de bord annuel.'
            : 'Your submission has been transmitted to GSMI management and consolidated in the annual dashboard.'}
        </p>
        <div style={{ background: '#EFF6FF', borderRadius: 10, padding: '14px 18px', borderLeft: `3px solid ${C.blue}`, textAlign: 'left', marginBottom: 24 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#1e40af', lineHeight: 1.6 }}>
            {lang === 'fr'
              ? 'Si vous devez compléter une autre étape (révision S1 ou bilan annuel), revenez sur l\'accueil et sélectionnez le mode correspondant.'
              : 'If you need to complete another step (S1 revision or annual review), return to the home page and select the appropriate mode.'}
          </p>
        </div>
        <button onClick={() => { setView('home'); setMode(null) }}
          style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 10, padding: '13px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          {lang === 'fr' ? '← Retour à l\'accueil' : '← Back to home'}
        </button>
      </div>
    </div>
  )

  // ── ADMIN ─────────────────────────────────────────────────────────────
  if (view === 'admin') {
    if (!adminOk) return (
      <div style={{ minHeight: '100vh', background: C.g1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ background: '#fff', border: `0.5px solid ${C.g3}`, borderRadius: 14, padding: '32px 28px', width: '100%', maxWidth: 340 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 18 }}>🔒</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: C.gd }}>
            {lang === 'fr' ? 'Accès Direction GSMI' : 'GSMI Management Access'}
          </h2>
          <p style={{ margin: '0 0 18px', fontSize: 13, color: C.gt }}>
            {lang === 'fr' ? 'Code d\'accès administrateur' : 'Administrator access code'}
          </p>
          <input type="password" value={adminCode} onChange={e => setAdminCode(e.target.value)}
            placeholder={lang === 'fr' ? 'Code d\'accès...' : 'Access code...'}
            style={{ width: '100%', padding: '11px 14px', border: `1.5px solid ${C.g3}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', marginBottom: 12, fontFamily: 'inherit', outline: 'none' }}
            onKeyDown={e => e.key === 'Enter' && (adminCode === ADMIN_CODE ? setAdminOk(true) : showToast(lang === 'fr' ? 'Code incorrect' : 'Wrong code', 'error'))} />
          <button onClick={() => adminCode === ADMIN_CODE ? setAdminOk(true) : showToast(lang === 'fr' ? 'Code incorrect' : 'Wrong code', 'error')}
            style={{ width: '100%', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 10, fontFamily: 'inherit' }}>
            {lang === 'fr' ? 'Accéder' : 'Access'}
          </button>
          <button onClick={() => setView('home')}
            style={{ width: '100%', background: 'transparent', color: C.gt, border: 'none', fontSize: 13, cursor: 'pointer', padding: 6, fontFamily: 'inherit' }}>
            ← {lang === 'fr' ? 'Retour' : 'Back'}
          </button>
        </div>
        {toast && <Toast t={toast} />}
      </div>
    )

    const prev_s = subs.filter(s => s.mode === 'prevision')
    const rev_s  = subs.filter(s => s.mode === 'revision_s1')
    const bilan_s= subs.filter(s => s.mode === 'bilan_annuel')
    const sum = (arr, k) => arr.reduce((a, s) => a + (+s[k] || 0), 0)

    // Build professor tracking
    const profs = {}
    subs.forEach(s => {
      const k = s.email || s.nom || '?'
      if (!profs[k]) profs[k] = { nom: s.nom, email: s.email, grade: s.grade, axe: s.axe_recherche, annee: s.annee_academique }
      profs[k][s.mode] = s
    })

    return (
      <div style={{ minHeight: '100vh', background: C.g1, fontFamily: 'system-ui,-apple-system,sans-serif' }}>
        <style>{`button:hover{opacity:.87}button:active{transform:scale(.97)}`}</style>

        <div style={{ background: C.navy, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <p style={{ color: C.gold, fontSize: 11, letterSpacing: '.1em', margin: '0 0 3px', textTransform: 'uppercase', fontWeight: 600 }}>GSMI — Dashboard Direction</p>
            <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>
              {lang === 'fr' ? 'Consolidation des carnets du chercheur' : 'Researcher Notebook Consolidation'}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={handleExport}
              style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              ⬇ {lang === 'fr' ? 'Exporter Excel' : 'Export Excel'}
            </button>
            <button onClick={() => { setAdminOk(false); setAdminCode(''); setView('home') }}
              style={{ background: 'transparent', color: '#8899BB', border: '1.5px solid #2D3F55', borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {lang === 'fr' ? 'Déconnexion' : 'Sign out'}
            </button>
          </div>
        </div>

        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '22px 18px' }}>

          {/* Mode KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: lang === 'fr' ? 'Prévisions saisies' : 'Forecasts entered', count: prev_s.length, color: C.blue, icon: '🎯' },
              { label: lang === 'fr' ? 'Révisions S1' : 'S1 Revisions', count: rev_s.length, color: C.teal, icon: '🔄' },
              { label: lang === 'fr' ? 'Bilans annuels' : 'Annual reviews', count: bilan_s.length, color: C.violet, icon: '📊' },
            ].map(k => (
              <div key={k.label} style={{ background: '#fff', border: `0.5px solid ${C.g3}`, borderRadius: 10, padding: '14px 18px', borderTop: `3px solid ${k.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span>{k.icon}</span>
                  <p style={{ margin: 0, fontSize: 12, color: C.gt }}>{k.label}</p>
                </div>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: C.gd }}>{k.count}</p>
              </div>
            ))}
          </div>

          {/* Comparison KPI table */}
          <div style={{ background: '#fff', border: `0.5px solid ${C.g3}`, borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ background: C.navy, padding: '12px 18px' }}>
              <h3 style={{ color: '#fff', margin: 0, fontSize: 14, fontWeight: 600 }}>
                {lang === 'fr' ? 'Comparaison Prévu / Révision S1 / Réalisé' : 'Forecast / S1 Revision / Achieved Comparison'}
              </h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.g1 }}>
                  {[lang === 'fr' ? 'Indicateur' : 'Indicator', lang === 'fr' ? 'Prévision' : 'Forecast', 'Révision S1', lang === 'fr' ? 'Réalisé' : 'Achieved', 'Écart'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', color: C.gt, fontWeight: 600, textAlign: h === (lang === 'fr' ? 'Indicateur' : 'Indicator') ? 'left' : 'center', fontSize: 12, borderBottom: `1px solid ${C.g3}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  [lang === 'fr' ? 'Publications acceptées' : 'Accepted publications', 'prev_pub_total', 'pub_acceptees', 'pub_acceptees'],
                  ['Publications Q1/Q2', 'prev_pub_q1q2', 'pub_q1q2', 'pub_q1q2'],
                  ['Citations', 'prev_citations', 'citations', 'citations'],
                  [lang === 'fr' ? 'Projets obtenus' : 'Projects obtained', 'prev_projets_obt', 'projets_obtenus', 'projets_obtenus'],
                  [lang === 'fr' ? 'Budget (MAD)' : 'Budget (MAD)', 'prev_budget', 'budget_mad', 'budget_mad'],
                  [lang === 'fr' ? 'H. Formation initiale' : 'H. Initial training', 'prev_h_init', 'h_initiale', 'h_initiale'],
                  [lang === 'fr' ? 'Doctorants encadrés' : 'PhD students supervised', 'prev_doctorants', 'doctorants', 'doctorants'],
                ].map(([label, prevKey, revKey, bilanKey], i) => {
                  const p = sum(prev_s, prevKey), r = sum(rev_s, revKey), b = sum(bilan_s, bilanKey)
                  const ecart = b - p
                  const ecartColor = ecart >= 0 ? C.green : C.red
                  return (
                    <tr key={label} style={{ borderBottom: `0.5px solid ${C.g3}`, background: i % 2 === 0 ? '#fff' : C.g1 }}>
                      <td style={{ padding: '10px 14px', color: C.gd, fontWeight: 500 }}>{label}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', color: C.blue, fontWeight: 600 }}>{p || '—'}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', color: C.teal, fontWeight: 600 }}>{r || '—'}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', color: C.violet, fontWeight: 600 }}>{b || '—'}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {p > 0 && b > 0 ? <span style={{ color: ecartColor, fontWeight: 700 }}>{ecart > 0 ? '+' : ''}{ecart}</span> : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Professor tracking table */}
          <div style={{ background: '#fff', border: `0.5px solid ${C.g3}`, borderRadius: 12, overflow: 'auto', marginBottom: 16 }}>
            <div style={{ background: C.green, padding: '12px 18px' }}>
              <h3 style={{ color: '#fff', margin: 0, fontSize: 14, fontWeight: 600 }}>
                {lang === 'fr' ? '✅ Suivi des soumissions par professeur' : '✅ Submission tracking by professor'}
              </h3>
            </div>
            {Object.keys(profs).length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <p style={{ color: C.gt, margin: 0 }}>{lang === 'fr' ? 'Aucune soumission reçue.' : 'No submissions received.'}</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 700 }}>
                <thead>
                  <tr style={{ background: C.g1 }}>
                    {['Nom', 'Grade', lang === 'fr' ? 'Axe' : 'Axis', lang === 'fr' ? 'Année' : 'Year', '🎯 Prévision', '🔄 Révision S1', '📊 Bilan annuel', lang === 'fr' ? 'Complétude' : 'Completion'].map(h => (
                      <th key={h} style={{ padding: '9px 12px', color: C.gt, fontWeight: 600, textAlign: 'left', fontSize: 11, borderBottom: `1px solid ${C.g3}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(profs).map(([k, p], i) => {
                    const done = [p.prevision, p.revision_s1, p.bilan_annuel].filter(Boolean).length
                    const pct = Math.round((done / 3) * 100)
                    const pctColor = pct === 100 ? C.green : pct >= 33 ? C.orange : C.red
                    return (
                      <tr key={k} style={{ borderBottom: `0.5px solid ${C.g3}`, background: i % 2 === 0 ? '#fff' : C.g1 }}>
                        <td style={{ padding: '9px 12px', fontWeight: 600, color: C.gd }}>{p.nom || '—'}</td>
                        <td style={{ padding: '9px 12px', color: C.gt, fontSize: 11 }}>{p.grade || '—'}</td>
                        <td style={{ padding: '9px 12px', color: C.gt, fontSize: 10 }}>{p.axe || '—'}</td>
                        <td style={{ padding: '9px 12px', color: C.gt }}>{p.annee || '—'}</td>
                        {['prevision','revision_s1','bilan_annuel'].map(m => (
                          <td key={m} style={{ padding: '9px 12px', textAlign: 'center' }}>
                            {p[m] ? <span style={{ color: C.green, fontSize: 16 }}>✅</span> : <span style={{ color: C.g3, fontSize: 16 }}>⏳</span>}
                          </td>
                        ))}
                        <td style={{ padding: '9px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: C.g3, borderRadius: 3 }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: pctColor, borderRadius: 3, transition: 'width .3s' }} />
                            </div>
                            <span style={{ fontSize: 11, color: pctColor, fontWeight: 600, minWidth: 30 }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <p style={{ fontSize: 12, color: C.gt, margin: 0 }}>
              {subs.length} {lang === 'fr' ? 'soumission(s) · Export Excel : Dashboard KPI + Données brutes + Suivi' : 'submission(s) · Excel export: KPI Dashboard + Raw data + Tracking'}
            </p>
            <button onClick={() => { if (confirm(lang === 'fr' ? 'Supprimer toutes les données ?' : 'Delete all data?')) { clearSubmissions(); setSubs([]) } }}
              style={{ background: 'transparent', color: C.gt, border: `0.5px solid ${C.g3}`, borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              {lang === 'fr' ? 'Effacer les données' : 'Clear data'}
            </button>
          </div>
        </div>
        {toast && <Toast t={toast} />}
      </div>
    )
  }

  return null
}
