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

// Water Samples Carousel
class WaterSamplesCarousel {
    constructor() {
        this.viewport = document.getElementById('waterSamplesCarousel');
        this.dotsContainer = document.getElementById('carouselDots');
        this.prevBtn = document.getElementById('carouselPrev');
        this.nextBtn = document.getElementById('carouselNext');
        this.carouselCard = this.viewport?.closest('.carousel-card') || null;
        this.currentIndex = 0;
        this.items = [];
        this.autoplayInterval = null;
        this.autoplayDelay = 2400;
        this.controlsBound = false;
        this.touchStartX = 0;
        this.touchStartY = 0;

        if (!this.viewport || !this.dotsContainer || !this.prevBtn || !this.nextBtn) return;

        this.init();
    }

    async init() {
        try {
            const { data, error } = await supabase
                .from('water_samples')
                .select('*')
                .eq('is_active', true)
                .order('display_order', { ascending: true });

            if (error) {
                console.error('Error fetching water samples:', error);
            }

            const validItems = (data || [])
                .map(item => ({
                    id: item.id,
                    image_url: (item.image_url || '').trim()
                }))
                .filter(item => item.image_url);

            if (validItems.length > 0) {
                this.renderSlides(validItems);
            } else {
                this.renderPlaceholder();
            }
        } catch (err) {
            console.error('Unexpected error loading carousel:', err);
            this.renderPlaceholder();
        }
    }

    createPlaceholderContent(message = 'Preview coming soon') {
        const placeholder = document.createElement('div');
        placeholder.innerHTML = `
            <div class="carousel-placeholder" role="status" aria-live="polite">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                    <rect x="4" y="4" width="16" height="16" rx="3"></rect>
                    <path d="M7 15l3-3 2 2 3-4 2 2"></path>
                </svg>
                <span>${message}</span>
            </div>
        `;
        return placeholder.firstElementChild;
    }

    renderPlaceholder() {
        this.items = [{ placeholder: true }];
        this.currentIndex = 0;
        this.viewport.innerHTML = '';
        const slide = document.createElement('div');
        slide.className = 'carousel-item active';
        slide.appendChild(this.createPlaceholderContent());
        this.viewport.appendChild(slide);
        this.dotsContainer.innerHTML = '';
        this.toggleControls(true);
    }

    renderSlides(items) {
        this.items = items;
        this.currentIndex = 0;
        this.viewport.innerHTML = '';

        items.forEach((item, index) => {
            const slide = document.createElement('div');
            slide.className = `carousel-item${index === 0 ? ' active' : ''}`;

            const image = document.createElement('img');
            image.className = 'carousel-image';
            image.src = item.image_url;
            image.alt = 'Water bottle design sample';
            image.loading = index === 0 ? 'eager' : 'lazy';
            image.decoding = 'async';
            image.addEventListener('error', () => {
                if (slide.dataset.fallbackApplied === 'true') return;
                slide.dataset.fallbackApplied = 'true';
                slide.replaceChildren(this.createPlaceholderContent('Image unavailable'));
            });

            slide.appendChild(image);
            this.viewport.appendChild(slide);
        });

        this.dotsContainer.innerHTML = '';
        items.forEach((_, index) => {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = `dot${index === 0 ? ' active' : ''}`;
            dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
            dot.addEventListener('click', () => {
                this.goToSlide(index);
                this.restartAutoplay();
            });
            this.dotsContainer.appendChild(dot);
        });

        this.bindControls();
        this.toggleControls(false);
        this.showSlide(0);
        this.startAutoplay();
    }

    bindControls() {
        if (this.controlsBound) return;
        this.controlsBound = true;

        this.prevBtn.addEventListener('click', () => {
            this.previousSlide();
            this.restartAutoplay();
        });

        this.nextBtn.addEventListener('click', () => {
            this.nextSlide();
            this.restartAutoplay();
        });

        if (this.carouselCard) {
            this.carouselCard.addEventListener('mouseenter', () => this.stopAutoplay());
            this.carouselCard.addEventListener('mouseleave', () => this.startAutoplay());
            this.carouselCard.addEventListener('touchstart', event => {
                const touch = event.changedTouches[0];
                this.touchStartX = touch.clientX;
                this.touchStartY = touch.clientY;
                this.stopAutoplay();
            }, { passive: true });
            this.carouselCard.addEventListener('touchend', event => {
                const touch = event.changedTouches[0];
                const deltaX = touch.clientX - this.touchStartX;
                const deltaY = touch.clientY - this.touchStartY;

                if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
                    if (deltaX < 0) {
                        this.nextSlide();
                    } else {
                        this.previousSlide();
                    }
                }

                this.startAutoplay();
            }, { passive: true });
        }

        document.addEventListener('keydown', event => {
            if (event.key === 'ArrowLeft') {
                this.previousSlide();
                this.restartAutoplay();
            } else if (event.key === 'ArrowRight') {
                this.nextSlide();
                this.restartAutoplay();
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopAutoplay();
            } else {
                this.startAutoplay();
            }
        });
    }

    toggleControls(isDisabled) {
        this.prevBtn.disabled = isDisabled;
        this.nextBtn.disabled = isDisabled;
        this.prevBtn.setAttribute('aria-disabled', String(isDisabled));
        this.nextBtn.setAttribute('aria-disabled', String(isDisabled));
    }

    showSlide(index) {
        if (!this.items.length) return;

        const slides = this.viewport.querySelectorAll('.carousel-item');
        const dots = this.dotsContainer.querySelectorAll('.dot');
        const nextIndex = (index + this.items.length) % this.items.length;

        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));

        if (slides[nextIndex]) {
            slides[nextIndex].classList.add('active');
        }

        if (dots[nextIndex]) {
            dots[nextIndex].classList.add('active');
        }

        this.currentIndex = nextIndex;
    }

    nextSlide() {
        if (this.items.length <= 1) return;
        this.showSlide(this.currentIndex + 1);
    }

    previousSlide() {
        if (this.items.length <= 1) return;
        this.showSlide(this.currentIndex - 1);
    }

    goToSlide(index) {
        if (index >= 0 && index < this.items.length) {
            this.showSlide(index);
        }
    }

    startAutoplay() {
        if (this.items.length <= 1 || this.autoplayInterval) return;

        this.autoplayInterval = window.setInterval(() => {
            this.nextSlide();
        }, this.autoplayDelay);
    }

    stopAutoplay() {
        if (!this.autoplayInterval) return;

        window.clearInterval(this.autoplayInterval);
        this.autoplayInterval = null;
    }

    restartAutoplay() {
        this.stopAutoplay();
        this.startAutoplay();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new WaterSamplesCarousel();
});

