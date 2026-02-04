import crypto from 'crypto'
import supabaseAdmin from './_utils/supabaseAdmin.js'
import resend from './_utils/resend.js'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' })
    }

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET
    const signature = req.headers['x-razorpay-signature']

    if (!secret) {
        console.error('RAZORPAY_WEBHOOK_SECRET is not set.')
        return res.status(500).json({ message: 'Server Config Error' })
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
        const order_id = order.id

        console.log(`Processing order.paid for ${order_id}`)

        // 1. Update Booking Status (Use Admin to bypass RLS)
        const { data: booking, error } = await supabaseAdmin
            .from('bookings')
            .update({ status: 'paid' })
            .eq('razorpay_order_id', order_id)
            .select('*, events(title)')
            .single()

        if (error) {
            console.error('Supabase Update Error:', error)
            return res.status(500).json({ message: 'Database update failed' })
        }

        // 2. Send Email via Resend
        if (booking) {
            try {
                const eventName = booking.events ? booking.events.title : 'Event';
                const customerName = booking.customer_name || 'Guest';
                const customerEmail = booking.customer_email;

                if (customerEmail) {
                    await resend.emails.send({
                        from: 'NDelight Tickets <tickets@contact.ndelight.in>',
                        to: customerEmail,
                        subject: `Your Ticket for ${eventName}`,
                        html: `
                            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; max-width: 600px; margin: 0 auto;">
                                <div style="background: #000; color: #ffd700; padding: 20px; text-align: center;">
                                    <h1>Your Ticket is Here! 🎟️</h1>
                                </div>
                                <div style="padding: 20px;">
                                    <p>Hi ${customerName},</p>
                                    <p>You are all set for <strong>${eventName}</strong>.</p>
                                    
                                    <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #ffd700; margin: 20px 0;">
                                        <p><strong>Date:</strong> ${booking.events && booking.events.date ? new Date(booking.events.date).toDateString() : 'TBA'}</p>
                                        <p><strong>Location:</strong> ${booking.events && booking.events.location ? booking.events.location : 'Venue details coming soon'}</p>
                                        <p><strong>Booking ID:</strong> #${booking.id}</p>
                                    </div>
            
                                    <p>Please show this email at the entry.</p>
                                </div>
                            </div>
                        `
                    });
                    console.log(`Email sent to ${customerEmail}`);
                }
            } catch (emailErr) {
                console.error('Email sending failed:', emailErr);
            }
        }
    }

    res.json({ status: 'ok' })
}
