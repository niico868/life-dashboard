-- Chore levelling: when a chore levels up, the old row is switched off and a new
-- row (level + 1) is created that points back to it, so history per level is kept.

alter table life.habits
  add column levelled_from uuid references life.habits(id) on delete set null,
  add column level_up_snoozed_until date;
