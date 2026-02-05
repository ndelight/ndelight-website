export default async function handler(req, res) {
    // 0. Method Check
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 1. Dynamic Imports (Traps "Module Not Found" errors)
        const { createClient } = await import('@supabase/supabase-js');
        const { Resend } = await import('resend');

        // 2. Load Env Vars
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
        const resendKey = process.env.RESEND_API_KEY;

        // 3. Diagnose Missing Keys
        if (!supabaseUrl || !supabaseServiceKey || !resendKey) {
            console.error('SERVER OLD CONFIG ERROR: Missing Keys');
            return res.status(500).json({
                error: 'Server Misconfigured (Missing Keys)',
                details: {
                    sb_url: !!supabaseUrl,
                    sb_key: !!supabaseServiceKey,
                    resend: !!resendKey
                }
            });
        }

        // 4. Init Clients
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const resend = new Resend(resendKey);

        // 5. Parse Body
        const { name, email, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // 6. DB Insert
        const { error: dbError } = await supabaseAdmin
            .from('contact_messages')
            .insert([{ name, email, message }]);

        if (dbError) console.error('DB Error:', dbError);

        // 7. Send Email
        const { data, error: emailError } = await resend.emails.send({
            from: 'NDelight Contact <onboarding@resend.dev>',
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
        console.error('CRASH REPORT:', err);
        return res.status(500).json({
            error: 'Server Crash',
            details: err.message,
            stack: err.stack ? err.stack.split('\n')[0] : 'No stack'
        });
    }
}
