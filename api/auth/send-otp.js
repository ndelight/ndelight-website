import supabaseAdmin from '../_utils/supabaseAdmin.js';
import resend from '../_utils/resend.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { user_id, email } = req.body;

        if (!user_id || !email) {
            return res.status(400).json({ error: 'User ID and Email required' });
        }

        // 1. Fetch Profile Limit Counters
        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .select('email_otp_last_sent_at, email_otp_sent_count')
            .eq('id', user_id)
            .single();

        if (error) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        const now = new Date();
        const lastSent = profile.email_otp_last_sent_at ? new Date(profile.email_otp_last_sent_at) : null;

        // 2. Rate Limit: 10s Cooldown
        if (lastSent && (now - lastSent) < 10000) {
            return res.status(429).json({ error: 'Please wait 10s before resending.' });
        }

        // 3. Rate Limit: Daily Limit (100)
        let newCount = (profile.email_otp_sent_count || 0) + 1;
        const lastDate = lastSent ? lastSent.toISOString().split('T')[0] : '';
        const curDate = now.toISOString().split('T')[0];

        if (lastDate !== curDate) {
            newCount = 1;
        }

        if (newCount > 100) {
            return res.status(429).json({ error: 'Daily OTP limit reached.' });
        }

        // 4. Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 mins

        // 5. Update DB
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
                email_otp: otp,
                email_otp_expires_at: expiresAt,
                email_otp_last_sent_at: now,
                email_otp_sent_count: newCount,
                email_otp_attempts: 0
            })
            .eq('id', user_id);

        if (updateError) throw updateError;

        // 6. Send Email
        const { error: emailError } = await resend.emails.send({
            from: 'NDelight <noreply@contact.ndelight.in>',
            to: [email],
            subject: 'Verify your email - NDelight',
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2>Verify your Email</h2>
                    <p>Your verification code is:</p>
                    <h1 style="letter-spacing: 5px; color: #ffd700;">${otp}</h1>
                    <p>This code expires in 10 minutes.</p>
                </div>
            `
        });

        if (emailError) {
            console.error('Resend Error:', emailError);
            return res.status(500).json({ error: 'Failed to send email' });
        }

        res.json({ success: true, message: 'OTP sent' });

    } catch (err) {
        console.error('Server Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
