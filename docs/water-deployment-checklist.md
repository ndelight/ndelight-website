# Water Feature Deployment Checklist

## API structure

Water APIs are now organized under:

- `api/water/get-products.js`
- `api/water/create-order.js`
- `api/water/_utils/catalog.js`

Compatibility entry points are still available:

- `api/get-water-products.js`
- `api/create-water-razorpay-order.js`

So existing frontend calls keep working.

## Database migrations to run

Run these SQL files in Supabase SQL editor:

1. `db/water_schema.sql`
2. `db/water_products.sql`
3. `db/water_orders_add_razorpay_order_id.sql` (only needed if table already existed before `razorpay_order_id` was added)

## Storage bucket

Ensure bucket exists:

- `water-designs` (public)

Policies must allow:

- `SELECT` public
- `INSERT/UPDATE/DELETE` for authenticated users

## Env vars for deployment

Required for water payment flow:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Webhook parity

`api/razorpay-webhook.js` updates both:

- `bookings.status = 'paid'`
- `water_orders.payment_status = 'paid'`

Make sure Razorpay webhook endpoint points to:

- `/api/razorpay-webhook`

