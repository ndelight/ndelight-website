import supabaseAdmin from './_utils/supabaseAdmin.js';
import resend from './_utils/resend.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { booking_id } = req.body;
        if (!booking_id) return res.status(400).json({ error: 'Booking ID required' });

        // 1. Fetch Booking
        const { data: booking, error } = await supabaseAdmin
            .from('bookings')
            .select('*, events(*)')
            .eq('id', booking_id)
            .single();

        if (error || !booking) return res.status(404).json({ error: 'Booking not found' });

        // 2. Idempotency Check
        if (booking.email_sent_at) {
            return res.json({ success: true, message: 'Email already sent' });
        }

        if (booking.status !== 'paid') {
            return res.status(400).json({ error: 'Booking not paid yet' });
        }

        // 3. Send Email
        await resend.emails.send({
            from: 'NDelight Tickets <tickets@contact.ndelight.in>',
            to: [booking.customer_email],
            subject: `Your Ticket for ${booking.events.title}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; max-width: 600px; margin: 0 auto;">
                    <div style="background: #000; color: #ffd700; padding: 20px; text-align: center;">
                        <h1>Your Ticket is Here! 🎟️</h1>
                    </div>
                    <div style="padding: 20px;">
                        <p>Hi ${booking.customer_name},</p>
                        <p>You are all set for <strong>${booking.events.title}</strong>.</p>
                        
                        <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #ffd700; margin: 20px 0;">
                            <p><strong>Date:</strong> ${new Date(booking.events.date).toDateString()}</p>
                            <p><strong>Location:</strong> ${booking.events.location}</p>
                            <p><strong>Booking ID:</strong> #${booking.id}</p>
                            <p><strong>Amount Paid:</strong> ₹${booking.amount}</p>
                        </div>
                        <p>Please show this email at the entry.</p>
                    </div>
                </div>
            `
        });

        // 4. Update Idempotency
        await supabaseAdmin
            .from('bookings')
            .update({ email_sent_at: new Date() })
            .eq('id', booking_id);

        res.json({ success: true, message: 'Booking email sent' });

    } catch (err) {
        console.error('Booking Email Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
