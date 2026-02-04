import Razorpay from 'razorpay'
import supabaseAdmin from './_utils/supabaseAdmin.js'
// Note: We can use supabaseAdmin to fetch events too.

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

        // 2. Fetch Event Price & Details
        const { data: event, error } = await supabaseAdmin
            .from('events')
            .select('*')
            .eq('id', event_id)
            .single()

        if (error || !event) {
            return res.status(400).json({ message: 'Invalid Event' })
        }

        // 3. Validate Influencer Code & Get Discount
        let discountPercent = 0;
        if (influencer_code) {
            const { data: infData, error: infError } = await supabaseAdmin
                .from('influencers')
                .select('active, discount_percent')
                .eq('code', influencer_code)
                .single();

            if (infData && infData.active) {
                discountPercent = infData.discount_percent || 0;
            }
        }

        // 4. Calculate Amount on Server (Secure)
        let finalPrice = event.price;
        if (discountPercent > 0) {
            const discountAmount = Math.round(event.price * (discountPercent / 100));
            finalPrice = event.price - discountAmount;
        }

        const amountInPaise = Math.round(finalPrice * 100);

        const options = {
            amount: amountInPaise,
            currency: "INR",
            receipt: `rcpt_${Date.now().toString().slice(-10)}`,
            notes: {
                event_id: event_id,
                influencer_code: influencer_code || 'organic',
                discount_applied: discountPercent + '%'
            }
        }

        const order = await razorpay.orders.create(options)

        // 5. Create Pending Booking with actual final price
        const { data: booking, error: bookingError } = await supabaseAdmin
            .from('bookings')
            .insert({
                event_id: event_id,
                customer_name: customer_info.name,
                customer_email: customer_info.email,
                customer_phone: customer_info.phone,
                amount: finalPrice, // Store discounted price
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
