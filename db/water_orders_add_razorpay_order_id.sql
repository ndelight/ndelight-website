ALTER TABLE water_orders
ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;

CREATE INDEX IF NOT EXISTS idx_water_orders_razorpay_order_id
ON water_orders (razorpay_order_id);

