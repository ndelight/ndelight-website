import supabaseAdmin from '../_utils/supabaseAdmin.js';
import resend from '../_utils/resend.js';
import crypto from 'crypto';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        // 1. Find User by Email
        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();

        if (error || !profile) {
            return res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
        }

        // 2. Generate Token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 mins

        // 3. Update DB
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
                reset_token_hash: tokenHash,
                reset_token_expires_at: expiresAt
            })
            .eq('id', profile.id);

        if (updateError) throw updateError;

        // 4. Send Email
        const siteUrl = process.env.VITE_APP_URL || 'https://www.ndelight.in'; // Fallback to prod
        const resetLink = `${siteUrl}/reset-password.html?token=${rawToken}&email=${encodeURIComponent(email)}`;

        await resend.emails.send({
            from: 'NDelight <noreply@contact.ndelight.in>',
            to: [email],
            subject: 'Reset Your Password - NDelight',
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2>Reset Password</h2>
                    <p>Click the link below to reset your password. This link expires in 60 minutes.</p>
                    <a href="${resetLink}" style="padding: 10px 20px; background: #ffd700; color: #000; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
                    <p style="margin-top: 20px; color: #666; font-size: 12px;">If you did not request this, please ignore this email.</p>
                </div>
            `
        });

        res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });

    } catch (err) {
        console.error('Forgot Password Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
