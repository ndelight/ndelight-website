# 🔑 Production Environment Variables Guide

Copy these values into your **Vercel Project Settings** -> **Environment Variables**.

---

### 1. Supabase (Database)
*Where to find: Supabase Dashboard -> Project Settings -> API*

| Variable Name | Value Description |
| :--- | :--- |
| `VITE_SUPABASE_URL` | Your Project URL (e.g., `https://xyz.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | The `anon` public key (long string) |
| `SUPABASE_SERVICE_ROLE_KEY` | The `service_role` **secret** key (KEEP SAFE!) |

> **Note:** The `SERVICE_ROLE_KEY` is required for the Webhook to update booking statuses securely.

---

### 2. Razorpay (Payments)
*Where to find: Razorpay Dashboard -> Settings -> API Keys*

| Variable Name | Value Description |
| :--- | :--- |
| `RAZORPAY_KEY_ID` | Starts with `rzp_test_...` or `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | The secret string shown ONLY when you generate the key. |
| `RAZORPAY_WEBHOOK_SECRET` | The secret you typed when setting up the Webhook URL in Razorpay. |

> **Important:**
> *   If testing on Vercel dev URL, use **Test Mode** keys.
> *   If going live (Real Money), enable **Live Mode** in Razorpay and use Live keys.

---

### 3. Vercel System
*(Usually set automatically, but good to check)*

*   Ensure **Node.js Version** is set to 18.x or 20.x in General Settings.
