import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' })
    }

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET
    const signature = req.headers['x-razorpay-signature']

    if (!secret) {
        console.error('RAZORPAY_WEBHOOK_SECRET is not set in environment variables.')
        return res.status(500).json({ message: 'Server Configuration Error' })
    }

    if (!signature) {
        return res.status(400).json({ message: 'Missing Signature' })
    }

    // Verify Signature
    const shasum = crypto.createHmac('sha256', secret)
    shasum.update(JSON.stringify(req.body))
    const digest = shasum.digest('hex')

    if (digest !== signature) {
        return res.status(400).json({ status: 'failure', message: 'Invalid Signature' })
    }

    const event = req.body

    // Handle 'order.paid' event
    if (event.event === 'order.paid') {
        const order = event.payload.order.entity
        const order_id = order.id

        // We might want to grab the payment ID too if available in this payload or fetches it
        // Usually payload.payment is available in order.paid if using standard webhooks
        // But let's be safe.

        console.log(`Processing order.paid for ${order_id}`)

        // Initialize Supabase with Service Key to allow strict updates
        // RLS might block anonymous 'update' on bookings usually.
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        )

        const { error } = await supabase
            .from('bookings')
            .update({
                status: 'paid',
                // If payment_id is needed, might need 'payment.captured' event or look into payload deeply
                // For now, mark as paid is crucial.
            })
            .eq('razorpay_order_id', order_id)

        if (error) {
            console.error('Supabase Update Error:', error)
            return res.status(500).json({ message: 'Database update failed' })
        }
    }

    res.json({ status: 'ok' })
}
