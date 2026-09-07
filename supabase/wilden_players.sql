-- ─── טבלת השחקנים של WILDEN ───
-- להריץ פעם אחת ב-Supabase, בלשונית SQL Editor (הפרויקט חייב להיות פעיל —
-- פרויקט חינמי שנעצר צריך "Resume" קודם).
--
-- מה נשמר כאן: יצורים שנתפסו, חומרים, מטבעות, מספר מסעות, התקדמות בעולם.
-- מה לא נשמר כאן, ואסור שיישמר: מיקום, מסלולים, כתובת הבית, קואורדינטות.
-- הקוד באפליקציה מסנן את זה לפני כל שליחה (forServer ב-persist.js, נבדק
-- בטסטים), והמדיניות למטה לא מאפשרת לשלוף רשימת שחקנים — רק קוד מדויק.

create table if not exists public.wilden_players (
  code        text primary key,
  name        text not null default '',
  world       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.wilden_players enable row level security;

-- הפיילוט בלי התחברות: הזהות היא הקוד עצמו (5 תווים אקראיים).
drop policy if exists wilden_players_read on public.wilden_players;
create policy wilden_players_read on public.wilden_players
  for select using (true);

drop policy if exists wilden_players_insert on public.wilden_players;
create policy wilden_players_insert on public.wilden_players
  for insert with check (char_length(code) between 4 and 8);

drop policy if exists wilden_players_update on public.wilden_players;
create policy wilden_players_update on public.wilden_players
  for update using (true) with check (char_length(code) between 4 and 8);

create index if not exists wilden_players_updated_idx
  on public.wilden_players (updated_at desc);

-- ─── לראות איך הפיילוט מתקדם ───
-- select name, code,
--        (world->'progress'->>'walks')::int          as walks,
--        (world->'progress'->>'coins')::int          as coins,
--        world->'progress'->'creatures'              as creatures,
--        updated_at
-- from public.wilden_players
-- order by updated_at desc;
