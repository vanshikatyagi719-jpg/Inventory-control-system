-- ==============================================================================
-- INVENTORY & STOCK CONTROL SYSTEM - SEED DATA
-- File: supabase/seed.sql
-- ==============================================================================

-- 1. CLEAN EXISTING DATA IN ORDER
TRUNCATE TABLE public.alert_dismissals CASCADE;
TRUNCATE TABLE public.item_notes CASCADE;
TRUNCATE TABLE public.item_audit_logs CASCADE;
TRUNCATE TABLE public.stock_movements CASCADE;
TRUNCATE TABLE public.items CASCADE;
TRUNCATE TABLE public.categories CASCADE;
TRUNCATE TABLE public.location_assignments CASCADE;
TRUNCATE TABLE public.locations CASCADE;
TRUNCATE TABLE public.profiles CASCADE;

-- Delete previous demo users from auth.users (if any)
DELETE FROM auth.users WHERE email IN ('manager@demo.com', 'staff.main@demo.com', 'staff.retail@demo.com');

-- 2. CREATE DEMO USERS IN AUTH.USERS (Password: Password123!)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
) VALUES 
(
    '00000000-0000-0000-0000-000000000000',
    'a1111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'manager@demo.com',
    crypt('Password123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Sarah Connor (Manager)","role":"manager"}',
    NOW(),
    NOW(),
    '',
    ''
),
(
    '00000000-0000-0000-0000-000000000000',
    'a2222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'staff.main@demo.com',
    crypt('Password123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Alex Rivera (Warehouse Lead)","role":"staff"}',
    NOW(),
    NOW(),
    '',
    ''
),
(
    '00000000-0000-0000-0000-000000000000',
    'a3333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'staff.retail@demo.com',
    crypt('Password123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Jordan Lee (Retail Staff)","role":"staff"}',
    NOW(),
    NOW(),
    '',
    ''
);

-- 3. CREATE / SYNC PROFILES
INSERT INTO public.profiles (id, email, full_name, role) VALUES
('a1111111-1111-1111-1111-111111111111', 'manager@demo.com', 'Sarah Connor (Manager)', 'manager'),
('a2222222-2222-2222-2222-222222222222', 'staff.main@demo.com', 'Alex Rivera (Warehouse Lead)', 'staff'),
('a3333333-3333-3333-3333-333333333333', 'staff.retail@demo.com', 'Jordan Lee (Retail Staff)', 'staff')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

-- 4. CREATE LOCATIONS
INSERT INTO public.locations (id, name, code) VALUES
('11111111-1111-1111-1111-111111111111', 'Main Warehouse', 'WH-MAIN'),
('22222222-2222-2222-2222-222222222222', 'Retail Floor A', 'RET-01'),
('33333333-3333-3333-3333-333333333333', 'Retail Floor B', 'RET-02'),
('44444444-4444-4444-4444-444444444444', 'North Construction Site', 'SITE-N');

-- 5. ASSIGN STAFF TO LOCATIONS
-- Alex assigned to Main Warehouse and North Site
INSERT INTO public.location_assignments (user_id, location_id) VALUES
('a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111'),
('a2222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444'),
-- Jordan assigned to Retail Floor A only
('a3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222');

-- 6. CREATE CATEGORIES
INSERT INTO public.categories (id, name, description) VALUES
('c1111111-1111-1111-1111-111111111111', 'Fasteners & Hardware', 'Nuts, bolts, screws, and structural brackets'),
('c2222222-2222-2222-2222-222222222222', 'Power Tools', 'Cordless drills, impact drivers, saws, and batteries'),
('c3333333-3333-3333-3333-333333333333', 'Safety Equipment', 'Helmets, safety glasses, gloves, and harnesses'),
('c4444444-4444-4444-4444-444444444444', 'Plumbing & Pipes', 'PVC pipes, copper fittings, and pressure valves'),
('c5555555-5555-5555-5555-555555555555', 'Electrical & Lighting', 'Cables, conduits, breakers, and LED floodlights');

-- 7. CREATE ITEMS
INSERT INTO public.items (id, sku, name, description, category_id, unit_of_measure, reorder_level, is_archived) VALUES
('b1111111-1111-1111-1111-111111111111', 'FAST-HEX-M10', 'M10 Stainless Steel Hex Bolts (Box of 100)', 'Grade 316 stainless steel hex head machine bolts', 'c1111111-1111-1111-1111-111111111111', 'boxes', 20.00, FALSE),
('b2222222-2222-2222-2222-222222222222', 'TOOL-DRL-18V', '18V Brushless Cordless Drill Kit', 'Heavy-duty impact drill with two 4Ah lithium batteries', 'c2222222-2222-2222-2222-222222222222', 'units', 15.00, FALSE),
('b3333333-3333-3333-3333-333333333333', 'SAFE-GLV-XL', 'Cut-Resistant Work Gloves (XL)', 'Level 5 nitrile dipped grip safety gloves', 'c3333333-3333-3333-3333-333333333333', 'pairs', 50.00, FALSE),
('b4444444-4444-4444-4444-444444444444', 'PLUM-VLV-2IN', '2-Inch Schedule 80 PVC Ball Valve', 'Threaded industrial grade shut-off valve', 'c4444444-4444-4444-4444-444444444444', 'units', 10.00, FALSE),
('b5555555-5555-5555-5555-555555555555', 'ELEC-LED-50W', '50W IP65 Outdoor LED Floodlight', 'High-lumen commercial work site floodlamp', 'c5555555-5555-5555-5555-555555555555', 'units', 12.00, FALSE),
('b6666666-6666-6666-6666-666666666666', 'TOOL-SAW-OLD', 'Legacy 1200W Circular Saw (Discontinued)', 'Replaced by next-generation cordless edition', 'c2222222-2222-2222-2222-222222222222', 'units', 5.00, TRUE);

-- 8. APPEND-ONLY STOCK MOVEMENTS (Spanning past 8 weeks)
-- Receipts (7-8 weeks ago)
INSERT INTO public.stock_movements (item_id, movement_type, quantity, location_id, recorded_by, created_at) VALUES
('b1111111-1111-1111-1111-111111111111', 'receipt', 100.00, '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '49 days'),
('b2222222-2222-2222-2222-222222222222', 'receipt', 30.00, '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '48 days'),
('b3333333-3333-3333-3333-333333333333', 'receipt', 200.00, '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '45 days'),
('b4444444-4444-4444-4444-444444444444', 'receipt', 40.00, '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '44 days'),
('b5555555-5555-5555-5555-555555555555', 'receipt', 50.00, '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '40 days'),
('b6666666-6666-6666-6666-666666666666', 'receipt', 10.00, '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '55 days');

-- Transfers (5 weeks ago)
INSERT INTO public.stock_movements (item_id, movement_type, quantity, location_id, destination_location_id, recorded_by, created_at) VALUES
('b1111111-1111-1111-1111-111111111111', 'transfer', 30.00, '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', NOW() - INTERVAL '35 days'),
('b2222222-2222-2222-2222-222222222222', 'transfer', 15.00, '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', NOW() - INTERVAL '34 days'),
('b4444444-4444-4444-4444-444444444444', 'transfer', 20.00, '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'a2222222-2222-2222-2222-222222222222', NOW() - INTERVAL '33 days');

-- Issues / Sales (3 weeks ago)
INSERT INTO public.stock_movements (item_id, movement_type, quantity, location_id, recorded_by, created_at) VALUES
('b2222222-2222-2222-2222-222222222222', 'issue', 12.00, '22222222-2222-2222-2222-222222222222', 'a3333333-3333-3333-3333-333333333333', NOW() - INTERVAL '21 days'),
('b2222222-2222-2222-2222-222222222222', 'issue', 10.00, '11111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', NOW() - INTERVAL '20 days'),
('b4444444-4444-4444-4444-444444444444', 'issue', 15.00, '44444444-4444-4444-4444-444444444444', 'a2222222-2222-2222-2222-222222222222', NOW() - INTERVAL '18 days'),
('b4444444-4444-4444-4444-444444444444', 'issue', 15.00, '11111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', NOW() - INTERVAL '17 days');

-- Adjustments (1 week ago - damaged goods with mandatory reason)
INSERT INTO public.stock_movements (item_id, movement_type, adjustment_direction, quantity, location_id, reason, recorded_by, created_at) VALUES
('b3333333-3333-3333-3333-333333333333', 'adjustment', 'decrease', 5.00, '11111111-1111-1111-1111-111111111111', 'Damaged in warehouse water leak', 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '7 days');

-- 9. STAFF NOTES
INSERT INTO public.item_notes (item_id, note, author_id, created_at) VALUES
('b2222222-2222-2222-2222-222222222222', 'Supplier notified of surge in demand. Restock expected in 10 business days.', 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '15 days'),
('b4444444-4444-4444-4444-444444444444', 'North Site requested 5 more units for next Monday.', 'a2222222-2222-2222-2222-222222222222', NOW() - INTERVAL '3 days');-- ==============================================================================
-- INVENTORY & STOCK CONTROL SYSTEM - SEED DATA
-- File: supabase/seed.sql
-- ==============================================================================

-- 1. CLEAN EXISTING DATA IN ORDER
TRUNCATE TABLE public.alert_dismissals CASCADE;
TRUNCATE TABLE public.item_notes CASCADE;
TRUNCATE TABLE public.item_audit_logs CASCADE;
TRUNCATE TABLE public.stock_movements CASCADE;
TRUNCATE TABLE public.items CASCADE;
TRUNCATE TABLE public.categories CASCADE;
TRUNCATE TABLE public.location_assignments CASCADE;
TRUNCATE TABLE public.locations CASCADE;
TRUNCATE TABLE public.profiles CASCADE;

-- Delete previous demo users from auth.users (if any)
DELETE FROM auth.users WHERE email IN ('manager@demo.com', 'staff.main@demo.com', 'staff.retail@demo.com');

-- 2. CREATE DEMO USERS IN AUTH.USERS (Password: Password123!)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
) VALUES 
(
    '00000000-0000-0000-0000-000000000000',
    'a1111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'manager@demo.com',
    crypt('Password123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Sarah Connor (Manager)","role":"manager"}',
    NOW(),
    NOW(),
    '',
    ''
),
(
    '00000000-0000-0000-0000-000000000000',
    'a2222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'staff.main@demo.com',
    crypt('Password123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Alex Rivera (Warehouse Lead)","role":"staff"}',
    NOW(),
    NOW(),
    '',
    ''
),
(
    '00000000-0000-0000-0000-000000000000',
    'a3333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'staff.retail@demo.com',
    crypt('Password123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Jordan Lee (Retail Staff)","role":"staff"}',
    NOW(),
    NOW(),
    '',
    ''
);

-- 3. CREATE / SYNC PROFILES
INSERT INTO public.profiles (id, email, full_name, role) VALUES
('a1111111-1111-1111-1111-111111111111', 'manager@demo.com', 'Sarah Connor (Manager)', 'manager'),
('a2222222-2222-2222-2222-222222222222', 'staff.main@demo.com', 'Alex Rivera (Warehouse Lead)', 'staff'),
('a3333333-3333-3333-3333-333333333333', 'staff.retail@demo.com', 'Jordan Lee (Retail Staff)', 'staff')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

-- 4. CREATE LOCATIONS
INSERT INTO public.locations (id, name, code) VALUES
('11111111-1111-1111-1111-111111111111', 'Main Warehouse', 'WH-MAIN'),
('22222222-2222-2222-2222-222222222222', 'Retail Floor A', 'RET-01'),
('33333333-3333-3333-3333-333333333333', 'Retail Floor B', 'RET-02'),
('44444444-4444-4444-4444-444444444444', 'North Construction Site', 'SITE-N');

-- 5. ASSIGN STAFF TO LOCATIONS
-- Alex assigned to Main Warehouse and North Site
INSERT INTO public.location_assignments (user_id, location_id) VALUES
('a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111'),
('a2222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444'),
-- Jordan assigned to Retail Floor A only
('a3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222');

-- 6. CREATE CATEGORIES
INSERT INTO public.categories (id, name, description) VALUES
('c1111111-1111-1111-1111-111111111111', 'Fasteners & Hardware', 'Nuts, bolts, screws, and structural brackets'),
('c2222222-2222-2222-2222-222222222222', 'Power Tools', 'Cordless drills, impact drivers, saws, and batteries'),
('c3333333-3333-3333-3333-333333333333', 'Safety Equipment', 'Helmets, safety glasses, gloves, and harnesses'),
('c4444444-4444-4444-4444-444444444444', 'Plumbing & Pipes', 'PVC pipes, copper fittings, and pressure valves'),
('c5555555-5555-5555-5555-555555555555', 'Electrical & Lighting', 'Cables, conduits, breakers, and LED floodlights');

-- 7. CREATE ITEMS
INSERT INTO public.items (id, sku, name, description, category_id, unit_of_measure, reorder_level, is_archived) VALUES
('b1111111-1111-1111-1111-111111111111', 'FAST-HEX-M10', 'M10 Stainless Steel Hex Bolts (Box of 100)', 'Grade 316 stainless steel hex head machine bolts', 'c1111111-1111-1111-1111-111111111111', 'boxes', 20.00, FALSE),
('b2222222-2222-2222-2222-222222222222', 'TOOL-DRL-18V', '18V Brushless Cordless Drill Kit', 'Heavy-duty impact drill with two 4Ah lithium batteries', 'c2222222-2222-2222-2222-222222222222', 'units', 15.00, FALSE),
('b3333333-3333-3333-3333-333333333333', 'SAFE-GLV-XL', 'Cut-Resistant Work Gloves (XL)', 'Level 5 nitrile dipped grip safety gloves', 'c3333333-3333-3333-3333-333333333333', 'pairs', 50.00, FALSE),
('b4444444-4444-4444-4444-444444444444', 'PLUM-VLV-2IN', '2-Inch Schedule 80 PVC Ball Valve', 'Threaded industrial grade shut-off valve', 'c4444444-4444-4444-4444-444444444444', 'units', 10.00, FALSE),
('b5555555-5555-5555-5555-555555555555', 'ELEC-LED-50W', '50W IP65 Outdoor LED Floodlight', 'High-lumen commercial work site floodlamp', 'c5555555-5555-5555-5555-555555555555', 'units', 12.00, FALSE),
('b6666666-6666-6666-6666-666666666666', 'TOOL-SAW-OLD', 'Legacy 1200W Circular Saw (Discontinued)', 'Replaced by next-generation cordless edition', 'c2222222-2222-2222-2222-222222222222', 'units', 5.00, TRUE);

-- 8. APPEND-ONLY STOCK MOVEMENTS (Spanning past 8 weeks)
-- Receipts (7-8 weeks ago)
INSERT INTO public.stock_movements (item_id, movement_type, quantity, location_id, recorded_by, created_at) VALUES
('b1111111-1111-1111-1111-111111111111', 'receipt', 100.00, '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '49 days'),
('b2222222-2222-2222-2222-222222222222', 'receipt', 30.00, '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '48 days'),
('b3333333-3333-3333-3333-333333333333', 'receipt', 200.00, '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '45 days'),
('b4444444-4444-4444-4444-444444444444', 'receipt', 40.00, '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '44 days'),
('b5555555-5555-5555-5555-555555555555', 'receipt', 50.00, '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '40 days'),
('b6666666-6666-6666-6666-666666666666', 'receipt', 10.00, '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '55 days');

-- Transfers (5 weeks ago)
INSERT INTO public.stock_movements (item_id, movement_type, quantity, location_id, destination_location_id, recorded_by, created_at) VALUES
('b1111111-1111-1111-1111-111111111111', 'transfer', 30.00, '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', NOW() - INTERVAL '35 days'),
('b2222222-2222-2222-2222-222222222222', 'transfer', 15.00, '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', NOW() - INTERVAL '34 days'),
('b4444444-4444-4444-4444-444444444444', 'transfer', 20.00, '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'a2222222-2222-2222-2222-222222222222', NOW() - INTERVAL '33 days');

-- Issues / Sales (3 weeks ago)
INSERT INTO public.stock_movements (item_id, movement_type, quantity, location_id, recorded_by, created_at) VALUES
('b2222222-2222-2222-2222-222222222222', 'issue', 12.00, '22222222-2222-2222-2222-222222222222', 'a3333333-3333-3333-3333-333333333333', NOW() - INTERVAL '21 days'),
('b2222222-2222-2222-2222-222222222222', 'issue', 10.00, '11111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', NOW() - INTERVAL '20 days'),
('b4444444-4444-4444-4444-444444444444', 'issue', 15.00, '44444444-4444-4444-4444-444444444444', 'a2222222-2222-2222-2222-222222222222', NOW() - INTERVAL '18 days'),
('b4444444-4444-4444-4444-444444444444', 'issue', 15.00, '11111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', NOW() - INTERVAL '17 days');

-- Adjustments (1 week ago - damaged goods with mandatory reason)
INSERT INTO public.stock_movements (item_id, movement_type, adjustment_direction, quantity, location_id, reason, recorded_by, created_at) VALUES
('b3333333-3333-3333-3333-333333333333', 'adjustment', 'decrease', 5.00, '11111111-1111-1111-1111-111111111111', 'Damaged in warehouse water leak', 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '7 days');

-- 9. STAFF NOTES
INSERT INTO public.item_notes (item_id, note, author_id, created_at) VALUES
('b2222222-2222-2222-2222-222222222222', 'Supplier notified of surge in demand. Restock expected in 10 business days.', 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '15 days'),
('b4444444-4444-4444-4444-444444444444', 'North Site requested 5 more units for next Monday.', 'a2222222-2222-2222-2222-222222222222', NOW() - INTERVAL '3 days');