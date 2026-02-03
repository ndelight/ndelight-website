import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' })
    }

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET
    const signature = req.headers['x-razorpay-signature']

    if (!secret) {
        console.error('RAZORPAY_WEBHOOK_SECRET is not set in environment variables.')
        return res.status(500).json({ message: 'Server Configuration Error' })
    }

    if (!signature) {
        return res.status(400).json({ message: 'Missing Signature' })
    }

    // Verify Signature
    const shasum = crypto.createHmac('sha256', secret)
    shasum.update(JSON.stringify(req.body))
    const digest = shasum.digest('hex')

    if (digest !== signature) {
        return res.status(400).json({ status: 'failure', message: 'Invalid Signature' })
    }

    const event = req.body

    // Handle 'order.paid' event
    if (event.event === 'order.paid') {
        const order = event.payload.order.entity
        const payment = event.payload.payment.entity // Grab payment details
        const order_id = order.id
        const payment_id = payment.id

        console.log(`Processing order.paid for ${order_id}`)

        // Initialize Supabase
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        )

        // 1. Update Booking Status
        const { data: booking, error } = await supabase
            .from('bookings')
            .update({
                status: 'paid',
                // store payment_id if you have a column for it, otherwise just status
            })
            .eq('razorpay_order_id', order_id)
            .select('*, events(title)') // Fetch event details for email
            .single()

        if (error) {
            console.error('Supabase Update Error:', error)
            return res.status(500).json({ message: 'Database update failed' })
        }

        // 2. Send Email via Resend
        if (process.env.RESEND_API_KEY && booking) {
            try {
                const { Resend } = await import('resend');
                const resend = new Resend(process.env.RESEND_API_KEY);

                const eventName = booking.events ? booking.events.title : 'Event';
                const customerName = booking.customer_name || 'Guest';
                const customerEmail = booking.customer_email;

                if (customerEmail) {
                    await resend.emails.send({
                        from: 'NDelight <onboarding@resend.dev>', // Update this with verified domain later
                        to: customerEmail,
                        subject: `Booking Confirmed: ${eventName}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                                <h2 style="color: #184E4A;">Booking Confirmed! ✅</h2>
                                <p>Hi <strong>${customerName}</strong>,</p>
                                <p>Your payment was successful (ID: <strong>${payment_id}</strong>).</p>
                                <p>Your booking for <strong>${eventName}</strong> (1 ticket) is officially <strong>CONFIRMED</strong>.</p>
                                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                                <p style="color: #666;">See you there!</p>
                                <p style="font-weight: bold; color: #184E4A;">Team N DELIGHT</p>
                            </div>
                        `
                    });
                    console.log(`Email sent to ${customerEmail}`);
                }
            } catch (emailErr) {
                console.error('Email sending failed:', emailErr);
                // Don't fail the webhook just because email failed
            }
        } else {
             console.log('Skipping email: No RESEND_API_KEY or Booking not found.');
        }
    }

    res.json({ status: 'ok' })
}
