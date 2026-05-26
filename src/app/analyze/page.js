'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const PROT_NAMES = {
  p1: '200 גרם דג לבן', p2: '100 גרם סלמון', p3: '150 גרם טופו',
  p4: '100 גרם סינטה / 120 גרם פרגית', p5: '140 גרם ירך עוף',
  p6: 'המבורגר צמחוני', p7: 'דג שמן / סלמון', p8: '3 ביצים / אומלט'
}
const CARB_NAMES = {
  c1: '150 גרם אורז / קינואה', c2: '200 גרם בורגול', c3: '110 גרם פתיתים',
  c4: '170 גרם תפוחי אדמה / בטטה', c5: '150 גרם כרובית / ברוקולי'
}

function calcNutrition(log, nutritionData) {
  var total = { calories: 0, protein: 0, fat: 0, fiber: 0 }
  var nd = nutritionData

  function add(id) {
    var item = nd[id]
    if (item) {
      total.calories += item.calories || 0
      total.protein += item.protein || 0
      total.fat += item.fat || 0
      total.fiber += item.fiber || 0
    }
  }

  if (log.had_snack) add('snack')
  if (log.checks) Object.keys(log.checks).forEach(function(id) { if (log.checks[id]) add(id) })
  if (log.carb_sel) add(log.carb_sel)
  if (log.prot_sel) add(log.prot_sel)
  if (log.fat_sel) add(log.fat_sel)
  if (log.had_benayim) add('benayim')

  return total
}

function NutritionBar({ label, value, max, color }) {
  var pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: '#555' }}>{label}</span>
        <span style={{ fontWeight: 700, color: color }}>{Math.round(value)}</span>
      </div>
      <div style={{ height: 8, background: '#f3f4f6', borderRadius: 99 }}>
        <div style={{ width: pct + '%', height: '100%', background: color, borderRadius: 99 }} />
      </div>
    </div>
  )
}

export default function AnalyzePage() {
  const [pin, setPin] = useState('')
  const [auth, setAuth] = useState(false)
  const [clients, setClients] = useState([])
  const [selected, setSelected] = useState(null)
  const [logs, setLogs] = useState([])
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(false)
  const [nutritionData, setNutritionData] = useState({})

  useEffect(function() {
    async function loadNutrition() {
      var { data } = await supabase.from('nutrition_data').select('*')
      var nd = {}
      if (data) data.forEach(function(item) { nd[item.id] = item })
      setNutritionData(nd)
    }
    loadNutrition()
  }, [])

  const login = async () => {
    if (pin !== 'Esterika26') return
    setAuth(true)
    const { data } = await supabase.from('clients').select('*')
    setClients(data || [])
  }

  const loadLogs = async (client) => {
    setSelected(client)
    setAnalysis('')
    const { data } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('client_name', client.password)
      .order('log_date', { ascending: false })
      .limit(7)
    setLogs(data || [])
  }

  const analyze = async () => {
    if (!logs.length || !selected) return
    setLoading(true)
    const summary = logs.map(function(l) {
      var nut = calcNutrition(l, nutritionData)
      return 'תאריך: ' + l.log_date +
        ' | קלוריות: ' + Math.round(nut.calories) +
        ' | חלבון: ' + Math.round(nut.protein) + 'g' +
        ' | שומן: ' + Math.round(nut.fat) + 'g' +
        ' | סיבים: ' + Math.round(nut.fiber) + 'g' +
        ' | מים: ' + (l.water || 0) + ' כוסות' +
        ' | צעדים: ' + (l.steps || 0) +
        ' | פחמימה: ' + (CARB_NAMES[l.carb_sel] || 'לא נבחר') +
        ' | חלבון נבחר: ' + (PROT_NAMES[l.prot_sel] || 'לא נבחר') +
        ' | חטיף בוקר: ' + (l.had_snack ? 'כן' : 'לא') +
        ' | ביניים: ' + (l.had_benayim ? 'כן' : 'לא') +
        ' | בוקר נוסף: ' + (l.boker_free || '') +
        ' | צהריים נוסף: ' + (l.lunch_free || '') +
        ' | ערב נוסף: ' + (l.erev_free || '') +
        ' | הערה: ' + (l.note || '')
    }).join('\n')

    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: selected.name, logs: summary })
    })
    const data = await res.json()
    setAnalysis(data.result)
    setLoading(false)
  }

  if (!auth) return (
    <div style={{padding:40,textAlign:'center',direction:'rtl',minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#f0fdf4'}}>
      <div style={{fontSize:32,marginBottom:8}}>🥗</div>
      <h2 style={{marginBottom:20,color:'#0f4c2a'}}>ניתוח תזונה AI</h2>
      <input type="password" value={pin} onChange={e => setPin(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && login()}
        placeholder="סיסמה..."
        style={{padding:12,fontSize:16,borderRadius:12,border:'2px solid #e5e7eb',width:220,textAlign:'center',marginBottom:12,outline:'none'}} />
      <button onClick={login} style={{padding:'12px 32px',borderRadius:12,background:'#0f4c2a',color:'#fff',border:'none',cursor:'pointer',fontWeight:700,fontSize:16}}>כניסה</button>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#f8fafc',direction:'rtl'}}>
      <div style={{background:'linear-gradient(135deg,#0f4c2a,#16a34a)',padding:'20px 24px',color:'#fff'}}>
        <div style={{fontSize:11,color:'#86efac'}}>בין הראש לצלחת</div>
        <div style={{fontSize:22,fontWeight:900}}>🤖 ניתוח תזונה AI</div>
      </div>

      <div style={{maxWidth:600,margin:'0 auto',padding:'20px 16px'}}>
        <div style={{background:'#fff',borderRadius:18,padding:16,marginBottom:16,border:'1.5px solid #f0f0f0'}}>
          <div style={{fontWeight:700,marginBottom:10}}>בחרי לקוח:</div>
          {clients.map(c => (
            <button key={c.id} onClick={() => loadLogs(c)} style={{
              display:'block',width:'100%',textAlign:'right',
              padding:'10px 14px',marginBottom:6,borderRadius:10,
              border:'2px solid ' + (selected?.id === c.id ? '#0f4c2a' : '#e5e7eb'),
              background: selected?.id === c.id ? '#dcfce7' : '#fff',
              cursor:'pointer',fontWeight:600,fontSize:15
            }}>
              {c.name}
            </button>
          ))}
        </div>

        {selected && logs.length > 0 && (
          <div style={{background:'#fff',borderRadius:18,padding:16,marginBottom:16,border:'1.5px solid #f0f0f0'}}>
            <div style={{fontWeight:700,marginBottom:12}}>📅 {logs.length} רשומות אחרונות:</div>
            {logs.map(function(l) {
              var nut = calcNutrition(l, nutritionData)
              return (
                <div key={l.id} style={{marginBottom:16,paddingBottom:16,borderBottom:'1px solid #f3f4f6'}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:8,color:'#111'}}>{l.log_date}</div>
                  <NutritionBar label="קלוריות" value={nut.calories} max={2000} color="#f97316" />
                  <NutritionBar label="חלבון (g)" value={nut.protein} max={100} color="#16a34a" />
                  <NutritionBar label="שומן (g)" value={nut.fat} max={70} color="#9333ea" />
                  <NutritionBar label="סיבים (g)" value={nut.fiber} max={30} color="#0284c7" />
                  <div style={{fontSize:12,color:'#9ca3af',marginTop:4}}>
                    מים: {l.water || 0}/8 | צעדים: {l.steps || 0}
                  </div>
                </div>
              )
            })}
            <button onClick={analyze} disabled={loading} style={{
              width:'100%',padding:14,borderRadius:12,marginTop:4,
              background: loading ? '#9ca3af' : '#0f4c2a',
              color:'#fff',border:'none',cursor: loading ? 'default' : 'pointer',
              fontWeight:700,fontSize:16
            }}>
              {loading ? '⏳ מנתחת...' : '🤖 נתחי עם AI'}
            </button>
          </div>
        )}

        {selected && logs.length === 0 && (
          <div style={{textAlign:'center',color:'#9ca3af',padding:30}}>אין רשומות עדיין</div>
        )}

        {analysis && (
          <div style={{background:'#fff',borderRadius:20,padding:20,border:'1.5px solid #f0f0f0',fontSize:15,lineHeight:1.8,whiteSpace:'pre-wrap'}}>
            {analysis}
          </div>
        )}
      </div>
    </div>
  )
}
