import supabaseAdmin from '../_utils/supabaseAdmin.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { email, otp } = req.body;

        const { data: verification } = await supabaseAdmin
            .from('email_verifications')
            .select('*')
            .eq('email', email)
            .single();

        if (!verification || verification.otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        if (new Date() > new Date(verification.expires_at)) {
            return res.status(400).json({ error: 'OTP Expired' });
        }

        // Success! Delete OTP
        await supabaseAdmin.from('email_verifications').delete().eq('email', email);

        res.json({ success: true, message: 'Email Verified' });

    } catch (err) {
        res.status(500).json({ error: 'Internal Error' });
    }
}
