import supabaseAdmin from '../_utils/supabaseAdmin.js';
import crypto from 'crypto';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { token, newPassword, email } = req.body;
        if (!token || !newPassword || !email) return res.status(400).json({ error: 'Missing required fields' });

        // 1. Hash Token
        const tokenHashReceived = crypto.createHash('sha256').update(token).digest('hex');

        // 2. Fetch Profile
        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .select('id, reset_token_hash, reset_token_expires_at')
            .eq('email', email)
            .single();

        if (error || !profile) return res.status(400).json({ error: 'Invalid request' });

        // 3. Verify Token
        if (!profile.reset_token_hash || profile.reset_token_hash !== tokenHashReceived) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        if (new Date() > new Date(profile.reset_token_expires_at)) {
            return res.status(400).json({ error: 'Token expired' });
        }

        // 4. Update Password
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
            profile.id,
            { password: newPassword }
        );

        if (authError) throw authError;

        // 5. Invalidate Token
        await supabaseAdmin
            .from('profiles')
            .update({
                reset_token_hash: null,
                reset_token_expires_at: null
            })
            .eq('id', profile.id);

        res.json({ success: true, message: 'Password updated successfully' });

    } catch (err) {
        console.error('Reset Password Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
