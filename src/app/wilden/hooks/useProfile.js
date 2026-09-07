'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { S } from '../engine/machine'
import { newProfile, remoteAdds, validCode } from '../engine/profile'
import { loadProfile, saveProfile, clearProfile, pushWorld, pullPlayer, syncState, serverConfigured } from '../engine/sync'

// ─── הפרופיל, מחובר למכונה ───
// הקוד בטלפון; העולם נשלח לשרת אחרי כל שינוי בהתקדמות, ונמשך ממנו
// בכניסה (רק בין מסעות — לא באמצע הליכה). המשחק לא מחכה לשרת אף פעם.

const PUSH_DEBOUNCE_MS = 1200

export function useProfile({ g, dispatch, booted }) {
  const [profile, setProfile] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [sync, setSync] = useState({ ok: false, reason: 'never', at: null })
  const pulledFor = useRef(null)

  useEffect(() => {
    if (!booted) return
    setProfile(loadProfile())
    setSync(syncState())
    setLoaded(true)
  }, [booted])

  // ── משיכה בכניסה ──
  // פעם אחת לכל קוד. אם בשרת יש יותר — ממזגים. זה מה שמונע "שוב נימי"
  // כשנכנסים מדפדפן אחר.
  useEffect(() => {
    if (!profile?.code || g.state !== S.BROKEN_WORLD || pulledFor.current === profile.code) return
    pulledFor.current = profile.code
    let dead = false
    pullPlayer(profile.code).then(r => {
      if (dead || !r.ok) return
      const remote = r.row?.world?.progress
      if (remote && remoteAdds(g.progress, remote)) dispatch({ type: 'IMPORT_PROGRESS', progress: remote })
    })
    return () => { dead = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.code, g.state])

  // ── דחיפה אחרי כל שינוי בהתקדמות ──
  const gRef = useRef(g); gRef.current = g
  useEffect(() => {
    if (!profile?.code || !loaded) return
    const id = setTimeout(() => {
      pushWorld(profile, gRef.current).then(() => setSync(syncState()))
    }, PUSH_DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [profile, loaded, g.progress])

  const create = useCallback(name => {
    const p = newProfile({ name })
    saveProfile(p)
    setProfile(p)
    setError(null)
    if (switching) { dispatch({ type: 'RESET_WORLD' }); setSwitching(false) }
    return p
  }, [switching, dispatch])

  const restore = useCallback(async code => {
    if (!validCode(code)) { setError('short'); return false }
    setBusy(true); setError(null)
    const r = await pullPlayer(code)
    setBusy(false)
    if (!r.ok) { setError(r.reason); return false }
    const p = { code: r.row.code, name: r.row.name || 'שחקן', created: new Date().toISOString() }
    saveProfile(p)
    const remote = r.row.world?.progress || null
    if (switching) { dispatch({ type: 'RESET_WORLD', progress: remote }); setSwitching(false) }
    else if (remote) dispatch({ type: 'IMPORT_PROGRESS', progress: remote })
    pulledFor.current = p.code
    setProfile(p)
    return true
  }, [switching, dispatch])

  const switchPlayer = useCallback(() => { setSwitching(true); setError(null) }, [])
  const cancelSwitch = useCallback(() => setSwitching(false), [])
  const forget = useCallback(() => { clearProfile(); setProfile(null) }, [])

  return {
    profile, loaded, switching, busy, error, sync,
    server: serverConfigured(),
    create, restore, switchPlayer, cancelSwitch, forget,
    needsGate: loaded && (!profile || switching) && g.state === S.BROKEN_WORLD,
  }
}
