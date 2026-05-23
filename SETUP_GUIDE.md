# מדריך התקנה – בין הראש לצלחת 🥗

## מה תקבלי בסוף?
- קישור לאפליקציה שתשלחי למתאמנות
- דשבורד אישי שלך לראות מה כל מתאמנת עשתה ולתת משוב
- הכל חינמי לחלוטין!

---

## שלב 1 – Supabase (מסד הנתונים, 5 דקות)

1. כנסי ל־ https://supabase.com ולחצי **Start your project**
2. הירשמי עם Google (הכי פשוט)
3. לחצי **New Project**, תני לו שם (לדוגמה: `nutrition-app`)
4. בחרי אזור: **eu-west** (הכי קרוב לישראל)
5. המתיני ~2 דקות עד שהפרויקט מוכן

### צרי את הטבלה:
6. בתפריט הצדדי לחצי **SQL Editor**
7. העתיקי את הקוד הבא והדביקי:

```sql
create table daily_logs (
  id uuid default gen_random_uuid() primary key,
  client_name text not null,
  log_date date not null,
  checks jsonb default '{}',
  carb_sel text,
  prot_sel text,
  fat_sel text,
  lunch_opt text,
  water integer default 0,
  steps text,
  note text,
  trainer_feedback text,
  updated_at timestamptz default now(),
  unique(client_name, log_date)
);

alter table daily_logs enable row level security;
create policy "allow all" on daily_logs for all using (true) with check (true);
```

8. לחצי **Run** (הכפתור הירוק)

### קבלי את המפתחות:
9. בתפריט הצדדי לחצי **Settings → API**
10. העתיקי את:
    - **Project URL** (משהו כמו `https://xxxxx.supabase.co`)
    - **anon public** key (מפתח ארוך)

---

## שלב 2 – Vercel (האתר, 5 דקות)

1. כנסי ל־ https://vercel.com ולחצי **Sign Up**
2. הירשמי עם GitHub (אם אין לך חשבון GitHub, פתחי אחד ב־ https://github.com)
3. ב־GitHub, צרי **New Repository** בשם `nutrition-app`
4. העלי את כל הקבצים מהתיקייה הזו לrepository

### הגדרת הסביבה:
5. ב־Vercel, לחצי **Add New Project**
6. בחרי את ה־repository שיצרת
7. לפני הלחיצה על Deploy, לחצי **Environment Variables** והוסיפי:
   - `NEXT_PUBLIC_SUPABASE_URL` = ה-URL שהעתקת מ-Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = המפתח שהעתקת מ-Supabase
   - `NEXT_PUBLIC_TRAINER_PASSWORD` = סיסמה שתבחרי (לדוגמה: `eti2024`)
8. לחצי **Deploy** וחכי ~2 דקות

---

## שלב 3 – זהו! 🎉

תקבלי קישור כמו: `https://nutrition-app-xxx.vercel.app`

- **למתאמנות** שלחי: `https://nutrition-app-xxx.vercel.app`
- **לעצמך** (דשבורד): `https://nutrition-app-xxx.vercel.app/dashboard`

---

## שאלות?
שאלי את Claude ואשמח לעזור! 💪
