
-- ══════════════════════════════════════════════════════
-- CLEANUP: remove all test profiles (aaaaaaaa-000x IDs)
-- and every piece of data referencing them
-- All UUID columns cast to ::text for LIKE comparison
-- ══════════════════════════════════════════════════════

-- 1. Messages in matches involving test users
DELETE FROM messages
WHERE match_id IN (
  SELECT id FROM matches
  WHERE user1_id::text LIKE 'aaaaaaaa-%' OR user2_id::text LIKE 'aaaaaaaa-%'
)
OR sender_id::text LIKE 'aaaaaaaa-%';

-- 2. Notifications referencing test users (both columns are uuid)
DELETE FROM notifications
WHERE user_id::text   LIKE 'aaaaaaaa-%'
   OR related_id::text LIKE 'aaaaaaaa-%';

-- 3. Favorites referencing test users
DELETE FROM favoris
WHERE user_id::text    LIKE 'aaaaaaaa-%'
   OR profile_id::text LIKE 'aaaaaaaa-%';

-- 4. Matches involving test users
DELETE FROM matches
WHERE user1_id::text LIKE 'aaaaaaaa-%' OR user2_id::text LIKE 'aaaaaaaa-%';

-- 5. Likes involving test users
DELETE FROM likes
WHERE from_user_id::text LIKE 'aaaaaaaa-%' OR to_user_id::text LIKE 'aaaaaaaa-%';

-- 6. Connections involving test users
DELETE FROM connections
WHERE from_user_id::text LIKE 'aaaaaaaa-%' OR to_user_id::text LIKE 'aaaaaaaa-%';

-- 7. Gamification data for test users
DELETE FROM user_challenges     WHERE user_id::text LIKE 'aaaaaaaa-%';
DELETE FROM user_streaks        WHERE user_id::text LIKE 'aaaaaaaa-%';
DELETE FROM user_badges         WHERE user_id::text LIKE 'aaaaaaaa-%';

-- 8. Roman content/likes by test users
DELETE FROM roman_likes   WHERE user_id::text  LIKE 'aaaaaaaa-%';
DELETE FROM roman_content WHERE author_id::text LIKE 'aaaaaaaa-%';

-- 9. Event inscriptions by test users
DELETE FROM event_inscriptions WHERE user_id::text LIKE 'aaaaaaaa-%';

-- 10. Profiles
DELETE FROM profiles WHERE id::text LIKE 'aaaaaaaa-%';

-- 11. Auth credentials
DELETE FROM auth.users WHERE id::text LIKE 'aaaaaaaa-%';
