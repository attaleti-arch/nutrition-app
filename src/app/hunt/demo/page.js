'use client'
import { useState } from 'react'
import { MONSTERS } from '../monsters'
import { AVATARS } from '../avatars'
import { EncounterScene, ENCOUNTER_CSS, RARITY, rollRarity } from '../encounter'
import { ENEMIES } from '../world'

// עמוד תצוגה למסך המפגש בלבד. לא חלק מהמשחק — כאן אפשר לראות את הרגע
// שוב ושוב בכל הווריאציות, בלי לצאת מהבית.

const C = { cream: '#F3EDE1', card: '#FBF7EE', ink: '#22271E', soft: '#5A6154', olive: '#3F5C53', line: '#DCD2BE' }

export default function EncounterDemo() {
  const [run, setRun] = useState(null)
  const [avatar, setAvatar] = useState('nova')
  const [diff, setDiff] = useState('normal')
  const [honey, setHoney] = useState(2)
  const [log, setLog] = useState([])

  function start(forced) {
    setRun({
      key: Date.now(),
      monsterId: MONSTERS[Math.floor(Math.random() * MONSTERS.length)].id,
      rarity: forced ? RARITY[forced] : rollRarity(diff),
      enemy: Math.random() < 0.35 ? ENEMIES[Math.floor(Math.random() * ENEMIES.length)] : null,
      index: 1 + Math.floor(Math.random() * 5),
    })
  }

  function resolve(r) {
    setHoney(h => Math.max(0, h - (r.honeySpent || 0)) + (r.caught ? 0 : 0))
    setLog(l => [`${r.caught ? '✓ נתפס' : '✗ חמק'} · ${r.action} · ${r.rarity}${r.loot.length ? ' · +' + r.loot.length : ''}`, ...l].slice(0, 6))
    setRun(null)
  }

  return (
    <div dir="rtl" style={{ minHeight: '100dvh', background: C.cream, color: C.ink, fontFamily: '"Heebo", system-ui, sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: ENCOUNTER_CSS }} />
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '26px 18px 60px' }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: '0 0 6px' }}>מסך המפגש</h1>
        <p style={{ color: C.soft, margin: '0 0 24px', lineHeight: 1.6 }}>
          תצוגה בלבד — הרגע שקורה כשמגיעים ליצור. לחצו כמה פעמים: הנדירות,
          היצור, האויב והתוצאה משתנים בכל פעם.
        </p>

        <p style={lbl}>אוואטר</p>
        <div style={row}>
          {AVATARS.map(a => (
            <button key={a.id} onClick={() => setAvatar(a.id)}
              style={{ ...chip, ...(avatar === a.id ? chipOn : {}) }}>{a.name}</button>
          ))}
        </div>

        <p style={lbl}>קושי — משנה את הסיכוי לנדיר</p>
        <div style={row}>
          {[['easy', 'קל'], ['normal', 'בינוני'], ['hard', 'קשה']].map(([k, l]) => (
            <button key={k} onClick={() => setDiff(k)}
              style={{ ...chip, ...(diff === k ? chipOn : {}) }}>{l}</button>
          ))}
        </div>

        <p style={lbl}>דבש במלאי: {honey}</p>
        <div style={row}>
          <button onClick={() => setHoney(h => h + 1)} style={chip}>+1 🍯</button>
          <button onClick={() => setHoney(0)} style={chip}>לרוקן</button>
        </div>

        <button onClick={() => start()} style={cta}>מפגש אקראי</button>
        <div style={{ ...row, marginTop: 8 }}>
          <button onClick={() => start('common')} style={chip}>רגיל</button>
          <button onClick={() => start('rare')} style={chip}>נדיר</button>
          <button onClick={() => start('legend')} style={chip}>אגדי</button>
        </div>

        {log.length > 0 && (
          <>
            <p style={{ ...lbl, marginTop: 26 }}>מה קרה</p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {log.map((l, i) => (
                <li key={i} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: '9px 13px', fontSize: 14.5 }}>{l}</li>
              ))}
            </ul>
          </>
        )}
      </div>

      {run && (
        <EncounterScene
          key={run.key}
          monsterId={run.monsterId}
          rarity={run.rarity}
          avatarId={avatar}
          honey={honey}
          index={run.index}
          total={5}
          enemy={run.enemy}
          onResolve={resolve}
        />
      )}
    </div>
  )
}

const lbl = { fontSize: 13, fontWeight: 700, color: C.soft, margin: '0 0 8px' }
const row = { display: 'flex', gap: 8, marginBottom: 18 }
const chip = {
  flex: 1, padding: '11px 6px', borderRadius: 12, cursor: 'pointer',
  border: '1.5px solid #DCD2BE', background: '#FBF7EE', color: '#22271E',
  fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
}
const chipOn = { background: '#3F5C53', color: '#F3EDE1', borderColor: '#3F5C53' }
const cta = {
  width: '100%', padding: '15px 18px', borderRadius: 13, border: 'none',
  background: '#3F5C53', color: '#F3EDE1', fontFamily: 'inherit',
  fontSize: 17, fontWeight: 800, cursor: 'pointer', marginTop: 6,
}
