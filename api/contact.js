import supabaseAdmin from './_utils/supabaseAdmin.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
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
            // We verify DB insert but don't block email if it fails (unlikely)
        }

        // 2. Send Email via Resend
        const { data, error: emailError } = await resend.emails.send({
            from: 'NDelight Contact <onboarding@resend.dev>', // Update this if you have a custom domain
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
        console.error('Server Error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
