-- SCRUM-130: get_recent_staging(store_slug, row_limit) era SECURITY DEFINER y
-- ejecutable por anon; su único llamador era la demo de scraping, que este
-- ticket elimina del repo. No se endurece, se elimina.
drop function if exists get_recent_staging(text, int);
