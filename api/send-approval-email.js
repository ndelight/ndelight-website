import supabaseAdmin from './_utils/supabaseAdmin.js';
import resend from './_utils/resend.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { influencer_id } = req.body;
        if (!influencer_id) return res.status(400).json({ error: 'Influencer ID required' });

        const { data: influencer, error } = await supabaseAdmin
            .from('influencers')
            .select('*, profiles(email, full_name)')
            .eq('id', influencer_id)
            .single();

        if (error || !influencer) return res.status(404).json({ error: 'Influencer not found' });

        if (!influencer.active) {
            return res.status(400).json({ error: 'Influencer not active' });
        }

        const email = influencer.profiles?.email;
        if (!email) return res.status(400).json({ error: 'Influencer email not found' });

        await resend.emails.send({
            from: 'NDelight Admin <admin@contact.ndelight.in>',
            to: [email],
            subject: 'You are Approved! 🌟',
            html: `
                <div style="font-family: sans-serif; padding: 20px; text-align: center;">
                    <h1>Welcome to the Club! 🚀</h1>
                    <p>Hi ${influencer.profiles.full_name},</p>
                    <p>Your influencer application for <strong>NDelight</strong> has been approved.</p>
                    <p>Your Request Code: <strong>${influencer.code}</strong></p>
                    <p>You can now log in to your dashboard to track earnings and bookings.</p>
                    <a href="${process.env.VITE_APP_URL || 'https://www.ndelight.in'}/login.html" style="display:inline-block; padding: 10px 20px; background: #ffd700; color: #000; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px;">Go to Dashboard</a>
                </div>
            `
        });

        res.json({ success: true, message: 'Approval email sent' });

    } catch (err) {
        console.error('Approval Email Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
