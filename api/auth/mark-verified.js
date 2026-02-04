import supabaseAdmin from '../_utils/supabaseAdmin.js';
import { createClient } from '@supabase/supabase-js';

// Need Anon Client to verify token
const supabaseAnon = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { user_id } = req.body;
        const authHeader = req.headers.authorization;

        if (!user_id || !authHeader) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.split(' ')[1];

        // Verify Token
        const { data: { user }, error } = await supabaseAnon.auth.getUser(token);

        if (error || !user || user.id !== user_id) {
            return res.status(401).json({ error: 'Invalid Token' });
        }

        // Update Profile (Service Role)
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ email_verified: true })
            .eq('id', user_id);

        if (updateError) throw updateError;

        res.json({ success: true, message: 'Verified' });

    } catch (err) {
        console.error('Mark Verified Error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
}
