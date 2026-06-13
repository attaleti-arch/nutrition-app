#!/usr/bin/env python3
# Pass 2: Replace old 5-field manual forms with new sessionNotes+AI-generate pattern
import re

with open('src/app/admin/page.js', 'r', encoding='utf-8') as f:
    content = f.read()

# ============================================================
# ROOTS section replacement
# ============================================================
roots_old_start = '                {/* סיכום הפגישה ללקוחה — שורשים */}'
roots_old_end = "                )}\n\n              </div>\n            )}\n\n            {tab === 'body'"

# Find the roots old section
idx_roots_start = content.find(roots_old_start)
if idx_roots_start == -1:
    print("ERROR: Could not find roots section start")
    exit(1)

# Find the end marker that comes right after the roots section
roots_end_marker = "{tab === 'body'"
idx_roots_next = content.find(roots_end_marker, idx_roots_start)
if idx_roots_next == -1:
    print("ERROR: Could not find end of roots section")
    exit(1)

# Back up to find the closing of the roots tab div
# The roots section ends with: "              </div>\n            )}\n\n            {tab === 'body'"
# We want to keep "              </div>\n            )}\n\n            {tab === 'body'"
# and replace everything from roots_old_start to (but not including) "              </div>\n            )}"

# Find the last "\n\n              </div>\n            )}" before the body tab
pre_body = content[idx_roots_start:idx_roots_next]
# Find the closing div sequence
closing_seq = "\n\n              </div>\n            )}"
idx_closing = pre_body.rfind(closing_seq)
if idx_closing == -1:
    print("ERROR: Could not find closing sequence in roots section")
    print("Pre-body snippet:", repr(pre_body[-200:]))
    exit(1)

roots_old_section = pre_body[:idx_closing]
print(f"Found roots section, length: {len(roots_old_section)}")
print(f"Roots section starts with: {repr(roots_old_section[:80])}")
print(f"Roots section ends with: {repr(roots_old_section[-80:])}")

roots_new_section = '''                {/* מה גילינו במפגש — שורשים */}
                <div style={{ background: '#fff', borderRadius: 18, border: '2px solid #c4956a', overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ background: 'linear-gradient(135deg,#c4956a,#e8c9a0)', padding: '14px 18px', color: '#fff' }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>📝 מה גילינו במפגש</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>מלאי אחרי הפגישה הפיזית → הפיקי סיכום ללקוחה</div>
                  </div>
                  <div style={{ padding: 16 }}>
                    <textarea
                      value={rootsSessionNotes}
                      onChange={e => setRootsSessionNotes(e.target.value)}
                      onBlur={() => saveSessionKey('roots_session_notes', rootsSessionNotes)}
                      placeholder="מה עלה בפגישה? אמונות שנגעתם, רגעים ספציפיים, מה הלקוחה גילתה..."
                      rows={5}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.7, fontFamily: 'sans-serif' }}
                    />
                  </div>
                  <div style={{ padding: '0 16px 16px' }}>
                    <button onClick={async () => {
                      setRootsDocLoading(true); setRootsClientDocPreview('')
                      const prompt = 'אתה אתי אטל — יועצת בריאות ותזונה התנהגותית.\\n' +
                        'כתבי סיכום אישי חם ל-' + (selectedClient?.name||'') + ' לאחר פגישת השורשים.\\n\\n' +
                        (rootsAnalysis ? 'ניתוח מקדים:\\n' + rootsAnalysis.substring(0,2000) + '\\n\\n' : '') +
                        (rootsSessionNotes.trim() ? 'מה עלה במפגש:\\n' + rootsSessionNotes + '\\n\\n' : '') +
                        'כתבי מסמך בעברית, גוף שני נקבה, ישיר, חם ואישי. מבנה קבוע — ללא הקדמה:\\n\\n' +
                        '🏠 מה עלה מהבית שגדלת בו\\n[2-3 משפטים ספציפיים]\\n\\n' +
                        '🔄 מה מועבר הלאה\\n[הדפוס הדורי שזוהה]\\n\\n' +
                        '💡 האסימון שנפל\\n[רגע ספציפי שהתחבר, בשפתה]\\n\\n' +
                        '🌱 מה את לוקחת\\n[2-3 דברים קונקרטיים]\\n\\n' +
                        '🚀 קדימה במסע\\n[מה להמשיך לשים לב אליו]'
                      let result = ''
                      try {
                        const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'rootsAnalysis', prompt, name: selectedClient?.name }) })
                        if (!res.ok) throw new Error('API error')
                        const reader = res.body.getReader(); const decoder = new TextDecoder()
                        while (true) { const { done, value } = await reader.read(); if (done) break; result += decoder.decode(value, { stream: true }); setRootsClientDocPreview(result) }
                      } catch(e) { if (!result) alert('שגיאת רשת — נסי שוב') }
                      if (result) saveSessionKey('roots_session_notes', rootsSessionNotes)
                      setRootsDocLoading(false)
                    }} disabled={rootsDocLoading} style={{ width: '100%', padding: 13, borderRadius: 12, background: rootsDocLoading ? '#9ca3af' : '#c4956a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 14 }}>
                      {rootsDocLoading ? '⏳ מפיקה...' : '← הפיקי סיכום ללקוחה'}
                    </button>
                  </div>
                </div>

                {rootsClientDocPreview && (
                  <div style={{ background: '#fff', borderRadius: 18, border: '2px solid #c4956a', overflow: 'hidden', marginBottom: 16 }}>
                    <div style={{ background: 'linear-gradient(135deg,#c4956a,#e8c9a0)', padding: '14px 18px', color: '#fff' }}>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>✏️ תצוגה מקדימה — ערכי לפני שליחה</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>ערכי את הטקסט ← אשרי ושלחי</div>
                    </div>
                    <div style={{ padding: 16 }}>
                      <textarea value={rootsClientDocPreview} onChange={e => setRootsClientDocPreview(e.target.value)} rows={18} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.8, fontFamily: 'sans-serif', direction: 'rtl' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px' }}>
                      <button onClick={async () => {
                        if (!selectedClient.phone) return alert('אין מספר טלפון ללקוחה')
                        setApprovingRootsDoc(true)
                        await supabase.from('client_profiles').update({ roots_feedback: rootsClientDocPreview, roots_feedback_at: new Date().toISOString() }).eq('client_password', selectedClient.password)
                        saveSessionKey('roots_session_notes', rootsSessionNotes)
                        const phone = selectedClient.phone.replace(/^0/, '972')
                        const msg = 'היי ' + selectedClient.name + '! 🌱\\n\\nהסיכום האישי שלך מפגישת השורשים מוכן — היכנסי לאפליקציה לצפייה 💚\\nhttps://project-l990h.vercel.app'
                        window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank')
                        setApprovingRootsDoc(false); setRootsDocSent(true); setRootsClientDocPreview('')
                        setTimeout(() => setRootsDocSent(false), 4000)
                      }} disabled={approvingRootsDoc} style={{ flex: 2, padding: 12, borderRadius: 10, background: rootsDocSent ? '#16a34a' : '#c4956a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                        {approvingRootsDoc ? '⏳...' : rootsDocSent ? '✅ נשלח!' : '✅ אשרי ושלחי ללקוחה'}
                      </button>
                      <button onClick={() => setRootsClientDocPreview('')} style={{ flex: 1, padding: 12, borderRadius: 10, background: '#f3f4f6', color: '#374151', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                        ✕ בטלי
                      </button>
                    </div>
                  </div>
                )}'''

content = content.replace(roots_old_section, roots_new_section, 1)
print("Roots section replaced successfully")

# ============================================================
# BODY section replacement
# ============================================================
body_old_start = '                {/* סיכום הפגישה ללקוחה — גוף מדבר */}'
idx_body_start = content.find(body_old_start)
if idx_body_start == -1:
    print("ERROR: Could not find body section start")
    exit(1)

body_end_marker = "{tab === 'child'"
idx_body_next = content.find(body_end_marker, idx_body_start)
if idx_body_next == -1:
    print("ERROR: Could not find end of body section")
    exit(1)

pre_child = content[idx_body_start:idx_body_next]
idx_body_closing = pre_child.rfind(closing_seq)
if idx_body_closing == -1:
    print("ERROR: Could not find closing sequence in body section")
    print("Pre-child snippet:", repr(pre_child[-200:]))
    exit(1)

body_old_section = pre_child[:idx_body_closing]
print(f"Found body section, length: {len(body_old_section)}")
print(f"Body section starts with: {repr(body_old_section[:80])}")
print(f"Body section ends with: {repr(body_old_section[-80:])}")

body_new_section = '''                {/* מה גילינו במפגש — גוף מדבר */}
                <div style={{ background: '#fff', borderRadius: 18, border: '2px solid #0d9488', overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ background: 'linear-gradient(135deg,#0d9488,#14b8a6)', padding: '14px 18px', color: '#fff' }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>📝 מה גילינו במפגש</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>מלאי אחרי הפגישה הפיזית → הפיקי סיכום ללקוחה</div>
                  </div>
                  <div style={{ padding: 16 }}>
                    <textarea
                      value={bodySessionNotes}
                      onChange={e => setBodySessionNotes(e.target.value)}
                      onBlur={() => saveSessionKey('body_session_notes', bodySessionNotes)}
                      placeholder="מה עלה בפגישה? סימפטומים שזוהו, מנגנונים שהסתברו, מה הלקוחה חיברה..."
                      rows={5}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.7, fontFamily: 'sans-serif' }}
                    />
                  </div>
                  <div style={{ padding: '0 16px 16px' }}>
                    <button onClick={async () => {
                      setBodyDocLoading(true); setBodyClientDocPreview('')
                      const prompt = 'אתה אתי אטל — יועצת בריאות ותזונה התנהגותית.\\n' +
                        'כתבי סיכום אישי חם ל-' + (selectedClient?.name||'') + ' לאחר פגישת הגוף מדבר.\\n\\n' +
                        (bodyAnalysis ? 'ניתוח מקדים:\\n' + bodyAnalysis.substring(0,2000) + '\\n\\n' : '') +
                        (bodySessionNotes.trim() ? 'מה עלה במפגש:\\n' + bodySessionNotes + '\\n\\n' : '') +
                        'כתבי מסמך בעברית, גוף שני נקבה, ישיר, חם ואישי. מבנה קבוע — ללא הקדמה:\\n\\n' +
                        '🩺 מה הגוף שלך אמר\\n[ההודעה הספציפית שזוהתה, בשפתה]\\n\\n' +
                        '💔 הקשר שגילינו\\n[רגש ← גוף — הקישור הספציפי]\\n\\n' +
                        '🔬 מנגנון שמעכשיו מובן\\n[משהו שהסתבר לה: סוכר / קורטיזול / שינה...]\\n\\n' +
                        '🌿 מה את לוקחת\\n[2-3 דברים קונקרטיים]\\n\\n' +
                        '🚀 קדימה במסע\\n[מה לשים לב אליו, מה לצפות]'
                      let result = ''
                      try {
                        const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'rootsAnalysis', prompt, name: selectedClient?.name }) })
                        if (!res.ok) throw new Error('API error')
                        const reader = res.body.getReader(); const decoder = new TextDecoder()
                        while (true) { const { done, value } = await reader.read(); if (done) break; result += decoder.decode(value, { stream: true }); setBodyClientDocPreview(result) }
                      } catch(e) { if (!result) alert('שגיאת רשת — נסי שוב') }
                      if (result) saveSessionKey('body_session_notes', bodySessionNotes)
                      setBodyDocLoading(false)
                    }} disabled={bodyDocLoading} style={{ width: '100%', padding: 13, borderRadius: 12, background: bodyDocLoading ? '#9ca3af' : '#0d9488', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 14 }}>
                      {bodyDocLoading ? '⏳ מפיקה...' : '← הפיקי סיכום ללקוחה'}
                    </button>
                  </div>
                </div>

                {bodyClientDocPreview && (
                  <div style={{ background: '#fff', borderRadius: 18, border: '2px solid #0d9488', overflow: 'hidden', marginBottom: 16 }}>
                    <div style={{ background: 'linear-gradient(135deg,#0d9488,#14b8a6)', padding: '14px 18px', color: '#fff' }}>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>✏️ תצוגה מקדימה — ערכי לפני שליחה</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>ערכי את הטקסט ← אשרי ושלחי</div>
                    </div>
                    <div style={{ padding: 16 }}>
                      <textarea value={bodyClientDocPreview} onChange={e => setBodyClientDocPreview(e.target.value)} rows={18} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.8, fontFamily: 'sans-serif', direction: 'rtl' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px' }}>
                      <button onClick={async () => {
                        if (!selectedClient.phone) return alert('אין מספר טלפון ללקוחה')
                        setApprovingBodyDoc(true)
                        await supabase.from('client_profiles').update({ body_feedback: bodyClientDocPreview, body_feedback_at: new Date().toISOString() }).eq('client_password', selectedClient.password)
                        saveSessionKey('body_session_notes', bodySessionNotes)
                        const phone = selectedClient.phone.replace(/^0/, '972')
                        const msg = 'היי ' + selectedClient.name + '! 🩺\\n\\nהסיכום האישי שלך מפגישת הגוף מדבר מוכן — היכנסי לאפליקציה לצפייה 💚\\nhttps://project-l990h.vercel.app'
                        window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank')
                        setApprovingBodyDoc(false); setBodyDocSent(true); setBodyClientDocPreview('')
                        setTimeout(() => setBodyDocSent(false), 4000)
                      }} disabled={approvingBodyDoc} style={{ flex: 2, padding: 12, borderRadius: 10, background: bodyDocSent ? '#16a34a' : '#0d9488', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                        {approvingBodyDoc ? '⏳...' : bodyDocSent ? '✅ נשלח!' : '✅ אשרי ושלחי ללקוחה'}
                      </button>
                      <button onClick={() => setBodyClientDocPreview('')} style={{ flex: 1, padding: 12, borderRadius: 10, background: '#f3f4f6', color: '#374151', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                        ✕ בטלי
                      </button>
                    </div>
                  </div>
                )}'''

content = content.replace(body_old_section, body_new_section, 1)
print("Body section replaced successfully")

# ============================================================
# CHILD section replacement
# ============================================================
child_old_start = '                {/* סיכום הפגישה ללקוחה — הורה-ילד */}'
idx_child_start = content.find(child_old_start)
if idx_child_start == -1:
    print("ERROR: Could not find child section start")
    exit(1)

child_end_marker = "          </>\n        )}\n\n        {tab === 'newclient'"
idx_child_next = content.find(child_end_marker, idx_child_start)
if idx_child_next == -1:
    # Try alternate ending
    child_end_marker2 = "          </>\n        )}"
    idx_child_next = content.find(child_end_marker2, idx_child_start)
    if idx_child_next == -1:
        print("ERROR: Could not find end of child section")
        exit(1)

pre_newclient = content[idx_child_start:idx_child_next]
idx_child_closing = pre_newclient.rfind(closing_seq)
if idx_child_closing == -1:
    print("ERROR: Could not find closing sequence in child section")
    print("Pre-newclient snippet:", repr(pre_newclient[-200:]))
    exit(1)

child_old_section = pre_newclient[:idx_child_closing]
print(f"Found child section, length: {len(child_old_section)}")
print(f"Child section starts with: {repr(child_old_section[:80])}")
print(f"Child section ends with: {repr(child_old_section[-80:])}")

child_new_section = '''                {/* מה גילינו במפגש — הורה-ילד */}
                <div style={{ background: '#fff', borderRadius: 18, border: '2px solid #7c3aed', overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', padding: '14px 18px', color: '#fff' }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>📝 מה גילינו במפגש</div>
                    <div style={{ fontSize: 11, color: '#e9d5ff' }}>מלאי אחרי הפגישה הפיזית → הפיקי סיכום להורה</div>
                  </div>
                  <div style={{ padding: 16 }}>
                    <textarea
                      value={childSessionNotes}
                      onChange={e => setChildSessionNotes(e.target.value)}
                      onBlur={() => saveSessionKey('child_session_notes', childSessionNotes)}
                      placeholder="מה עלה בפגישה? תובנות על הילד, דינמיקה שזוהתה, מה ההורה גילה על עצמו..."
                      rows={5}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.7, fontFamily: 'sans-serif' }}
                    />
                  </div>
                  <div style={{ padding: '0 16px 16px' }}>
                    <button onClick={async () => {
                      setChildDocLoading(true); setChildClientDocPreview('')
                      const prompt = 'אתה אתי אטל — יועצת בריאות ותזונה התנהגותית.\\n' +
                        'כתבי סיכום אישי חם ל-' + (selectedClient?.name||'') + ' לאחר פגישת הורה-ילד.\\n\\n' +
                        (childAnalysis ? 'ניתוח מקדים:\\n' + childAnalysis.substring(0,2000) + '\\n\\n' : '') +
                        (childSessionNotes.trim() ? 'מה עלה במפגש:\\n' + childSessionNotes + '\\n\\n' : '') +
                        'כתבי מסמך בעברית, גוף שני נקבה, ישיר, חם ואישי. מבנה קבוע — ללא הקדמה:\\n\\n' +
                        '🌟 מה ראינו על הילד שלך\\n[תובנה ספציפית על הילד — כוח / דפוס]\\n\\n' +
                        '🏠 הדינמיקה שזוהתה\\n[מה בבית תורם לדפוס]\\n\\n' +
                        '👁️ מה את יכולה לשנות\\n[מה ההורה עצמה עושה שונה — לא האשמה]\\n\\n' +
                        '🌿 פרקטיקה ביתית\\n[3-4 שינויים קונקרטיים]\\n\\n' +
                        '🚀 לשבוע הקרוב\\n[מה לשים לב אליו, מה לצפות]'
                      let result = ''
                      try {
                        const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'rootsAnalysis', prompt, name: selectedClient?.name }) })
                        if (!res.ok) throw new Error('API error')
                        const reader = res.body.getReader(); const decoder = new TextDecoder()
                        while (true) { const { done, value } = await reader.read(); if (done) break; result += decoder.decode(value, { stream: true }); setChildClientDocPreview(result) }
                      } catch(e) { if (!result) alert('שגיאת רשת — נסי שוב') }
                      if (result) saveSessionKey('child_session_notes', childSessionNotes)
                      setChildDocLoading(false)
                    }} disabled={childDocLoading} style={{ width: '100%', padding: 13, borderRadius: 12, background: childDocLoading ? '#9ca3af' : '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 14 }}>
                      {childDocLoading ? '⏳ מפיקה...' : '← הפיקי סיכום להורה'}
                    </button>
                  </div>
                </div>

                {childClientDocPreview && (
                  <div style={{ background: '#fff', borderRadius: 18, border: '2px solid #7c3aed', overflow: 'hidden', marginBottom: 16 }}>
                    <div style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', padding: '14px 18px', color: '#fff' }}>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>✏️ תצוגה מקדימה — ערכי לפני שליחה</div>
                      <div style={{ fontSize: 11, color: '#e9d5ff' }}>ערכי את הטקסט ← אשרי ושלחי</div>
                    </div>
                    <div style={{ padding: 16 }}>
                      <textarea value={childClientDocPreview} onChange={e => setChildClientDocPreview(e.target.value)} rows={18} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', outline: 'none', textAlign: 'right', boxSizing: 'border-box', lineHeight: 1.8, fontFamily: 'sans-serif', direction: 'rtl' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px' }}>
                      <button onClick={async () => {
                        if (!selectedClient.phone) return alert('אין מספר טלפון ללקוחה')
                        setApprovingChildDoc(true)
                        await supabase.from('client_profiles').update({ child_feedback: childClientDocPreview, child_feedback_at: new Date().toISOString() }).eq('client_password', selectedClient.password)
                        saveSessionKey('child_session_notes', childSessionNotes)
                        const phone = selectedClient.phone.replace(/^0/, '972')
                        const msg = 'היי ' + selectedClient.name + '! \\u{1F46A}\\n\\nהסיכום מהפגישה שלנו מוכן — היכנסי לאפליקציה לצפייה 💚\\nhttps://project-l990h.vercel.app'
                        window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank')
                        setApprovingChildDoc(false); setChildDocSent(true); setChildClientDocPreview('')
                        setTimeout(() => setChildDocSent(false), 4000)
                      }} disabled={approvingChildDoc} style={{ flex: 2, padding: 12, borderRadius: 10, background: childDocSent ? '#16a34a' : '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                        {approvingChildDoc ? '⏳...' : childDocSent ? '✅ נשלח!' : '✅ אשרי ושלחי ללקוחה'}
                      </button>
                      <button onClick={() => setChildClientDocPreview('')} style={{ flex: 1, padding: 12, borderRadius: 10, background: '#f3f4f6', color: '#374151', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                        ✕ בטלי
                      </button>
                    </div>
                  </div>
                )}'''

content = content.replace(child_old_section, child_new_section, 1)
print("Child section replaced successfully")

# ============================================================
# Write result
# ============================================================
with open('src/app/admin/page.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✅ Pass 2 complete — all 3 sections replaced")
print(f"Final file size: {len(content)} bytes")
