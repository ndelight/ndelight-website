import supabaseAdmin from '../_utils/supabaseAdmin.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { user_id, otp } = req.body;

        if (!user_id || !otp) {
            return res.status(400).json({ error: 'User ID and OTP required' });
        }

        // 1. Fetch OTP from Profile
        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .select('email_otp, email_otp_expires_at, email_otp_attempts')
            .eq('id', user_id)
            .single();

        if (error || !profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        // 2. Validate
        if (profile.email_otp !== otp) {
            // Optional: Increment attempts
            await supabaseAdmin.from('profiles').update({
                email_otp_attempts: (profile.email_otp_attempts || 0) + 1
            }).eq('id', user_id);

            return res.status(400).json({ error: 'Invalid OTP' });
        }

        if (new Date() > new Date(profile.email_otp_expires_at)) {
            return res.status(400).json({ error: 'OTP Expired' });
        }

        // 3. Success: Mark Verified & Clear OTP
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
                email_verified: true,
                email_otp: null,
                email_otp_expires_at: null,
                email_otp_attempts: 0
            })
            .eq('id', user_id);

        if (updateError) throw updateError;

        res.json({ success: true, message: 'Email Verified Successfully' });

    } catch (err) {
        console.error('Verify OTP Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
