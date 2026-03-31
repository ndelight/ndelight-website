import crypto from 'crypto';
import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../server/utils/supabaseAdmin.js';
import { resend } from '../server/utils/resend.js';

export const config = { runtime: 'nodejs' };

function json(res, status, payload) {
    res.status(status).setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
}

function getPath(req) {
    try {
        return new URL(req.url, 'http://localhost').pathname;
    } catch {
        return req.url || '/';
    }
}

async function readJson(req) {
    if (req.body && typeof req.body === 'object') return req.body;
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8');
    if (!raw) return {};
    return JSON.parse(raw);
}

async function handleContact(req, res) {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method Not Allowed' });
    const { name, email, message } = await readJson(req);
    if (!name || !email || !message) return json(res, 400, { error: 'Missing required fields' });

    const { error: dbError } = await supabaseAdmin
        .from('contact_messages')
        .insert([{ name, email, message }]);
    if (dbError) console.error('Contact DB error:', dbError);

    const { error: emailError } = await resend.emails.send({
        from: 'NDelight Contact <contact@contact.ndelight.in>',
        to: ['ndelight.co@gmail.com'],
        subject: `New Inquiry from ${name}`,
        html: `
            <h2>New Website Inquiry</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <div style="background:#f9f9f9; padding:15px; border-left:4px solid #ffd700;">
                <p style="white-space: pre-wrap;">${message}</p>
            </div>
        `,
    });
    if (emailError) return json(res, 500, { error: 'Failed to send email' });

    return json(res, 200, { result: 'success', message: 'Message sent!' });
}

async function handleGetWaterProducts(req, res) {
    if (req.method !== 'GET') return json(res, 405, { message: 'Method Not Allowed' });
    const { data, error } = await supabaseAdmin
        .from('water_products')
        .select('size_ml, title, unit_price, image_url, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
    if (error) return json(res, 500, { message: 'Failed to load products' });
    return json(res, 200, { products: data || [] });
}

async function handleCreateWaterOrder(req, res) {
    if (req.method !== 'POST') return json(res, 405, { message: 'Method Not Allowed' });

    const { customer_info, items, design_url } = await readJson(req);
    if (!customer_info || !Array.isArray(items) || items.length === 0) {
        return json(res, 400, { message: 'Missing required fields' });
    }

    const { data: products, error: productError } = await supabaseAdmin
        .from('water_products')
        .select('size_ml, unit_price')
        .eq('is_active', true);
    if (productError) return json(res, 500, { message: 'Failed to fetch product pricing' });

    const priceMap = {};
    (products || []).forEach((p) => {
        priceMap[parseInt(p.size_ml, 10)] = Number(p.unit_price);
    });

    let total = 0;
    const normalized = [];
    for (const item of items) {
        const size = parseInt(item.size_ml, 10);
        const qty = parseInt(item.qty, 10);
        if (!priceMap[size] || Number.isNaN(qty) || qty <= 0) continue;
        const unit = priceMap[size];
        total += unit * qty;
        normalized.push({ size_ml: size, qty, unit_price: unit, line_total: unit * qty });
    }
    if (total <= 0 || normalized.length === 0) return json(res, 400, { message: 'Invalid cart items' });

    const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    const order = await razorpay.orders.create({
        amount: Math.round(total * 100),
        currency: 'INR',
        receipt: `wtr_${Date.now().toString().slice(-10)}`,
        notes: { kind: 'water_order' },
    });

    const quantityText = normalized.map((i) => `${i.size_ml}ml x ${i.qty}`).join(', ');
    const notes = JSON.stringify({
        cart_items: normalized,
        total_amount: total,
        razorpay_order_id: order.id,
    });

    const { data: waterOrder, error } = await supabaseAdmin
        .from('water_orders')
        .insert([
            {
                customer_name: customer_info.name,
                phone: customer_info.phone,
                email: customer_info.email || null,
                quantity_text: quantityText,
                full_address: customer_info.address || '',
                design_url: design_url || null,
                status: 'new',
                payment_status: 'pending',
                razorpay_order_id: order.id,
                notes,
            },
        ])
        .select()
        .single();

    if (error) return json(res, 500, { message: 'Failed to create water order row' });

    return json(res, 200, {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: process.env.RAZORPAY_KEY_ID,
        water_order_id: waterOrder.id,
        prefill: {
            name: customer_info.name,
            email: customer_info.email || '',
            contact: customer_info.phone,
        },
    });
}

async function handleCreateEventOrder(req, res) {
    if (req.method !== 'POST') return json(res, 405, { message: 'Method Not Allowed' });
    const { event_id, influencer_code, customer_info } = await readJson(req);
    if (!event_id || !customer_info) return json(res, 400, { message: 'Missing required fields' });

    const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const { data: event, error } = await supabaseAdmin
        .from('events')
        .select('*')
        .eq('id', event_id)
        .single();
    if (error || !event) return json(res, 400, { message: 'Invalid Event' });

    let discountPercent = 0;
    if (influencer_code) {
        const { data: infData } = await supabaseAdmin
            .from('influencers')
            .select('active, discount_percent')
            .eq('code', influencer_code)
            .single();
        if (infData && infData.active) discountPercent = infData.discount_percent || 0;
    }

    let finalPrice = event.price;
    if (discountPercent > 0) {
        const discountAmount = Math.round(event.price * (discountPercent / 100));
        finalPrice = event.price - discountAmount;
    }

    const order = await razorpay.orders.create({
        amount: Math.round(finalPrice * 100),
        currency: 'INR',
        receipt: `rcpt_${Date.now().toString().slice(-10)}`,
        notes: {
            event_id,
            influencer_code: influencer_code || 'organic',
            discount_applied: discountPercent + '%',
        },
    });

    const { data: booking, error: bookingError } = await supabaseAdmin
        .from('bookings')
        .insert({
            event_id,
            customer_name: customer_info.name,
            customer_email: customer_info.email,
            customer_phone: customer_info.phone,
            amount: finalPrice,
            status: 'pending',
            razorpay_order_id: order.id,
            influencer_code: influencer_code || null,
        })
        .select()
        .single();
    if (bookingError) return json(res, 500, { message: 'Failed to reserve booking' });

    return json(res, 200, {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: process.env.RAZORPAY_KEY_ID,
        booking_id: booking.id,
        prefill: {
            name: customer_info.name,
            email: customer_info.email,
            contact: customer_info.phone,
        },
    });
}

async function handleSendBookingEmail(req, res) {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method Not Allowed' });
    const { booking_id } = await readJson(req);
    if (!booking_id) return json(res, 400, { error: 'Booking ID required' });

    const { data: booking, error } = await supabaseAdmin
        .from('bookings')
        .select('*, events(*)')
        .eq('id', booking_id)
        .single();
    if (error || !booking) return json(res, 404, { error: 'Booking not found' });
    if (booking.email_sent_at) return json(res, 200, { success: true, message: 'Email already sent' });
    if (booking.status !== 'paid') return json(res, 400, { error: 'Booking not paid yet' });

    await resend.emails.send({
        from: 'NDelight Tickets <tickets@contact.ndelight.in>',
        to: [booking.customer_email],
        subject: `Your Ticket for ${booking.events.title}`,
        html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; max-width: 600px; margin: 0 auto;">
                <div style="background: #000; color: #ffd700; padding: 20px; text-align: center;">
                    <h1>Your Ticket is Here! 🎟️</h1>
                </div>
                <div style="padding: 20px;">
                    <p>Hi ${booking.customer_name},</p>
                    <p>You are all set for <strong>${booking.events.title}</strong>.</p>
                    <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #ffd700; margin: 20px 0;">
                        <p><strong>Date:</strong> ${new Date(booking.events.date).toDateString()}</p>
                        <p><strong>Location:</strong> ${booking.events.location}</p>
                        <p><strong>Booking ID:</strong> #${booking.id}</p>
                        <p><strong>Amount Paid:</strong> ₹${booking.amount}</p>
                    </div>
                    <p>Please show this email at the entry.</p>
                </div>
            </div>
        `,
    });

    await supabaseAdmin.from('bookings').update({ email_sent_at: new Date() }).eq('id', booking_id);
    return json(res, 200, { success: true, message: 'Booking email sent' });
}

async function handleSendApprovalEmail(req, res) {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method Not Allowed' });
    const { influencer_id } = await readJson(req);
    if (!influencer_id) return json(res, 400, { error: 'Influencer ID required' });

    const { data: influencer, error } = await supabaseAdmin
        .from('influencers')
        .select('*, profiles(email, full_name)')
        .eq('id', influencer_id)
        .single();
    if (error || !influencer) return json(res, 404, { error: 'Influencer not found' });
    if (!influencer.active) return json(res, 400, { error: 'Influencer not active' });

    const email = influencer.profiles?.email;
    if (!email) return json(res, 400, { error: 'Influencer email not found' });

    await resend.emails.send({
        from: 'NDelight Admin <admin@contact.ndelight.in>',
        to: [email],
        subject: 'You are Approved! 🌟',
        html: `
            <div style="font-family: sans-serif; padding: 20px; text-align: center;">
                <h1>Welcome to the Club! 🚀</h1>
                <p>Hi ${influencer.profiles.full_name},</p>
                <p>Your influencer application for <strong>NDelight</strong> has been approved.</p>
                <p>Your Request Code: <strong>${influencer.code}</strong></p>
                <p>You can now log in to your dashboard to track earnings and bookings.</p>
                <a href="${process.env.VITE_APP_URL || 'https://www.ndelight.in'}/login.html" style="display:inline-block; padding: 10px 20px; background: #ffd700; color: #000; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px;">Go to Dashboard</a>
            </div>
        `,
    });

    return json(res, 200, { success: true, message: 'Approval email sent' });
}

async function handleRazorpayWebhook(req, res) {
    if (req.method !== 'POST') return json(res, 405, { message: 'Method Not Allowed' });
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    if (!secret) return json(res, 500, { message: 'Server Config Error' });
    if (!signature) return json(res, 400, { message: 'Missing Signature' });

    // Verify signature
    const body = await readJson(req);
    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(JSON.stringify(body));
    const digest = shasum.digest('hex');
    if (digest !== signature) return json(res, 400, { status: 'failure', message: 'Invalid Signature' });

    if (body.event === 'order.paid') {
        const order = body.payload.order.entity;
        const order_id = order.id;

        await supabaseAdmin.from('bookings').update({ status: 'paid' }).eq('razorpay_order_id', order_id);
        await supabaseAdmin.from('water_orders').update({ payment_status: 'paid' }).eq('razorpay_order_id', order_id);
    }

    return json(res, 200, { status: 'ok' });
}

// Auth: Mark Verified (requires token check)
async function handleAuthMarkVerified(req, res) {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method Not Allowed' });
    const { user_id } = await readJson(req);
    const authHeader = req.headers.authorization;
    if (!user_id || !authHeader) return json(res, 401, { error: 'Unauthorized' });

    const token = authHeader.split(' ')[1];
    const supabaseAnon = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
    if (error || !user || user.id !== user_id) return json(res, 401, { error: 'Invalid Token' });

    const { error: updateError } = await supabaseAdmin.from('profiles').update({ email_verified: true }).eq('id', user_id);
    if (updateError) return json(res, 500, { error: 'Server Error' });
    return json(res, 200, { success: true, message: 'Verified' });
}

async function handleAuthSendOtp(req, res) {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method Not Allowed' });
    const { user_id, email } = await readJson(req);
    if (!user_id || !email) return json(res, 400, { error: 'User ID and Email required' });

    const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('email_otp_last_sent_at, email_otp_sent_count')
        .eq('id', user_id)
        .single();
    if (error) return json(res, 404, { error: 'Profile not found' });

    const now = new Date();
    const lastSent = profile.email_otp_last_sent_at ? new Date(profile.email_otp_last_sent_at) : null;
    if (lastSent && now - lastSent < 10000) return json(res, 429, { error: 'Please wait 10s before resending.' });

    let newCount = (profile.email_otp_sent_count || 0) + 1;
    const lastDate = lastSent ? lastSent.toISOString().split('T')[0] : '';
    const curDate = now.toISOString().split('T')[0];
    if (lastDate !== curDate) newCount = 1;
    if (newCount > 100) return json(res, 429, { error: 'Daily OTP limit reached.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

    const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
            email_otp: otp,
            email_otp_expires_at: expiresAt,
            email_otp_last_sent_at: now,
            email_otp_sent_count: newCount,
            email_otp_attempts: 0,
        })
        .eq('id', user_id);
    if (updateError) return json(res, 500, { error: 'Internal Server Error' });

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
        `,
    });
    if (emailError) return json(res, 500, { error: 'Failed to send email' });

    return json(res, 200, { success: true, message: 'OTP sent' });
}

async function handleAuthVerifyOtp(req, res) {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method Not Allowed' });
    const { user_id, otp } = await readJson(req);
    if (!user_id || !otp) return json(res, 400, { error: 'User ID and OTP required' });

    const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('email_otp, email_otp_expires_at, email_otp_attempts')
        .eq('id', user_id)
        .single();
    if (error || !profile) return json(res, 404, { error: 'Profile not found' });

    if (profile.email_otp !== otp) {
        await supabaseAdmin
            .from('profiles')
            .update({ email_otp_attempts: (profile.email_otp_attempts || 0) + 1 })
            .eq('id', user_id);
        return json(res, 400, { error: 'Invalid OTP' });
    }
    if (new Date() > new Date(profile.email_otp_expires_at)) return json(res, 400, { error: 'OTP Expired' });

    const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
            email_verified: true,
            email_otp: null,
            email_otp_expires_at: null,
            email_otp_attempts: 0,
        })
        .eq('id', user_id);
    if (updateError) return json(res, 500, { error: 'Internal Server Error' });
    return json(res, 200, { success: true, message: 'Email Verified Successfully' });
}

async function handleAuthForgotPassword(req, res) {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method Not Allowed' });
    const { email } = await readJson(req);
    if (!email) return json(res, 400, { error: 'Email is required' });

    const { data: profile } = await supabaseAdmin.from('profiles').select('id').eq('email', email).single();
    if (!profile) return json(res, 200, { success: true, message: 'If an account exists, a reset link has been sent.' });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await supabaseAdmin
        .from('profiles')
        .update({ reset_token_hash: tokenHash, reset_token_expires_at: expiresAt })
        .eq('id', profile.id);

    const siteUrl = process.env.VITE_APP_URL || 'https://www.ndelight.in';
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
            </div>
        `,
    });

    return json(res, 200, { success: true, message: 'If an account exists, a reset link has been sent.' });
}

async function handleAuthResetPassword(req, res) {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method Not Allowed' });
    const { token, newPassword, email } = await readJson(req);
    if (!token || !newPassword || !email) return json(res, 400, { error: 'Missing required fields' });

    const tokenHashReceived = crypto.createHash('sha256').update(token).digest('hex');
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, reset_token_hash, reset_token_expires_at')
        .eq('email', email)
        .single();
    if (!profile) return json(res, 400, { error: 'Invalid request' });
    if (!profile.reset_token_hash || profile.reset_token_hash !== tokenHashReceived) {
        return json(res, 400, { error: 'Invalid or expired token' });
    }
    if (new Date() > new Date(profile.reset_token_expires_at)) return json(res, 400, { error: 'Token expired' });

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, { password: newPassword });
    if (authError) return json(res, 500, { error: 'Internal Server Error' });

    await supabaseAdmin
        .from('profiles')
        .update({ reset_token_hash: null, reset_token_expires_at: null })
        .eq('id', profile.id);

    return json(res, 200, { success: true, message: 'Password updated successfully' });
}

async function handleAuthSendOtpPreSignup(req, res) {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method Not Allowed' });
    const { email } = await readJson(req);
    if (!email) return json(res, 400, { error: 'Email is required' });

    const { data: existingUser } = await supabaseAdmin.from('profiles').select('id').eq('email', email).single();
    if (existingUser) return json(res, 400, { error: 'User already exists. Please Log In.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const { error: dbError } = await supabaseAdmin.from('email_verifications').upsert(
        { email, otp, expires_at: new Date(Date.now() + 10 * 60 * 1000) },
        { onConflict: 'email' }
    );
    if (dbError) return json(res, 500, { error: 'Database Error' });

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
        `,
    });

    return json(res, 200, { success: true, message: 'OTP sent' });
}

async function handleAuthVerifyOtpPreSignup(req, res) {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method Not Allowed' });
    const { email, otp } = await readJson(req);
    const { data: verification } = await supabaseAdmin
        .from('email_verifications')
        .select('*')
        .eq('email', email)
        .single();
    if (!verification || verification.otp !== otp) return json(res, 400, { error: 'Invalid OTP' });
    if (new Date() > new Date(verification.expires_at)) return json(res, 400, { error: 'OTP Expired' });
    await supabaseAdmin.from('email_verifications').delete().eq('email', email);
    return json(res, 200, { success: true, message: 'Email Verified' });
}

export default async function handler(req, res) {
    const path = getPath(req);

    // Contact
    if (path === '/api/contact') return handleContact(req, res);

    // Water
    if (path === '/api/get-water-products' || path === '/api/water/get-products') return handleGetWaterProducts(req, res);
    if (path === '/api/create-water-razorpay-order' || path === '/api/water/create-order') return handleCreateWaterOrder(req, res);

    // Events payment
    if (path === '/api/create-razorpay-order') return handleCreateEventOrder(req, res);

    // Emails
    if (path === '/api/send-booking-email') return handleSendBookingEmail(req, res);
    if (path === '/api/send-approval-email') return handleSendApprovalEmail(req, res);

    // Webhook
    if (path === '/api/razorpay-webhook') return handleRazorpayWebhook(req, res);

    // Auth
    if (path === '/api/auth/send-otp-pre-signup') return handleAuthSendOtpPreSignup(req, res);
    if (path === '/api/auth/verify-otp-pre-signup') return handleAuthVerifyOtpPreSignup(req, res);
    if (path === '/api/auth/send-otp') return handleAuthSendOtp(req, res);
    if (path === '/api/auth/verify-otp') return handleAuthVerifyOtp(req, res);
    if (path === '/api/auth/forgot-password') return handleAuthForgotPassword(req, res);
    if (path === '/api/auth/reset-password') return handleAuthResetPassword(req, res);
    if (path === '/api/auth/mark-verified') return handleAuthMarkVerified(req, res);

    return json(res, 404, { message: 'Not Found' });
}

