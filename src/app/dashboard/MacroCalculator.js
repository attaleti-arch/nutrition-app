import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

const COLORS = {
  protein: "#6EBF8B",
  carbs: "#F4A261",
  fat: "#E76F51",
  bg: "#FDFAF6",
  card: "#FFFFFF",
  text: "#2D2D2D",
  muted: "#8B8B8B",
  accent: "#4A9B6F",
  border: "#EDE8E0",
};

const GOALS = {
  "ירידה במשקל": { protein: 40, carbs: 30, fat: 30 },
  "עלייה במסה": { protein: 30, carbs: 50, fat: 20 },
  "שמירה על משקל": { protein: 30, carbs: 40, fat: 30 },
  "קטוגני": { protein: 25, carbs: 5, fat: 70 },
  "ספורטאי": { protein: 35, carbs: 45, fat: 20 },
};

const sampleHistory = [
  { day: "ראשון", protein: 120, carbs: 180, fat: 55, calories: 1675 },
  { day: "שני", protein: 135, carbs: 160, fat: 60, calories: 1680 },
  { day: "שלישי", protein: 110, carbs: 200, fat: 50, calories: 1670 },
  { day: "רביעי", protein: 140, carbs: 170, fat: 65, calories: 1765 },
  { day: "חמישי", protein: 125, carbs: 155, fat: 58, calories: 1634 },
  { day: "שישי", protein: 130, carbs: 190, fat: 62, calories: 1742 },
  { day: "שבת", protein: 145, carbs: 210, fat: 70, calories: 1870 },
];

function MacroRing({ protein, carbs, fat, calories }) {
  const total = protein * 4 + carbs * 4 + fat * 9;
  const data = [
    { name: "חלבון", value: protein * 4, grams: protein },
    { name: "פחמימות", value: carbs * 4, grams: carbs },
    { name: "שומן", value: fat * 9, grams: fat },
  ];
  const pieColors = [COLORS.protein, COLORS.carbs, COLORS.fat];

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <ResponsiveContainer width={220} height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={pieColors[i]} stroke="none" />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.text, lineHeight: 1 }}>{Math.round(total)}</div>
        <div style={{ fontSize: 12, color: COLORS.muted, fontWeight: 500 }}>קלוריות</div>
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: pieColors[i] }} />
            <span style={{ fontSize: 12, color: COLORS.muted }}>{d.name} <strong style={{ color: COLORS.text }}>{d.grams}g</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, unit, color, percent }) {
  return (
    <div style={{
      background: COLORS.card,
      border: `1.5px solid ${COLORS.border}`,
      borderRadius: 16,
      padding: "16px 20px",
      flex: 1,
      minWidth: 100,
    }}>
      <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600, marginBottom: 6, letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color }}>
        {value}<span style={{ fontSize: 13, fontWeight: 500, color: COLORS.muted }}>{unit}</span>
      </div>
      <div style={{ marginTop: 8, background: COLORS.border, borderRadius: 99, height: 6 }}>
        <div style={{
          height: 6, borderRadius: 99,
          background: color,
          width: `${Math.min(percent, 100)}%`,
          transition: "width 0.5s ease"
        }} />
      </div>
      <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>{Math.round(percent)}% מהיעד</div>
    </div>
  );
}

export default function MacroCalculator() {
  const [tab, setTab] = useState("מחשבון");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("נקבה");
  const [activity, setActivity] = useState("בינוני");
  const [goal, setGoal] = useState("ירידה במשקל");
  const [result, setResult] = useState(null);
  const [todayLog, setTodayLog] = useState({ protein: 85, carbs: 130, fat: 40 });

  const activityMultipliers = {
    "יושבני": 1.2, "קל": 1.375, "בינוני": 1.55, "פעיל": 1.725, "מאוד פעיל": 1.9
  };

  const calculate = () => {
    const w = parseFloat(weight), h = parseFloat(height), a = parseFloat(age);
    if (!w || !h || !a) return;
    const bmr = gender === "נקבה"
      ? 10 * w + 6.25 * h - 5 * a - 161
      : 10 * w + 6.25 * h - 5 * a + 5;
    const tdee = bmr * activityMultipliers[activity];
    const adjust = goal === "ירידה במשקל" ? -400 : goal === "עלייה במסה" ? +300 : 0;
    const calories = Math.round(tdee + adjust);
    const split = GOALS[goal];
    setResult({
      calories,
      protein: Math.round((calories * split.protein / 100) / 4),
      carbs: Math.round((calories * split.carbs / 100) / 4),
      fat: Math.round((calories * split.fat / 100) / 9),
    });
  };

  const tabs = ["מחשבון", "היום שלי", "התקדמות"];

  return (
    <div style={{
      fontFamily: "'Segoe UI', 'Helvetica Neue', sans-serif",
      direction: "rtl",
      minHeight: "100vh",
      background: COLORS.bg,
      padding: "0 0 40px",
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #3D8B63 0%, #5BAF84 100%)",
        padding: "28px 24px 80px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -30, left: -30,
          width: 160, height: 160, borderRadius: "50%",
          background: "rgba(255,255,255,0.08)"
        }} />
        <div style={{
          position: "absolute", bottom: -20, right: 20,
          width: 100, height: 100, borderRadius: "50%",
          background: "rgba(255,255,255,0.06)"
        }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "rgba(255,255,255,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22
          }}>🥗</div>
          <div>
            <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 500 }}>בין הראש לצלחת</div>
            <div style={{ color: "#fff", fontSize: 20, fontWeight: 800 }}>מחשבון מאקרו</div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        margin: "-36px 20px 0",
        background: COLORS.card,
        borderRadius: 20,
        padding: 6,
        display: "flex",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        position: "relative", zIndex: 10,
      }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "10px 6px",
            border: "none", cursor: "pointer",
            borderRadius: 14,
            background: tab === t ? "linear-gradient(135deg, #3D8B63, #5BAF84)" : "transparent",
            color: tab === t ? "#fff" : COLORS.muted,
            fontWeight: tab === t ? 700 : 500,
            fontSize: 14,
            transition: "all 0.25s ease",
          }}>{t}</button>
        ))}
      </div>

      <div style={{ padding: "24px 20px 0" }}>

        {/* === מחשבון === */}
        {tab === "מחשבון" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Personal details */}
            <div style={{ background: COLORS.card, borderRadius: 20, padding: 20, border: `1.5px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 16 }}>פרטים אישיים</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "משקל (ק״ג)", val: weight, set: setWeight, ph: "65" },
                  { label: "גובה (ס״מ)", val: height, set: setHeight, ph: "165" },
                  { label: "גיל", val: age, set: setAge, ph: "30" },
                ].map(f => (
                  <div key={f.label}>
                    <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6, fontWeight: 600 }}>{f.label}</div>
                    <input
                      type="number"
                      value={f.val}
                      onChange={e => f.set(e.target.value)}
                      placeholder={f.ph}
                      style={{
                        width: "100%", padding: "10px 12px",
                        border: `1.5px solid ${COLORS.border}`,
                        borderRadius: 12, fontSize: 15,
                        background: COLORS.bg, color: COLORS.text,
                        outline: "none", boxSizing: "border-box",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>
                ))}
                <div>
                  <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6, fontWeight: 600 }}>מין</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["נקבה", "זכר"].map(g => (
                      <button key={g} onClick={() => setGender(g)} style={{
                        flex: 1, padding: "10px 8px", border: `1.5px solid ${gender === g ? COLORS.accent : COLORS.border}`,
                        borderRadius: 12, background: gender === g ? "#EBF6F0" : COLORS.bg,
                        color: gender === g ? COLORS.accent : COLORS.muted,
                        fontWeight: gender === g ? 700 : 500, fontSize: 13, cursor: "pointer",
                      }}>{g}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Activity */}
            <div style={{ background: COLORS.card, borderRadius: 20, padding: 20, border: `1.5px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>רמת פעילות</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {Object.keys(activityMultipliers).map(a => (
                  <button key={a} onClick={() => setActivity(a)} style={{
                    padding: "8px 14px", border: `1.5px solid ${activity === a ? COLORS.accent : COLORS.border}`,
                    borderRadius: 99, background: activity === a ? "#EBF6F0" : COLORS.bg,
                    color: activity === a ? COLORS.accent : COLORS.muted,
                    fontWeight: activity === a ? 700 : 500, fontSize: 13, cursor: "pointer",
                  }}>{a}</button>
                ))}
              </div>
            </div>

            {/* Goal */}
            <div style={{ background: COLORS.card, borderRadius: 20, padding: 20, border: `1.5px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>מטרה</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Object.keys(GOALS).map(g => {
                  const icons = { "ירידה במשקל": "⬇️", "עלייה במסה": "💪", "שמירה על משקל": "⚖️", "קטוגני": "🥑", "ספורטאי": "🏃‍♀️" };
                  return (
                    <button key={g} onClick={() => setGoal(g)} style={{
                      padding: "12px 16px", border: `1.5px solid ${goal === g ? COLORS.accent : COLORS.border}`,
                      borderRadius: 14, background: goal === g ? "#EBF6F0" : COLORS.bg,
                      color: goal === g ? COLORS.accent : COLORS.text,
                      fontWeight: goal === g ? 700 : 500, fontSize: 14, cursor: "pointer",
                      textAlign: "right", display: "flex", alignItems: "center", gap: 10,
                    }}>
                      <span>{icons[g]}</span>
                      <span>{g}</span>
                      {goal === g && <span style={{ marginRight: "auto", fontSize: 16 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <button onClick={calculate} style={{
              padding: "16px", border: "none",
              borderRadius: 16,
              background: "linear-gradient(135deg, #3D8B63, #5BAF84)",
              color: "#fff", fontWeight: 800, fontSize: 16,
              cursor: "pointer", letterSpacing: 0.5,
              boxShadow: "0 4px 16px rgba(61,139,99,0.35)",
            }}>
              חשב את המאקרו שלי ✨
            </button>

            {result && (
              <div style={{ background: COLORS.card, borderRadius: 20, padding: 24, border: `1.5px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 20, textAlign: "center" }}>
                  התוצאות שלך — {result.calories} קלוריות ביום
                </div>
                <MacroRing protein={result.protein} carbs={result.carbs} fat={result.fat} calories={result.calories} />
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <div style={{ flex: 1, background: "#F0FAF4", borderRadius: 14, padding: 14, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600 }}>חלבון</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.protein }}>{result.protein}g</div>
                  </div>
                  <div style={{ flex: 1, background: "#FFF8F0", borderRadius: 14, padding: 14, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600 }}>פחמימות</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.carbs }}>{result.carbs}g</div>
                  </div>
                  <div style={{ flex: 1, background: "#FFF2EE", borderRadius: 14, padding: 14, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600 }}>שומן</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.fat }}>{result.fat}g</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === היום שלי === */}
        {tab === "היום שלי" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: COLORS.card, borderRadius: 20, padding: 20, border: `1.5px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>מה אכלת היום? 🍽️</div>
              <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 20 }}>עדכן את המאקרו שצרכת</div>

              {[
                { key: "protein", label: "חלבון", color: COLORS.protein, icon: "🥩", target: 130 },
                { key: "carbs", label: "פחמימות", color: COLORS.carbs, icon: "🍞", target: 160 },
                { key: "fat", label: "שומן", color: COLORS.fat, icon: "🥑", target: 55 },
              ].map(m => (
                <div key={m.key} style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{m.icon}</span>
                      <span style={{ fontWeight: 700, color: COLORS.text }}>{m.label}</span>
                    </div>
                    <div style={{ fontSize: 13, color: COLORS.muted }}>
                      <strong style={{ color: m.color, fontSize: 16 }}>{todayLog[m.key]}g</strong> / {m.target}g
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0} max={m.target * 1.5}
                    value={todayLog[m.key]}
                    onChange={e => setTodayLog(prev => ({ ...prev, [m.key]: +e.target.value }))}
                    style={{ width: "100%", accentColor: m.color }}
                  />
                  <div style={{ marginTop: 6, background: COLORS.border, borderRadius: 99, height: 8 }}>
                    <div style={{
                      height: 8, borderRadius: 99, background: m.color,
                      width: `${Math.min((todayLog[m.key] / m.target) * 100, 100)}%`,
                      transition: "width 0.3s ease",
                    }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <StatCard
                label="חלבון"
                value={todayLog.protein}
                unit="g"
                color={COLORS.protein}
                percent={(todayLog.protein / 130) * 100}
              />
              <StatCard
                label="פחמימות"
                value={todayLog.carbs}
                unit="g"
                color={COLORS.carbs}
                percent={(todayLog.carbs / 160) * 100}
              />
              <StatCard
                label="שומן"
                value={todayLog.fat}
                unit="g"
                color={COLORS.fat}
                percent={(todayLog.fat / 55) * 100}
              />
            </div>

            <div style={{ background: COLORS.card, borderRadius: 20, padding: 20, border: `1.5px solid ${COLORS.border}`, textAlign: "center" }}>
              <MacroRing protein={todayLog.protein} carbs={todayLog.carbs} fat={todayLog.fat} />
            </div>
          </div>
        )}

        {/* === התקדמות === */}
        {tab === "התקדמות" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: COLORS.card, borderRadius: 20, padding: 20, border: `1.5px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>קלוריות — שבוע אחרון</div>
              <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 16 }}>יעד: 1,650 קלוריות</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={sampleHistory} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: COLORS.muted }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: COLORS.muted }} axisLine={false} tickLine={false} domain={[1400, 2000]} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: `1px solid ${COLORS.border}`, fontSize: 13 }}
                    formatter={(v) => [`${v} קל`, "קלוריות"]}
                  />
                  <Bar dataKey="calories" fill={COLORS.accent} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: COLORS.card, borderRadius: 20, padding: 20, border: `1.5px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 16 }}>מאקרו — שבוע אחרון</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={sampleHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: COLORS.muted }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: COLORS.muted }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: `1px solid ${COLORS.border}`, fontSize: 12 }}
                    formatter={(v, name) => {
                      const labels = { protein: "חלבון", carbs: "פחמימות", fat: "שומן" };
                      return [`${v}g`, labels[name]];
                    }}
                  />
                  <Line type="monotone" dataKey="protein" stroke={COLORS.protein} strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="carbs" stroke={COLORS.carbs} strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="fat" stroke={COLORS.fat} strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 12 }}>
                {[{ l: "חלבון", c: COLORS.protein }, { l: "פחמימות", c: COLORS.carbs }, { l: "שומן", c: COLORS.fat }].map(i => (
                  <div key={i.l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 12, height: 3, borderRadius: 2, background: i.c }} />
                    <span style={{ fontSize: 12, color: COLORS.muted }}>{i.l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly summary */}
            <div style={{ background: COLORS.card, borderRadius: 20, padding: 20, border: `1.5px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 16 }}>סיכום שבועי</div>
              {[
                { label: "ממוצע קלוריות", value: "1,719", icon: "🔥", sub: "כ-70 קל מעל היעד" },
                { label: "ממוצע חלבון", value: "129g", icon: "💪", sub: "99% מהיעד היומי" },
                { label: "ממוצע פחמימות", value: "181g", icon: "🍞", sub: "113% מהיעד היומי" },
                { label: "ממוצע שומן", value: "60g", icon: "🥑", sub: "109% מהיעד היומי" },
              ].map(s => (
                <div key={s.label} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "12px 0", borderBottom: `1px solid ${COLORS.border}`,
                }}>
                  <span style={{ fontSize: 24 }}>{s.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: COLORS.muted, fontWeight: 500 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{s.sub}</div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.text }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
