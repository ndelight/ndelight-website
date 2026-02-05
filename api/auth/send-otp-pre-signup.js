import supabaseAdmin from '../_utils/supabaseAdmin.js';
import resend from '../_utils/resend.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        // 1. Check if user already exists
        const { data: existingUser } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            return res.status(400).json({ error: 'User already exists. Please Log In.' });
        }

        // 2. Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // 3. Store in 'email_verifications'
        const { error: dbError } = await supabaseAdmin
            .from('email_verifications')
            .upsert({
                email,
                otp,
                expires_at: new Date(Date.now() + 10 * 60 * 1000)
            }, { onConflict: 'email' });

        if (dbError) {
            console.error('DB Error:', dbError);
            return res.status(500).json({ error: 'Database Error' });
        }

        // 4. Send Email
        await resend.emails.send({
            from: 'NDelight <noreply@contact.ndelight.in>',
            to: [email],
            subject: 'Verify your email to Signup - NDelight',
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2>Verify Your Email</h2>
                    <p>Use the code below to complete your sign up:</p>
                    <h1 style="letter-spacing: 5px; color: #ffd700;">${otp}</h1>
                    <p>This code expires in 10 minutes.</p>
                </div>
            `
        });

        res.json({ success: true, message: 'OTP sent' });

    } catch (err) {
        console.error('Pre-Signup Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
