-- Pokemon Publisher v2 > node "Count Today Posts"
-- Backup de 13/08/2026.

SELECT COUNT(*)::int AS post_count FROM promos WHERE posted_at::date = CURRENT_DATE AND status = 'posted';
