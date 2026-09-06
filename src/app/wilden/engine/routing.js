'use client'

// ─── תכנון מסלול הליכה אמיתי ───
// לא טבעת נקודות סביב הבית, אלא לולאה על רשת הרחובות: יוצאים מהבית, נעים
// בין הרחובות, וחוזרים דרך רחוב אחר כשאפשר.
//
// הדרך: בונים גרף מהרחובות שהתקבלו מ-OpenStreetMap, מחפשים נקודה רחוקה
// בערך בשליש מאורך המסלול, הולכים אליה בדרך הקצרה, וחוזרים בדרך שנייה
// שבה הקשתות שכבר הלכנו בהן יקרות פי כמה. זה מה שמייצר חזרה ברחוב אחר.

const EARTH = 6371000

export function metersBetween(a, b) {
  const t1 = (a.lat * Math.PI) / 180, t2 = (b.lat * Math.PI) / 180
  const dt = t2 - t1, dl = ((b.lng - a.lng) * Math.PI) / 180
  const x = Math.sin(dt / 2) ** 2 + Math.cos(t1) * Math.cos(t2) * Math.sin(dl / 2) ** 2
  return 2 * EARTH * Math.asin(Math.min(1, Math.sqrt(x)))
}

// שביל שדה עולה יותר מרחוב מגורים, ולכן הניווט יעדיף רחובות גם כשהם קצת
// יותר ארוכים. tier מגיע מ-osm.js.
const TIER_COST = [1, 1.2, 2.6]

const key = p => `${p.lat.toFixed(7)},${p.lng.toFixed(7)}`

function insidePolygon(pt, poly) {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i], [yj, xj] = poly[j]
    if ((yi > pt.lat) !== (yj > pt.lat) &&
        pt.lng < ((xj - xi) * (pt.lat - yi)) / (yj - yi || 1e-12) + xi) hit = !hit
  }
  return hit
}

export function buildGraph(ways, blocked = []) {
  const index = new Map()
  const nodes = []
  const adj = []

  const idOf = p => {
    const k = key(p)
    let i = index.get(k)
    if (i === undefined) {
      i = nodes.length
      index.set(k, i)
      nodes.push({ lat: p.lat, lng: p.lng })
      adj.push([])
    }
    return i
  }

  for (const w of ways) {
    const cost = TIER_COST[w.tier] ?? 2.6
    for (let i = 1; i < w.nodes.length; i++) {
      const a = w.nodes[i - 1], b = w.nodes[i]
      // קטע שאמצעו בתוך שטח חסום — שדה, בית קברות, אזור תעשייה — לא קיים
      const mid = { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 }
      if (blocked.some(poly => insidePolygon(mid, poly))) continue
      const d = metersBetween(a, b)
      if (d < 0.5) continue
      const ia = idOf(a), ib = idOf(b)
      const e = adj[ia].length, f = adj[ib].length
      adj[ia].push({ to: ib, d, w: d * cost, tier: w.tier, back: f })
      adj[ib].push({ to: ia, d, w: d * cost, tier: w.tier, back: e })
    }
  }
  return { nodes, adj }
}

// ערימה בינארית — בלעדיה דייקסטרה על כמה אלפי צמתים, שלוש-עשרה פעמים,
// נהיה איטי מספיק כדי שיורגש בטלפון.
class Heap {
  constructor() { this.a = [] }
  get size() { return this.a.length }
  push(v, p) {
    this.a.push([p, v])
    let i = this.a.length - 1
    while (i > 0) {
      const par = (i - 1) >> 1
      if (this.a[par][0] <= this.a[i][0]) break
      ;[this.a[par], this.a[i]] = [this.a[i], this.a[par]]
      i = par
    }
  }
  pop() {
    const top = this.a[0]
    const last = this.a.pop()
    if (this.a.length) {
      this.a[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1, r = l + 1
        let s = i
        if (l < this.a.length && this.a[l][0] < this.a[s][0]) s = l
        if (r < this.a.length && this.a[r][0] < this.a[s][0]) s = r
        if (s === i) break
        ;[this.a[s], this.a[i]] = [this.a[i], this.a[s]]
        i = s
      }
    }
    return top[1]
  }
}

// penalty: Set של מזהי קשת ("min-max") שעלותן מוכפלת — כך הדרך חזרה
// בוחרת רחובות אחרים.
export function dijkstra(graph, from, penalty = null, factor = 6) {
  const n = graph.nodes.length
  const dist = new Float64Array(n).fill(Infinity)
  const real = new Float64Array(n).fill(0)
  const prev = new Int32Array(n).fill(-1)
  dist[from] = 0
  const h = new Heap()
  h.push(from, 0)
  const done = new Uint8Array(n)
  while (h.size) {
    const u = h.pop()
    if (done[u]) continue
    done[u] = 1
    for (const e of graph.adj[u]) {
      let w = e.w
      if (penalty && penalty.has(edgeId(u, e.to))) w *= factor
      const nd = dist[u] + w
      if (nd < dist[e.to]) {
        dist[e.to] = nd
        real[e.to] = real[u] + e.d
        prev[e.to] = u
        h.push(e.to, nd)
      }
    }
  }
  return { dist, real, prev }
}

export const edgeId = (a, b) => (a < b ? a + '-' + b : b + '-' + a)

function tracePath(prev, from, to) {
  const path = []
  let cur = to
  while (cur !== -1) {
    path.push(cur)
    if (cur === from) break
    cur = prev[cur]
  }
  if (path[path.length - 1] !== from) return null
  return path.reverse()
}

function pathLength(graph, path) {
  let len = 0
  for (let i = 1; i < path.length; i++) {
    const e = graph.adj[path[i - 1]].find(x => x.to === path[i])
    len += e ? e.d : 0
  }
  return len
}

export function nearestNode(graph, pt) {
  let best = -1, bd = Infinity
  for (let i = 0; i < graph.nodes.length; i++) {
    const d = metersBetween(graph.nodes[i], pt)
    if (d < bd) { bd = d; best = i }
  }
  return { idx: best, dist: bd }
}

// כמה השטח שהלולאה מקיפה גדול ביחס להיקף שלה. 1 = מעגל מושלם, 0 = קו
// שטוח שהולך וחוזר על עצמו.
function roundness(graph, loop) {
  const pts = loop.map(i => graph.nodes[i])
  if (pts.length < 4) return 0
  // מזיזים לראשית לפני החישוב. בלי זה מכפילים קואורדינטות בגודל 3.5 מיליון
  // מטר ומחסרים, והשטח האמיתי — כמה מאות אלפי מ״ר — נבלע ברעש הצף.
  const kx = Math.cos((pts[0].lat * Math.PI) / 180) * 111320
  const ox = pts[0].lng, oy = pts[0].lat
  let area2 = 0, per = 0
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length]
    const ax = (a.lng - ox) * kx, ay = (a.lat - oy) * 111320
    const bx = (b.lng - ox) * kx, by = (b.lat - oy) * 111320
    area2 += ax * by - bx * ay
    per += metersBetween(a, b)
  }
  const area = Math.abs(area2) / 2
  if (per <= 0) return 0
  return Math.min(1, (4 * Math.PI * area) / (per * per))
}

// מתכנן לולאה שאורכה קרוב ל-target מטרים.
export function planLoop(graph, homeIdx, target, { candidates = 14 } = {}) {
  const out = dijkstra(graph, homeIdx)
  // נקודת המפנה צריכה לשבת בערך בחצי המסלול: הדרך אליה והדרך חזרה, שהיא
  // רחובות אחרים ולכן ארוכה במקצת, מסתכמות לאורך המבוקש.
  const lo = target * 0.3, hi = target * 0.62
  const ideal = target * 0.46

  // מועמדים לנקודת המפנה, מפוזרים לפי כיוון כדי לא לבחון 14 נקודות
  // שכולן באותו רחוב
  const spin = Math.random() * 360
  const buckets = new Map()
  for (let i = 0; i < graph.nodes.length; i++) {
    if (!isFinite(out.dist[i]) || out.real[i] < lo || out.real[i] > hi) continue
    const n = graph.nodes[i], h = graph.nodes[homeIdx]
    const ang = Math.atan2((n.lng - h.lng) * Math.cos((h.lat * Math.PI) / 180), n.lat - h.lat)
    const b = Math.round((((ang * 180) / Math.PI + spin + 720) % 360) / (360 / candidates))
    const cur = buckets.get(b)
    if (!cur || Math.abs(out.real[i] - ideal) < Math.abs(out.real[cur] - ideal)) {
      buckets.set(b, i)
    }
  }
  if (!buckets.size) return null

  const scored = []
  for (const far of buckets.values()) {
    const outPath = tracePath(out.prev, homeIdx, far)
    if (!outPath || outPath.length < 2) continue
    const used = new Set()
    for (let i = 1; i < outPath.length; i++) used.add(edgeId(outPath[i - 1], outPath[i]))

    const back = dijkstra(graph, far, used)
    const backPath = tracePath(back.prev, far, homeIdx)
    if (!backPath || backPath.length < 2) continue

    const loop = outPath.concat(backPath.slice(1))
    const len = pathLength(graph, loop)
    if (len < target * 0.55) continue

    let shared = 0
    for (let i = 1; i < backPath.length; i++) {
      if (used.has(edgeId(backPath[i - 1], backPath[i]))) shared++
    }
    const overlap = shared / Math.max(1, backPath.length - 1)
    // אורך נכון, בלי לחזור באותם רחובות, ו"עגול" ולא נחש דק: לולאה שיוצאת
    // ברחוב אחד וחוזרת ברחוב המקביל לו עומדת בשני התנאים הראשונים אבל היא
    // הלוך-ושוב, לא סיבוב בשכונה.
    const score = Math.abs(len - target) / target + overlap * 1.4 - roundness(graph, loop) * 1.2
    scored.push({ loop, len, overlap, score })
  }
  if (!scored.length) return null
  scored.sort((a, b) => a.score - b.score)
  // מבין השלושה הטובים — אחד אקראי, כדי ש"מסלול אחר" באמת ייתן מסלול אחר
  const pool = scored.slice(0, Math.min(3, scored.length))
  return pool[Math.floor(Math.random() * pool.length)]
}

// פורס את היצורים לאורך המסלול במרווחים שווים. הראשון לא בדלת והאחרון
// לא ממש בבית, כדי שהחזרה הביתה תישאר קטע בפני עצמו.
export function spreadAlong(graph, loop, count) {
  const pts = loop.map(i => graph.nodes[i])
  const segs = []
  let total = 0
  for (let i = 1; i < pts.length; i++) {
    const d = metersBetween(pts[i - 1], pts[i])
    segs.push({ from: pts[i - 1], to: pts[i], d, at: total })
    total += d
  }
  if (total <= 0) return []

  const spots = []
  for (let i = 0; i < count; i++) {
    const want = total * ((i + 0.5) / count)
    const s = segs.find(x => want >= x.at && want <= x.at + x.d) || segs[segs.length - 1]
    const t = s.d > 0 ? (want - s.at) / s.d : 0
    spots.push({
      lat: s.from.lat + (s.to.lat - s.from.lat) * t,
      lng: s.from.lng + (s.to.lng - s.from.lng) * t,
    })
  }
  return spots
}

export function loopCoords(graph, loop) {
  return loop.map(i => [graph.nodes[i].lat, graph.nodes[i].lng])
}
