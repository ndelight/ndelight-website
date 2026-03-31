-- Water products catalog with editable pricing
CREATE TABLE IF NOT EXISTS water_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    size_ml INT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 1
);

ALTER TABLE water_products ENABLE ROW LEVEL SECURITY;

-- Public can view active products (for storefront)
CREATE POLICY "Public can view active water products"
ON water_products FOR SELECT
TO anon, authenticated
USING (is_active = TRUE);

-- Admins can fully manage
CREATE POLICY "Admins can manage water products"
ON water_products FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
    )
);

-- Seed defaults (safe to re-run)
INSERT INTO water_products (size_ml, title, unit_price, image_url, is_active, display_order)
VALUES
    (250, 'NDelight Water 250ml', 8, 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=600&q=80', TRUE, 1),
    (500, 'NDelight Water 500ml', 12, 'https://images.unsplash.com/photo-1606168094336-48f6f7aa8f3a?auto=format&fit=crop&w=600&q=80', TRUE, 2),
    (1000, 'NDelight Water 1000ml', 18, 'https://images.unsplash.com/photo-1616118132534-381148898bb4?auto=format&fit=crop&w=600&q=80', TRUE, 3)
ON CONFLICT (size_ml) DO UPDATE
SET
    title = EXCLUDED.title,
    unit_price = EXCLUDED.unit_price,
    image_url = EXCLUDED.image_url,
    is_active = EXCLUDED.is_active,
    display_order = EXCLUDED.display_order;

