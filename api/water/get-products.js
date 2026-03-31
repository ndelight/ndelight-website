import { getActiveWaterProducts } from './_utils/catalog.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const products = await getActiveWaterProducts();
        return res.status(200).json({ products });
    } catch (err) {
        return res.status(500).json({ message: err.message || 'Failed to load products' });
    }
}

