-- DEVELOPMENT ONLY: idempotent Boardly v1.0.0 demo data.
-- Run against boardly_db after Boardly_schema.sql. This file does not alter schema.
BEGIN;

INSERT INTO product_categories (id, code, name, sort_order) VALUES
  ('10000000-0000-0000-0000-000000000001', 'strategy', 'Strategy', 10),
  ('10000000-0000-0000-0000-000000000002', 'party', 'Party', 20),
  ('10000000-0000-0000-0000-000000000003', 'family', 'Family', 30),
  ('10000000-0000-0000-0000-000000000004', 'cooperative', 'Cooperative', 40),
  ('10000000-0000-0000-0000-000000000005', 'abstract', 'Abstract', 50),
  ('10000000-0000-0000-0000-000000000006', 'adventure', 'Adventure', 60)
ON CONFLICT (code) DO NOTHING;

INSERT INTO products (id, sku, name, category_id, base_price, sale_price, min_players, max_players, min_play_time_minutes, max_play_time_minutes, min_age, difficulty, publisher_name, designer_name, languages_text, description, published_at) VALUES
  ('20000000-0000-0000-0000-000000000001', 'SG-WING-EN', 'Wingspan', '10000000-0000-0000-0000-000000000001', 1890, NULL, 1, 5, 40, 70, 10, 'medium', 'Stonemaier Games', 'Elizabeth Hargrave', 'English / Thai', 'A competitive, card-driven engine-building board game about discovering and attracting birds to wildlife preserves.', '2025-08-01T00:00:00Z'),
  ('20000000-0000-0000-0000-000000000002', 'CAT-BASE-EN', 'Catan', '10000000-0000-0000-0000-000000000001', 1490, NULL, 3, 4, 60, 120, 10, 'easy', 'Catan Studio', 'Klaus Teuber', 'English / Thai', 'Build settlements, cities, and roads while trading resources with rivals.', '2025-07-15T00:00:00Z'),
  ('20000000-0000-0000-0000-000000000003', 'TTR-BASE-EN', 'Ticket to Ride', '10000000-0000-0000-0000-000000000003', 1290, NULL, 2, 5, 30, 60, 8, 'easy', 'Days of Wonder', 'Alan R. Moon', 'English / Thai', 'A cross-country train adventure of route building and city connections.', '2025-06-10T00:00:00Z'),
  ('20000000-0000-0000-0000-000000000004', 'CNAME-EN', 'Codenames', '10000000-0000-0000-0000-000000000002', 690, NULL, 2, 8, 15, 30, 10, 'easy', 'Czech Games Edition', 'Vlaada Chvatil', 'English / Thai', 'Teams use one-word clues to identify their secret agents.', '2025-05-20T00:00:00Z'),
  ('20000000-0000-0000-0000-000000000005', 'PAN-BASE-EN', 'Pandemic', '10000000-0000-0000-0000-000000000004', 1190, NULL, 2, 4, 45, 75, 8, 'medium', 'Z-Man Games', 'Matt Leacock', 'English / Thai', 'Work together to treat outbreaks and discover cures before time runs out.', '2025-04-10T00:00:00Z'),
  ('20000000-0000-0000-0000-000000000006', 'AZUL-EN', 'Azul', '10000000-0000-0000-0000-000000000005', 990, NULL, 2, 4, 30, 45, 8, 'easy', 'Next Move Games', 'Michael Kiesling', 'English / Thai', 'Draft colorful tiles to complete patterns and score points.', '2026-08-12T00:00:00Z'),
  ('20000000-0000-0000-0000-000000000007', 'GLOOM-EN', 'Gloomhaven', '10000000-0000-0000-0000-000000000006', 4890, NULL, 1, 4, 60, 120, 14, 'expert', 'Cephalofair Games', 'Isaac Childres', 'English', 'A tactical dungeon-crawl campaign with a branching narrative.', '2025-03-10T00:00:00Z'),
  ('20000000-0000-0000-0000-000000000008', 'DIXIT-EN', 'Dixit', '10000000-0000-0000-0000-000000000002', 890, 790, 3, 6, 30, 30, 8, 'easy', 'Libellud', 'Jean-Louis Roubira', 'English / Thai', 'Use dreamlike illustrations to tell stories and make clever guesses.', '2026-08-18T00:00:00Z')
ON CONFLICT (sku) DO NOTHING;

INSERT INTO product_media (id, product_id, media_url, alt_text, is_primary, sort_order) VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '/product-media/Wingspan.jpg', 'Wingspan board game box', TRUE, 0),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '/product-media/Catan.jpg', 'Catan board game box', TRUE, 0),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '/product-media/Ticket_the_ride.jpg', 'Ticket to Ride board game box', TRUE, 0),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', '/product-media/Codename.jpg', 'Codenames board game box', TRUE, 0),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', '/product-media/Pandemic.jpg', 'Pandemic board game box', TRUE, 0),
  ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000006', '/product-media/Azul.jpg', 'Azul board game box', TRUE, 0),
  ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000007', '/product-media/Gloomhaven.jpg', 'Gloomhaven board game box', TRUE, 0),
  ('30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000008', '/product-media/Dixit.jpg', 'Dixit board game box', TRUE, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO product_reviews (id, product_id, rating, review_text, status, created_at) VALUES
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 5, 'Beautiful artwork and engaging gameplay.', 'published', '2026-08-12T00:00:00Z'),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 4, 'A rewarding game after the first round.', 'published', '2026-08-08T00:00:00Z'),
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 5, 'A classic that remains easy to teach.', 'published', '2026-08-03T00:00:00Z'),
  ('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000006', 5, 'Fast to learn and satisfying to replay.', 'published', '2026-08-20T00:00:00Z'),
  ('40000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000008', 4, 'A lovely party game for mixed groups.', 'published', '2026-08-21T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO branches (id, code, name, address_line1, district, province, postal_code, phone, status, allow_reservations) VALUES
  ('50000000-0000-0000-0000-000000000001', 'BG-CTR', 'Central Branch', '123 Ekkamai Road', 'Watthana', 'Bangkok', '10110', '02-111-2222', 'active', TRUE),
  ('50000000-0000-0000-0000-000000000002', 'BG-SLM', 'Silom Branch', '45 Silom Road', 'Bang Rak', 'Bangkok', '10500', '02-333-4444', 'active', TRUE),
  ('50000000-0000-0000-0000-000000000003', 'BG-SIM', 'Siam Branch', '22 Rama I Road', 'Pathum Wan', 'Bangkok', '10330', '02-555-6666', 'active', TRUE),
  ('50000000-0000-0000-0000-000000000004', 'BG-ONN', 'On Nut Branch', '88 Sukhumvit 77', 'Prawet', 'Bangkok', '10250', '02-777-8888', 'inactive', FALSE)
ON CONFLICT (code) DO NOTHING;

-- Preserve historical records for obsolete Phase/smoke identities while revoking login access.
UPDATE auth_sessions
SET revoked_at = COALESCE(revoked_at, NOW())
WHERE user_id IN (
  SELECT id
  FROM users
  WHERE LOWER(email) LIKE 'phase6.%'
     OR LOWER(email) LIKE 'phase7.%'
     OR LOWER(email) LIKE 'phase6-%@boardly.test'
     OR LOWER(email) LIKE 'phase7-%@boardly.test'
     OR LOWER(email) LIKE '%@boardly.dev'
     OR LOWER(email) LIKE 'smoke.%'
     OR LOWER(email) LIKE 'smoke-%'
);

UPDATE users
SET status = 'inactive',
    deleted_at = COALESCE(deleted_at, NOW()),
    updated_at = NOW()
WHERE LOWER(email) LIKE 'phase6.%'
   OR LOWER(email) LIKE 'phase7.%'
   OR LOWER(email) LIKE 'phase6-%@boardly.test'
   OR LOWER(email) LIKE 'phase7-%@boardly.test'
   OR LOWER(email) LIKE '%@boardly.dev'
   OR LOWER(email) LIKE 'smoke.%'
   OR LOWER(email) LIKE 'smoke-%';

-- Intentional local demo accounts. Password values are BCrypt hashes.
INSERT INTO users (id, first_name, last_name, display_name, email, password_hash, status, deleted_at) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'Development', 'Customer', 'Development Customer', 'customer@boardly.com', '$2a$10$FkNSS08/.OBZf45LjfzmNOKqueFUUtWIXyYprPEM7Uoag1bO5clxK', 'active', NULL),
  ('e0000000-0000-0000-0000-000000000002', 'Development', 'Staff', 'Development Staff', 'staff@boardly.com', '$2a$10$1Z7ukHjM1RnWD6y08BpnDe4.WeBY8PTJypgaGpS5RouDpEYSs45qu', 'active', NULL),
  ('e0000000-0000-0000-0000-000000000004', 'Development', 'Manager', 'Development Manager', 'manager@boardly.com', '$2a$10$I3e5EDpvxTBGXRQINtvdiuwTayPuT06aIDKLBaDHcUMB0aQ872xm.', 'active', NULL),
  ('e0000000-0000-0000-0000-000000000003', 'Development', 'Admin', 'Development Admin', 'admin@boardly.com', '$2a$10$VvcQR0RI33LlrJXs6fGbXOHGR.G9Dz94L.ywhU40qeSVu92B7hHsq', 'active', NULL)
ON CONFLICT (LOWER(email)) DO UPDATE
SET first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    display_name = EXCLUDED.display_name,
    password_hash = EXCLUDED.password_hash,
    status = 'active',
    deleted_at = NULL,
    updated_at = NOW();

DELETE FROM user_roles
WHERE user_id IN (
  SELECT id FROM users WHERE LOWER(email) IN ('customer@boardly.com', 'staff@boardly.com', 'manager@boardly.com', 'admin@boardly.com')
);

INSERT INTO user_roles (user_id, role_id)
SELECT users.id, roles.id
FROM (VALUES
  ('customer@boardly.com', 'customer'),
  ('staff@boardly.com', 'staff'),
  ('manager@boardly.com', 'manager'),
  ('admin@boardly.com', 'admin')
) AS demo(email, role_code)
JOIN users ON LOWER(users.email) = demo.email
JOIN roles ON roles.code = demo.role_code;

DELETE FROM staff_branch_assignments
WHERE user_id IN (
  SELECT id FROM users WHERE LOWER(email) IN ('customer@boardly.com', 'staff@boardly.com', 'manager@boardly.com', 'admin@boardly.com')
);

INSERT INTO staff_branch_assignments (user_id, branch_id, is_primary)
SELECT users.id, branches.id, TRUE
FROM users
JOIN branches ON branches.code = 'BG-CTR'
WHERE LOWER(users.email) IN ('staff@boardly.com', 'manager@boardly.com');

-- Development convention: day_of_week 0-6 is Monday-Sunday.
INSERT INTO branch_operating_hours (id, branch_id, day_of_week, open_time, close_time, is_closed) VALUES
  ('60000000-0000-0000-0000-000000000011', '50000000-0000-0000-0000-000000000001', 0, '10:00', '22:00', FALSE),
  ('60000000-0000-0000-0000-000000000012', '50000000-0000-0000-0000-000000000001', 1, '10:00', '22:00', FALSE),
  ('60000000-0000-0000-0000-000000000013', '50000000-0000-0000-0000-000000000001', 2, '10:00', '22:00', FALSE),
  ('60000000-0000-0000-0000-000000000014', '50000000-0000-0000-0000-000000000001', 3, '10:00', '22:00', FALSE),
  ('60000000-0000-0000-0000-000000000015', '50000000-0000-0000-0000-000000000001', 4, '10:00', '23:00', FALSE),
  ('60000000-0000-0000-0000-000000000016', '50000000-0000-0000-0000-000000000001', 5, '09:00', '23:00', FALSE),
  ('60000000-0000-0000-0000-000000000017', '50000000-0000-0000-0000-000000000001', 6, '09:00', '21:00', FALSE),
  ('60000000-0000-0000-0000-000000000021', '50000000-0000-0000-0000-000000000002', 0, '11:00', '21:00', FALSE),
  ('60000000-0000-0000-0000-000000000022', '50000000-0000-0000-0000-000000000002', 1, '11:00', '21:00', FALSE),
  ('60000000-0000-0000-0000-000000000023', '50000000-0000-0000-0000-000000000002', 2, '11:00', '21:00', FALSE),
  ('60000000-0000-0000-0000-000000000024', '50000000-0000-0000-0000-000000000002', 3, '11:00', '21:00', FALSE),
  ('60000000-0000-0000-0000-000000000025', '50000000-0000-0000-0000-000000000002', 4, '11:00', '22:00', FALSE),
  ('60000000-0000-0000-0000-000000000026', '50000000-0000-0000-0000-000000000002', 5, '10:00', '22:00', FALSE),
  ('60000000-0000-0000-0000-000000000027', '50000000-0000-0000-0000-000000000002', 6, NULL, NULL, TRUE),
  ('60000000-0000-0000-0000-000000000031', '50000000-0000-0000-0000-000000000003', 0, '10:00', '21:00', FALSE),
  ('60000000-0000-0000-0000-000000000032', '50000000-0000-0000-0000-000000000003', 1, '10:00', '21:00', FALSE),
  ('60000000-0000-0000-0000-000000000033', '50000000-0000-0000-0000-000000000003', 2, '10:00', '21:00', FALSE),
  ('60000000-0000-0000-0000-000000000034', '50000000-0000-0000-0000-000000000003', 3, '10:00', '21:00', FALSE),
  ('60000000-0000-0000-0000-000000000035', '50000000-0000-0000-0000-000000000003', 4, '10:00', '22:00', FALSE),
  ('60000000-0000-0000-0000-000000000036', '50000000-0000-0000-0000-000000000003', 5, '09:00', '22:00', FALSE),
  ('60000000-0000-0000-0000-000000000037', '50000000-0000-0000-0000-000000000003', 6, '09:00', '20:00', FALSE),
  ('60000000-0000-0000-0000-000000000041', '50000000-0000-0000-0000-000000000004', 0, '12:00', '21:00', FALSE),
  ('60000000-0000-0000-0000-000000000042', '50000000-0000-0000-0000-000000000004', 1, NULL, NULL, TRUE),
  ('60000000-0000-0000-0000-000000000043', '50000000-0000-0000-0000-000000000004', 2, '12:00', '21:00', FALSE),
  ('60000000-0000-0000-0000-000000000044', '50000000-0000-0000-0000-000000000004', 3, '12:00', '21:00', FALSE),
  ('60000000-0000-0000-0000-000000000045', '50000000-0000-0000-0000-000000000004', 4, '12:00', '22:00', FALSE),
  ('60000000-0000-0000-0000-000000000046', '50000000-0000-0000-0000-000000000004', 5, '10:00', '22:00', FALSE),
  ('60000000-0000-0000-0000-000000000047', '50000000-0000-0000-0000-000000000004', 6, '10:00', '20:00', FALSE)
ON CONFLICT (branch_id, day_of_week) DO UPDATE
SET open_time = EXCLUDED.open_time,
    close_time = EXCLUDED.close_time,
    is_closed = EXCLUDED.is_closed;

-- DEVELOPMENT ONLY: Phase 6 per-person reservation and play-session pricing.
-- The backend rounds each started hour up and charges every player the adult/default rate.
INSERT INTO branch_pricing_rules (id, branch_id, first_hour_per_person, additional_hour_per_person, child_hour_per_person, child_age_under, currency, effective_from) VALUES
  ('b0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 80.00, 60.00, 50.00, 12, 'THB', '2020-01-01T00:00:00Z'),
  ('b0000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 75.00, 55.00, 45.00, 12, 'THB', '2020-01-01T00:00:00Z'),
  ('b0000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003', 85.00, 65.00, 55.00, 12, 'THB', '2020-01-01T00:00:00Z'),
  ('b0000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000004', 70.00, 50.00, 40.00, 12, 'THB', '2020-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE
SET first_hour_per_person = EXCLUDED.first_hour_per_person,
    additional_hour_per_person = EXCLUDED.additional_hour_per_person,
    child_hour_per_person = EXCLUDED.child_hour_per_person,
    child_age_under = EXCLUDED.child_age_under,
    currency = EXCLUDED.currency,
    effective_from = EXCLUDED.effective_from;

INSERT INTO branch_amenities (id, branch_id, amenity_text, sort_order) VALUES
  ('70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Cafe and beverages available', 10),
  ('70000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'Free high-speed Wi-Fi', 20),
  ('70000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000002', 'Coffee bar on-site', 10),
  ('70000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000003', 'Full cafe menu', 10),
  ('70000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000004', 'Free parking', 10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO branch_rules (id, branch_id, rule_text, sort_order) VALUES
  ('80000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'No outside food or drinks.', 10),
  ('80000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'Handle games with care.', 20),
  ('80000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000002', 'Quiet zone after 20:00.', 10),
  ('80000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000003', 'Reservations are recommended.', 10),
  ('80000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000004', 'Handle games with care.', 10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO table_zones (id, branch_id, name, sort_order) VALUES
  ('90000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Main', 10),
  ('90000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 'Main', 10),
  ('90000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003', 'Main', 10),
  ('90000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000004', 'Main', 10)
ON CONFLICT (branch_id, name) DO NOTHING;

INSERT INTO store_tables (id, branch_id, code, zone_id, min_players, max_players, operational_status, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'A1', '90000000-0000-0000-0000-000000000001', 2, 4, 'available', 10),
  ('a0000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'B1', '90000000-0000-0000-0000-000000000001', 4, 6, 'available', 20),
  ('a0000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000002', 'A1', '90000000-0000-0000-0000-000000000002', 2, 4, 'available', 10),
  ('a0000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000003', 'A1', '90000000-0000-0000-0000-000000000003', 2, 6, 'available', 10),
  ('a0000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000004', 'A1', '90000000-0000-0000-0000-000000000004', 2, 6, 'unavailable', 10)
ON CONFLICT (branch_id, code) DO NOTHING;

INSERT INTO branch_game_library (branch_id, product_id, playable_copies, is_available)
SELECT branch_id, product_id, playable_copies, TRUE
FROM (VALUES
  ('50000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 2),
  ('50000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 3),
  ('50000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000006'::uuid, 2),
  ('50000000-0000-0000-0000-000000000002'::uuid, '20000000-0000-0000-0000-000000000004'::uuid, 4),
  ('50000000-0000-0000-0000-000000000002'::uuid, '20000000-0000-0000-0000-000000000005'::uuid, 2),
  ('50000000-0000-0000-0000-000000000003'::uuid, '20000000-0000-0000-0000-000000000007'::uuid, 1),
  ('50000000-0000-0000-0000-000000000003'::uuid, '20000000-0000-0000-0000-000000000008'::uuid, 3)
) AS games(branch_id, product_id, playable_copies)
ON CONFLICT (branch_id, product_id) DO NOTHING;

INSERT INTO branch_product_inventory (branch_id, product_id, quantity_on_hand, reserved_quantity)
SELECT branch_id, product_id, quantity_on_hand, 0
FROM (VALUES
  ('50000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 12),
  ('50000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 8),
  ('50000000-0000-0000-0000-000000000002'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, 5),
  ('50000000-0000-0000-0000-000000000002'::uuid, '20000000-0000-0000-0000-000000000004'::uuid, 20),
  ('50000000-0000-0000-0000-000000000003'::uuid, '20000000-0000-0000-0000-000000000005'::uuid, 3),
  ('50000000-0000-0000-0000-000000000003'::uuid, '20000000-0000-0000-0000-000000000006'::uuid, 7),
  ('50000000-0000-0000-0000-000000000003'::uuid, '20000000-0000-0000-0000-000000000007'::uuid, 2),
  ('50000000-0000-0000-0000-000000000004'::uuid, '20000000-0000-0000-0000-000000000008'::uuid, 15)
) AS inventory(branch_id, product_id, quantity_on_hand)
ON CONFLICT (branch_id, product_id) DO NOTHING;

COMMIT;
