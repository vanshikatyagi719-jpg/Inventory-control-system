-- ==============================================================================
-- INVENTORY & STOCK CONTROL SYSTEM - SUPABASE POSTGRESQL SCHEMA
-- Migration: 01_initial_schema.sql
-- ==============================================================================

-- 1. EXTENSIONS & PREREQUISITES
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CUSTOM ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('manager', 'staff');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE movement_type_enum AS ENUM ('receipt', 'issue', 'transfer', 'adjustment');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE adjustment_direction_enum AS ENUM ('increase', 'decrease');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 3. PROFILES & ROLE-BASED ACCESS CONTROL
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'staff',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. LOCATIONS & STAFF ASSIGNMENTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.location_assignments (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, location_id)
);

-- ------------------------------------------------------------------------------
-- 5. CATEGORIES & ITEMS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    unit_of_measure TEXT NOT NULL DEFAULT 'units',
    reorder_level NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_sku ON public.items(sku);
CREATE INDEX IF NOT EXISTS idx_items_name ON public.items(name);
CREATE INDEX IF NOT EXISTS idx_items_category_id ON public.items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_is_archived ON public.items(is_archived);

-- ------------------------------------------------------------------------------
-- 6. APPEND-ONLY STOCK LEDGER (stock_movements)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
    movement_type movement_type_enum NOT NULL,
    adjustment_direction adjustment_direction_enum,
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
    destination_location_id UUID REFERENCES public.locations(id) ON DELETE RESTRICT,
    reason TEXT,
    recorded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Invariants:
    -- Transfer requires destination distinct from source
    CONSTRAINT chk_transfer_locations CHECK (
        (movement_type = 'transfer' AND destination_location_id IS NOT NULL AND location_id <> destination_location_id) OR
        (movement_type <> 'transfer' AND destination_location_id IS NULL)
    ),
    -- Adjustment requires direction and non-empty reason
    CONSTRAINT chk_adjustment_fields CHECK (
        (movement_type = 'adjustment' AND adjustment_direction IS NOT NULL AND reason IS NOT NULL AND length(trim(reason)) > 0) OR
        (movement_type <> 'adjustment' AND adjustment_direction IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id ON public.stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_location_id ON public.stock_movements(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_dest_loc ON public.stock_movements(destination_location_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at);

-- ------------------------------------------------------------------------------
-- 7. IMMUTABILITY TRIGGER (Blocks UPDATE and DELETE on Ledger)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_immutable_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'This table is append-only and strictly immutable. UPDATE and DELETE operations are forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stock_movements_immutable ON public.stock_movements;
CREATE TRIGGER trg_stock_movements_immutable
BEFORE UPDATE OR DELETE ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.prevent_immutable_mutation();

-- ------------------------------------------------------------------------------
-- 8. AUDIT LOGS & STAFF NOTES (Append-Only)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.item_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_item_audit_logs_item ON public.item_audit_logs(item_id);
CREATE INDEX IF NOT EXISTS idx_item_audit_logs_created_at ON public.item_audit_logs(created_at);

DROP TRIGGER IF EXISTS trg_item_audit_immutable ON public.item_audit_logs;
CREATE TRIGGER trg_item_audit_immutable
BEFORE UPDATE OR DELETE ON public.item_audit_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_immutable_mutation();

CREATE TABLE IF NOT EXISTS public.item_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_item_notes_item ON public.item_notes(item_id);
CREATE INDEX IF NOT EXISTS idx_item_notes_created_at ON public.item_notes(created_at);

DROP TRIGGER IF EXISTS trg_item_notes_immutable ON public.item_notes;
CREATE TRIGGER trg_item_notes_immutable
BEFORE UPDATE OR DELETE ON public.item_notes
FOR EACH ROW EXECUTE FUNCTION public.prevent_immutable_mutation();

-- ------------------------------------------------------------------------------
-- 9. AUTOMATIC AUDIT LOGGING TRIGGER ON ITEMS TABLE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_item_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    BEGIN
        v_user_id := NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.item_audit_logs (item_id, field_name, old_value, new_value, changed_by)
        VALUES (NEW.id, 'item_created', NULL, NEW.name, v_user_id);
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.name <> NEW.name THEN
            INSERT INTO public.item_audit_logs (item_id, field_name, old_value, new_value, changed_by)
            VALUES (NEW.id, 'name', OLD.name, NEW.name, v_user_id);
        END IF;
        IF OLD.sku <> NEW.sku THEN
            INSERT INTO public.item_audit_logs (item_id, field_name, old_value, new_value, changed_by)
            VALUES (NEW.id, 'sku', OLD.sku, NEW.sku, v_user_id);
        END IF;
        IF OLD.description IS DISTINCT FROM NEW.description THEN
            INSERT INTO public.item_audit_logs (item_id, field_name, old_value, new_value, changed_by)
            VALUES (NEW.id, 'description', OLD.description, NEW.description, v_user_id);
        END IF;
        IF OLD.category_id <> NEW.category_id THEN
            INSERT INTO public.item_audit_logs (item_id, field_name, old_value, new_value, changed_by)
            VALUES (NEW.id, 'category_id', OLD.category_id::TEXT, NEW.category_id::TEXT, v_user_id);
        END IF;
        IF OLD.reorder_level <> NEW.reorder_level THEN
            INSERT INTO public.item_audit_logs (item_id, field_name, old_value, new_value, changed_by)
            VALUES (NEW.id, 'reorder_level', OLD.reorder_level::TEXT, NEW.reorder_level::TEXT, v_user_id);
        END IF;
        IF OLD.unit_of_measure <> NEW.unit_of_measure THEN
            INSERT INTO public.item_audit_logs (item_id, field_name, old_value, new_value, changed_by)
            VALUES (NEW.id, 'unit_of_measure', OLD.unit_of_measure, NEW.unit_of_measure, v_user_id);
        END IF;
        IF OLD.is_archived <> NEW.is_archived THEN
            INSERT INTO public.item_audit_logs (item_id, field_name, old_value, new_value, changed_by)
            VALUES (NEW.id, 'is_archived', OLD.is_archived::TEXT, NEW.is_archived::TEXT, v_user_id);
        END IF;
        
        NEW.updated_at := NOW();
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_items_audit ON public.items;
CREATE TRIGGER trg_items_audit
AFTER INSERT OR UPDATE ON public.items
FOR EACH ROW EXECUTE FUNCTION public.audit_item_changes();

-- ------------------------------------------------------------------------------
-- 10. LOW-STOCK ALERT DISMISSALS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alert_dismissals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    dismissed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    stock_at_dismissal NUMERIC(12, 2) NOT NULL,
    dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_dismissals_item ON public.alert_dismissals(item_id);

-- ------------------------------------------------------------------------------
-- 11. DYNAMIC STOCK BALANCE VIEWS
-- ------------------------------------------------------------------------------

-- View 1: Stock On-Hand by Item and Location
CREATE OR REPLACE VIEW public.v_item_stock_by_location AS
WITH movement_deltas AS (
    -- Receipts: add stock
    SELECT item_id, location_id, quantity AS delta
    FROM public.stock_movements
    WHERE movement_type = 'receipt'
    
    UNION ALL
    
    -- Issues: deduct stock
    SELECT item_id, location_id, -quantity AS delta
    FROM public.stock_movements
    WHERE movement_type = 'issue'
    
    UNION ALL
    
    -- Adjustments: increase or decrease
    SELECT item_id, location_id,
           CASE WHEN adjustment_direction = 'decrease' THEN -quantity ELSE quantity END AS delta
    FROM public.stock_movements
    WHERE movement_type = 'adjustment'
    
    UNION ALL
    
    -- Transfers: Outflow from source
    SELECT item_id, location_id, -quantity AS delta
    FROM public.stock_movements
    WHERE movement_type = 'transfer'
    
    UNION ALL
    
    -- Transfers: Inflow to destination
    SELECT item_id, destination_location_id AS location_id, quantity AS delta
    FROM public.stock_movements
    WHERE movement_type = 'transfer'
)
SELECT 
    i.id AS item_id,
    l.id AS location_id,
    l.name AS location_name,
    l.code AS location_code,
    COALESCE(SUM(md.delta), 0) AS on_hand_quantity
FROM public.items i
CROSS JOIN public.locations l
LEFT JOIN movement_deltas md ON md.item_id = i.id AND md.location_id = l.id
GROUP BY i.id, l.id, l.name, l.code;

-- View 2: Global Stock Position per Item
CREATE OR REPLACE VIEW public.v_item_global_stock AS
SELECT 
    i.id AS item_id,
    i.sku,
    i.name,
    i.description,
    i.category_id,
    c.name AS category_name,
    i.unit_of_measure,
    i.reorder_level,
    i.is_archived,
    COALESCE(SUM(sbl.on_hand_quantity), 0) AS total_on_hand,
    CASE 
        WHEN COALESCE(SUM(sbl.on_hand_quantity), 0) <= i.reorder_level THEN TRUE 
        ELSE FALSE 
    END AS is_low_stock
FROM public.items i
JOIN public.categories c ON c.id = i.category_id
LEFT JOIN public.v_item_stock_by_location sbl ON sbl.item_id = i.id
GROUP BY i.id, i.sku, i.name, i.description, i.category_id, c.name, i.unit_of_measure, i.reorder_level, i.is_archived;

-- View 3: Active Low-Stock Alerts (Cycle-Aware Dismissal)
CREATE OR REPLACE VIEW public.v_active_low_stock_alerts AS
WITH latest_dismissal AS (
    SELECT DISTINCT ON (item_id)
        item_id,
        dismissed_by,
        dismissed_at,
        stock_at_dismissal
    FROM public.alert_dismissals
    ORDER BY item_id, dismissed_at DESC
),
item_movements_since_dismissal AS (
    SELECT 
        sm.item_id,
        MAX(sm.created_at) AS last_movement_after_dismissal
    FROM public.stock_movements sm
    JOIN latest_dismissal ld ON ld.item_id = sm.item_id
    WHERE sm.created_at > ld.dismissed_at
    GROUP BY sm.item_id
)
SELECT 
    g.item_id,
    g.sku,
    g.name,
    g.category_name,
    g.unit_of_measure,
    g.reorder_level,
    g.total_on_hand,
    ld.dismissed_at,
    CASE 
        WHEN ld.dismissed_at IS NULL THEN FALSE
        WHEN ld.dismissed_at IS NOT NULL AND msd.last_movement_after_dismissal IS NULL THEN TRUE
        ELSE FALSE
    END AS is_dismissed
FROM public.v_item_global_stock g
LEFT JOIN latest_dismissal ld ON ld.item_id = g.item_id
LEFT JOIN item_movements_since_dismissal msd ON msd.item_id = g.item_id
WHERE g.is_low_stock = TRUE AND g.is_archived = FALSE;

-- ------------------------------------------------------------------------------
-- 12. CONCURRENCY-SAFE STORED PROCEDURES (RPC)
-- ------------------------------------------------------------------------------

-- Procedure 1: Atomic Movement Recorder with Pessimistic Row Locking
CREATE OR REPLACE FUNCTION public.record_stock_movement(
    p_item_id UUID,
    p_movement_type movement_type_enum,
    p_quantity NUMERIC,
    p_location_id UUID,
    p_destination_location_id UUID DEFAULT NULL,
    p_adjustment_direction adjustment_direction_enum DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_is_archived BOOLEAN;
    v_current_source_stock NUMERIC;
    v_new_movement_id UUID;
BEGIN
    -- 1. Pessimistic Row Lock on Item to prevent concurrent race conditions
    SELECT is_archived INTO v_is_archived
    FROM public.items
    WHERE id = p_item_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item with ID % does not exist.', p_item_id;
    END IF;

    -- 2. Reject movements on archived items
    IF v_is_archived THEN
        RAISE EXCEPTION 'Cannot record movements against archived item.';
    END IF;

    -- 3. Quantity check
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Movement quantity must be strictly greater than zero.';
    END IF;

    -- 4. Prevent negative inventory on outflows
    IF (p_movement_type IN ('issue', 'transfer')) OR 
       (p_movement_type = 'adjustment' AND p_adjustment_direction = 'decrease') THEN
        
        SELECT COALESCE(SUM(
            CASE 
                WHEN movement_type = 'receipt' AND location_id = p_location_id THEN quantity
                WHEN movement_type = 'issue' AND location_id = p_location_id THEN -quantity
                WHEN movement_type = 'transfer' AND location_id = p_location_id THEN -quantity
                WHEN movement_type = 'transfer' AND destination_location_id = p_location_id THEN quantity
                WHEN movement_type = 'adjustment' AND location_id = p_location_id THEN 
                    CASE WHEN adjustment_direction = 'decrease' THEN -quantity ELSE quantity END
                ELSE 0 
            END
        ), 0) INTO v_current_source_stock
        FROM public.stock_movements
        WHERE item_id = p_item_id;

        IF v_current_source_stock < p_quantity THEN
            RAISE EXCEPTION 'Insufficient stock. Location on-hand is %, requested deduction is %.', 
                v_current_source_stock, p_quantity;
        END IF;
    END IF;

    -- 5. Insert immutable movement
    INSERT INTO public.stock_movements (
        item_id,
        movement_type,
        adjustment_direction,
        quantity,
        location_id,
        destination_location_id,
        reason,
        recorded_by
    ) VALUES (
        p_item_id,
        p_movement_type,
        p_adjustment_direction,
        p_quantity,
        p_location_id,
        p_destination_location_id,
        p_reason,
        p_user_id
    ) RETURNING id INTO v_new_movement_id;

    RETURN v_new_movement_id;
END;
$$ LANGUAGE plpgsql;

-- Procedure 2: Dismiss Low-Stock Alert
CREATE OR REPLACE FUNCTION public.dismiss_low_stock_alert(
    p_item_id UUID,
    p_user_id UUID
) RETURNS UUID AS $$
DECLARE
    v_total_stock NUMERIC;
    v_dismissal_id UUID;
BEGIN
    SELECT total_on_hand INTO v_total_stock
    FROM public.v_item_global_stock
    WHERE item_id = p_item_id;

    IF v_total_stock IS NULL THEN
        RAISE EXCEPTION 'Item not found.';
    END IF;

    INSERT INTO public.alert_dismissals (
        item_id,
        dismissed_by,
        stock_at_dismissal,
        dismissed_at
    ) VALUES (
        p_item_id,
        p_user_id,
        v_total_stock,
        NOW()
    ) RETURNING id INTO v_dismissal_id;

    RETURN v_dismissal_id;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 13. AUTH HOOK TRIGGER (Sync auth.users -> public.profiles)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'staff'::user_role)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_dismissals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "Profiles viewable by authenticated" ON public.profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Profiles updatable by managers or self" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id OR public.auth_user_role() = 'manager');

CREATE POLICY "Locations viewable by authenticated" ON public.locations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Locations manageable by managers" ON public.locations
    FOR ALL TO authenticated USING (public.auth_user_role() = 'manager');

CREATE POLICY "Assignments viewable by authenticated" ON public.location_assignments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Assignments manageable by managers" ON public.location_assignments
    FOR ALL TO authenticated USING (public.auth_user_role() = 'manager');

CREATE POLICY "Categories viewable by authenticated" ON public.categories
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Categories manageable by managers" ON public.categories
    FOR ALL TO authenticated USING (public.auth_user_role() = 'manager');

CREATE POLICY "Items viewable by authenticated" ON public.items
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Items manageable by managers" ON public.items
    FOR ALL TO authenticated USING (public.auth_user_role() = 'manager');

CREATE POLICY "Stock movements viewable by authenticated" ON public.stock_movements
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Stock movements insertable by authenticated" ON public.stock_movements
    FOR INSERT TO authenticated WITH CHECK (
        public.auth_user_role() = 'manager' OR 
        EXISTS (
            SELECT 1 FROM public.location_assignments 
            WHERE user_id = auth.uid() AND location_id = stock_movements.location_id
        )
    );

CREATE POLICY "Audit logs viewable by authenticated" ON public.item_audit_logs
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Notes viewable by authenticated" ON public.item_notes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Notes insertable by authenticated" ON public.item_notes
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Alert dismissals viewable by authenticated" ON public.alert_dismissals
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Alert dismissals manageable by managers" ON public.alert_dismissals
    FOR INSERT TO authenticated WITH CHECK (public.auth_user_role() = 'manager');