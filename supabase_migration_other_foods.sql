-- הוספת עמודות "אחר" לטבלת daily_logs
-- מריצים פעם אחת בסופרבייס (SQL Editor)
ALTER TABLE daily_logs
  ADD COLUMN IF NOT EXISTS boker_other  jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS lunch_other  jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS erev_other   jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS benayim_other jsonb DEFAULT '[]'::jsonb;
