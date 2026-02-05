import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Initialize clients strictly inside safe scope or with checks?
// Top level initialization is standard for lambdas (warm start cache).
// But we'll add checks to ensure we don't crash silently.

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const resendKey = process.env.RESEND_API_KEY;

// Create clients safely
const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

const resend = resendKey ? new Resend(resendKey) : null;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // DEBUG: Check Environment
    if (!supabaseAdmin || !resend) {
        console.error('SERVER CONFIG ERROR: Missing Environment Variables');
        console.error('VITE_SUPABASE_URL:', !!supabaseUrl);
        console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
        console.error('RESEND_API_KEY:', !!resendKey);
        return res.status(500).json({
            error: 'Server Configuration Error (Missing Keys)',
            debug: {
                hasSupabaseUrl: !!supabaseUrl,
                hasServiceKey: !!supabaseServiceKey,
                hasResendKey: !!resendKey
            }
        });
    }

    try {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // 1. Save to Database (Backup)
        const { error: dbError } = await supabaseAdmin
            .from('contact_messages')
            .insert([{ name, email, message }]);

        if (dbError) {
            console.error('DB Insert Error:', dbError);
        }

        // 2. Send Email via Resend
        const { data, error: emailError } = await resend.emails.send({
            from: 'NDelight Contact <onboarding@resend.dev>', // Use verified domain if available
            to: ['ndelight.co@gmail.com'],
            subject: `New Inquiry from ${name}`,
            html: `
                <h2>New Website Inquiry</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <div style="background:#f9f9f9; padding:15px; border-left:4px solid #ffd700;">
                    <p style="white-space: pre-wrap;">${message}</p>
                </div>
            `
        });

        if (emailError) {
            console.error('Resend Error:', emailError);
            return res.status(500).json({ error: 'Failed to send email' });
        }

        return res.status(200).json({ result: 'success', message: 'Message sent!' });

    } catch (err) {
        console.error('Server Internal Error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
