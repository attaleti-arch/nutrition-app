// ─── סקינים ───
// "הבן שלי אומר סקינים." מראה חדש ליצור, קונים במטבעות, ליצור מסוים.
// שני סוגים באותו מנגנון של "מראה" (stages.lookOf):
//   צבע   — פילטר על הדמות החיה + הילה (אפס חומרים; כאן)
//   דמות  — קליפ משלו (creature.variants[id], כמו נימי זוהר). כשמגיע מ-Runway.
// ועוד: אבן צמיחה — נקודת התפתחות ליצור שבוחרים.
//
// טהור. progress.skins — { [creatureId]: [skinId] }; progress.stones — { [creatureId]: n }.

export const SKINS = [
  { id: 'lava', name: 'לבה', nameF: 'לבה', price: 45, filter: 'sepia(1) saturate(4) hue-rotate(-30deg) brightness(.95) contrast(1.15)', aura: 'rgba(255,120,60,.6)' },
  { id: 'forest', name: 'יער', nameF: 'יער', price: 45, filter: 'sepia(.6) saturate(1.8) hue-rotate(55deg) brightness(.95)', aura: 'rgba(110,200,90,.55)' },
  { id: 'sunset', name: 'שקיעה', nameF: 'שקיעה', price: 45, filter: 'saturate(1.6) hue-rotate(-40deg) brightness(1.05)', aura: 'rgba(255,140,200,.55)' },
  { id: 'silver', name: 'כסף', nameF: 'כסף', price: 55, filter: 'saturate(.15) brightness(1.25) contrast(1.15)', aura: 'rgba(220,230,255,.6)' },
  { id: 'shadow', name: 'צללים', nameF: 'צללים', price: 55, filter: 'saturate(.6) brightness(.55) contrast(1.3) hue-rotate(250deg)', aura: 'rgba(120,80,200,.6)' },
]
export const skinById = id => SKINS.find(s => s.id === id) || null
export const skinTint = id => { const s = skinById(id); return s ? { filter: s.filter, aura: s.aura } : null }

export const ownsSkin = (progress, creature, skin) => (progress?.skins?.[creature] || []).includes(skin)
export function canBuySkin(progress, creature, skin) {
  const s = skinById(skin)
  if (!s || !creature) return false
  if (!(progress?.creatures || []).includes(creature)) return false
  if (ownsSkin(progress, creature, skin)) return false
  return (progress?.coins || 0) >= s.price
}
// קנייה: מטבעות יורדים, הסקין נרשם ליצור, והוא לובש אותו מיד.
export function buySkin(progress, creature, skin) {
  if (!canBuySkin(progress, creature, skin)) return progress
  const s = skinById(skin)
  return {
    ...progress,
    coins: (progress.coins || 0) - s.price,
    skins: { ...(progress.skins || {}), [creature]: [...(progress.skins?.[creature] || []), skin] },
    look: { ...(progress.look || {}), [creature]: skin },
  }
}

// ── אבן צמיחה ── נקודת התפתחות אחת ליצור. יקרה, כי היא מקצרת את הדרך.
export const STONE_PRICE = 50
export const stoneCredits = (progress, creature) => progress?.stones?.[creature] || 0
export const canBuyStone = (progress, creature) => !!creature && (progress?.creatures || []).includes(creature) && (progress?.coins || 0) >= STONE_PRICE
export function buyStone(progress, creature) {
  if (!canBuyStone(progress, creature)) return progress
  return { ...progress, coins: (progress.coins || 0) - STONE_PRICE, stones: { ...(progress.stones || {}), [creature]: stoneCredits(progress, creature) + 1 } }
}

export function mergeSkins(base, other) {
  const skins = { ...(other?.skins || {}) }
  for (const [k, v] of Object.entries(base?.skins || {})) skins[k] = [...new Set([...(v || []), ...(skins[k] || [])])]
  const stones = { ...(other?.stones || {}) }
  for (const [k, v] of Object.entries(base?.stones || {})) stones[k] = Math.max(v || 0, stones[k] || 0)
  return { skins, stones }
}
