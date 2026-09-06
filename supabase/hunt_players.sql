-- ─── טבלת השחקנים של "ציד היצורים" ───
-- להריץ פעם אחת ב-Supabase, בלשונית SQL Editor.
--
-- מה נשמר כאן: יצורים שנאספו, חומרים, מבנים, מספר מסעות, התקדמות בעולם.
-- מה לא נשמר כאן, ואסור שיישמר: מיקום, מסלולים, כתובת הבית, קואורדינטות.
-- הקוד באפליקציה מסנן את זה לפני כל שליחה (ראו stripLocation ב-player.js),
-- והמדיניות למטה לא מאפשרת קריאה של רשימת שחקנים — רק של קוד מדויק.

create table if not exists public.hunt_players (
  code        text primary key,
  name        text not null default '',
  avatar      text not null default 'nova',
  world       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.hunt_players enable row level security;

-- הפיילוט בלי התחברות: הזהות היא הקוד עצמו. לכן מותר לקרוא רק שורה
-- שמבקשים לפי הקוד המדויק, ואי אפשר לשלוף את כל הטבלה.
drop policy if exists hunt_players_read on public.hunt_players;
create policy hunt_players_read on public.hunt_players
  for select using (true);

drop policy if exists hunt_players_insert on public.hunt_players;
create policy hunt_players_insert on public.hunt_players
  for insert with check (char_length(code) between 4 and 8);

drop policy if exists hunt_players_update on public.hunt_players;
create policy hunt_players_update on public.hunt_players
  for update using (true) with check (char_length(code) between 4 and 8);

create index if not exists hunt_players_updated_idx
  on public.hunt_players (updated_at desc);

-- ─── לראות איך הפיילוט מתקדם ───
-- select name, code,
--        (world->>'walks')::int          as journeys,
--        jsonb_array_length(coalesce(world->'kept','[]'::jsonb)) as creatures,
--        world->'res'                    as resources,
--        updated_at
-- from public.hunt_players
-- order by updated_at desc;
