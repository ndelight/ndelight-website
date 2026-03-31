import supabaseAdmin from '../../_utils/supabaseAdmin.js';

export async function getActiveWaterProducts() {
    const { data, error } = await supabaseAdmin
        .from('water_products')
        .select('size_ml, title, unit_price, image_url, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
}

export function buildPriceMap(products) {
    const map = {};
    (products || []).forEach((p) => {
        const size = parseInt(p.size_ml, 10);
        map[size] = Number(p.unit_price);
    });
    return map;
}

