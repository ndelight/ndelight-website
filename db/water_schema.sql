-- Schema for NDelight Water feature

-- 1) Orders table
CREATE TABLE IF NOT EXISTS water_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    quantity_text TEXT NOT NULL,
    full_address TEXT NOT NULL,

    design_url TEXT,
    razorpay_order_id TEXT,

    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed', 'cancelled')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'not_required')),

    notes TEXT
);

ALTER TABLE water_orders ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anon or authenticated) to place an order
CREATE POLICY "Anyone can insert water orders (pending only)"
ON water_orders FOR INSERT
TO anon, authenticated
WITH CHECK (
    payment_status = 'pending'
    AND razorpay_order_id IS NULL
);

-- Allow admins to view and manage all water orders
CREATE POLICY "Admins can manage water orders"
ON water_orders FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
    )
);


-- 2) Config table for homepage water cards
CREATE TABLE IF NOT EXISTS water_showcase (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    title TEXT NOT NULL,
    subtitle TEXT,
    tag TEXT,
    image_url TEXT,

    display_order INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE water_showcase ENABLE ROW LEVEL SECURITY;

-- Public (anon + authenticated) can read active items to render the /water page
CREATE POLICY "Public can view active water showcase"
ON water_showcase FOR SELECT
TO anon, authenticated
USING (is_active = TRUE);

-- Admins can manage showcase entries
CREATE POLICY "Admins can manage water showcase"
ON water_showcase FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
    )
);

