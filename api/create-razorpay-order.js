import Razorpay from 'razorpay'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' })
    }

    try {
        const { event_id, influencer_code, customer_info } = req.body

        if (!event_id || !customer_info) {
            return res.status(400).json({ message: 'Missing required fields' })
        }

        // 1. Initialize Razorpay
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        })

        // 2. Initialize Supabase
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.VITE_SUPABASE_ANON_KEY
        )

        // 3. Fetch Event Price & Details
        const { data: event, error } = await supabase
            .from('events')
            .select('*')
            .eq('id', event_id)
            .single()

        if (error || !event) {
            return res.status(400).json({ message: 'Invalid Event' })
        }

        // 4. Create Razorpay Order
        // Amount must be in subunits (paise)
        const amountInPaise = Math.round(event.price * 100)

        const options = {
            amount: amountInPaise,
            currency: "INR",
            receipt: `rcpt_${Date.now().toString().slice(-10)}`,
            notes: {
                event_id: event_id,
                influencer_code: influencer_code || 'organic'
            }
        }

        const order = await razorpay.orders.create(options)

        // 5. Create 'Pending' Booking in Supabase
        // This ensures we have a record even if they drop off, and links the order_id.
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .insert({
                event_id: event_id,
                customer_name: customer_info.name,
                customer_email: customer_info.email,
                customer_phone: customer_info.phone,
                amount: event.price,
                status: 'pending',
                razorpay_order_id: order.id,
                influencer_code: influencer_code || null
            })
            .select()
            .single()

        if (bookingError) {
            console.error('Booking Creation Error:', bookingError)
            return res.status(500).json({ message: 'Failed to reserve booking' })
        }

        // 6. Return Order Details to Frontend
        res.status(200).json({
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            key_id: process.env.RAZORPAY_KEY_ID, // Safe to send public key
            booking_id: booking.id,
            prefill: {
                name: customer_info.name,
                email: customer_info.email,
                contact: customer_info.phone
            }
        })

    } catch (err) {
        console.error('API Error:', err)
        res.status(500).json({ message: err.message })
    }
}
