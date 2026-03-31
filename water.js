import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('water-showcase-grid');

    if (!grid) return;

    (async () => {
        try {
            const { data, error } = await supabase
                .from('water_showcase')
                .select('*')
                .eq('is_active', true)
                .order('display_order', { ascending: true })
                .limit(12);

            if (error) {
                console.error('Error fetching water_showcase:', error);
                return;
            }

            if (!data || data.length === 0) {
                // Keep the static defaults
                return;
            }

            grid.innerHTML = '';

            data.forEach(item => {
                const card = document.createElement('article');
                card.className = 'water-card';

                const safeTitle = item.title || 'Branded Bottle';
                const safeSubtitle = item.subtitle || '';
                const safeTag = item.tag || 'Branded Water';
                const imageUrl =
                    item.image_url ||
                    'https://images.unsplash.com/photo-1534082753658-1dcb40af2830?auto=format&fit=crop&w=900&q=80';

                card.innerHTML = `
                    <div class="water-card-tag">${safeTag}</div>
                    <img src="${imageUrl}" alt="${safeTitle}">
                    <h3 class="water-card-title">${safeTitle}</h3>
                    <p class="water-card-subtitle">${safeSubtitle}</p>
                `;

                grid.appendChild(card);
            });
        } catch (err) {
            console.error('Unexpected error loading water showcase:', err);
        }
    })();
});

