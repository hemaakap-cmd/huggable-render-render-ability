-- Add price_hidden flag to ssra_courses
-- When true: public pages show "Coming Soon" instead of the price
ALTER TABLE ssra_courses
  ADD COLUMN IF NOT EXISTS price_hidden boolean NOT NULL DEFAULT false;
