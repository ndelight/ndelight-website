import Razorpay from 'razorpay';
import supabaseAdmin from '../_utils/supabaseAdmin.js';
import { buildPriceMap, getActiveWaterProducts } from './_utils/catalog.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { customer_info, items, design_url } = req.body || {};
        if (!customer_info || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const products = await getActiveWaterProducts();
        const priceMap = buildPriceMap(products);

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

        if (total <= 0 || normalized.length === 0) {
            return res.status(400).json({ message: 'Invalid cart items' });
        }

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

        if (error) {
            return res.status(500).json({ message: 'Failed to create water order row' });
        }

        return res.status(200).json({
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
    } catch (err) {
        return res.status(500).json({ message: err.message || 'Server error' });
    }
}

