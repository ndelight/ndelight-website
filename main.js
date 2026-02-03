import { supabase } from './supabase.js'

document.addEventListener('DOMContentLoaded', () => {
    // Sticky Header
    const header = document.querySelector('.header');
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;

        // Toggle .scrolled class for transparency/blur
        header.classList.toggle('scrolled', currentScrollY > 50);

        // Hide header on scroll down, show on scroll up
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
            header.classList.add('hidden');
        } else {
            header.classList.remove('hidden');
        }

        lastScrollY = currentScrollY;
    });

    // Mobile Menu
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            nav.classList.toggle('active');
            menuToggle.classList.toggle('is-active');
        });

        // Close menu when a link is clicked
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('active');
                menuToggle.classList.remove('is-active');
            });
        });
    }

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (nav.classList.contains('active') && !nav.contains(e.target) && !menuToggle.contains(e.target)) {
            nav.classList.remove('active');
            menuToggle.classList.remove('is-active');
        }
    });

    // Scroll Animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-in-up').forEach(el => observer.observe(el));

    // Contact Form Handling
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('button');
            const originalText = btn.textContent;

            btn.textContent = 'Sending...';
            btn.disabled = true;

            fetch(API_URL, {
                method: 'POST',
                // SUPER IMPORTANT: Use text/plain to avoid CORS preflight options request which GAS fails on
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    name: contactForm.querySelector('#name').value,
                    email: contactForm.querySelector('#email').value,
                    message: contactForm.querySelector('#message').value
                    // No 'action' needed for contact form as per unified_script logic
                })
            })
                .then(response => response.text()) // Get text first to safely handle potential HTML errors
                .then(text => {
                    try {
                        const data = JSON.parse(text);
                        if (data.result === 'success') {
                            alert('Thank you! Your message has been sent successfully.');
                            contactForm.reset();
                        } else {
                            alert('Something went wrong. Please try again later.');
                            console.error('Script Error:', data);
                        }
                    } catch (e) {
                        console.error("Submission Error:", e);
                        alert("There was a technical issue sending your message. Please try again later.");
                    }
                })
                .catch(err => {
                    alert('Network error. Please try again.');
                    console.error('Fetch Error:', err);
                })
                .finally(() => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                });
        });
    }

    // GLOBAL SCRIPT URL (Unified Gatekeeper) -- REMOVED


    // 1. Upcoming Events Fetcher
    const eventsContainer = document.getElementById('events-container');

    if (eventsContainer) {
        async function fetchEvents() {
            try {
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Start of day
                const filterDate = today.toISOString();

                const { data: events, error } = await supabase
                    .from('events')
                    .select('*')
                    .gte('date', filterDate)
                    .order('date', { ascending: true })
                    .limit(20);

                if (error) throw error;

                renderEvents(events);
            } catch (err) {
                console.error('Error fetching events:', err);
                eventsContainer.innerHTML = `
                    <div class="error-state">
                        <p>Unable to load events.</p>
                    </div>
                `;
            }
        }

        function renderEvents(events) {
            eventsContainer.innerHTML = '';

            if (!events || events.length === 0) {
                eventsContainer.innerHTML = `
                    <div class="empty-state">
                        <p>No upcoming events found.</p>
                    </div>
                `;
                return;
            }

            events.forEach((event, index) => {
                const dateObj = new Date(event.date);
                const dateStr = isNaN(dateObj)
                    ? event.date
                    : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                const delay = index * 0.1;

                const card = document.createElement('div');
                card.className = 'event-card';
                card.style.animationDelay = `${delay}s`;

                // Link to Event Details Page
                const eventLink = `href="/event.html?id=${event.id}"`;
                // NOTE: Switched to query param ?id=UUID for simplicity with static site unless we have rewritten rules.
                // User's prev code had /events/id. Let's stick to query param or assume they handle routing.
                // Actually, let's stick to their pattern /events/id but since it's Vite static, it might be tricky without rewrite.
                // Best to use /event.html?id=ID for safety now, or keep their logic if they have rewrites.
                // Looking at user's current paths, they seem to expect clean URLs. 
                // I will use /event.html?id=${event.id} to be safe for a static build unless Vercel config handles rewrites.
                // Re-reading Vercel.json might be good. For now, I'll use query params to ensure it works.

                // Fallback image
                const imageUrl = event.image_url || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80';

                card.innerHTML = `
                    <a href="/event.html?id=${event.id}" class="event-image-link">
                        <img src="${imageUrl}" alt="${event.title}" loading="lazy">
                    </a>
                    <div class="event-details">
                        <span class="event-badge">Event</span>
                        <h3 class="event-title">${event.title}</h3>
                        <p class="event-date">${dateStr}</p>
                        <p class="event-location">📍 ${event.location || 'TBA'}</p>
                    </div>
                `;

                eventsContainer.appendChild(card);
            });
        }

        fetchEvents();
    }

    // 2. Featured Work Fetcher (Using featured_events table)
    const portfolioContainer = document.getElementById('portfolio-container');
    if (portfolioContainer) {
        async function fetchFeatured() {
            try {
                // Fetch featured events joined with event details
                const { data: featured, error } = await supabase
                    .from('featured_events')
                    .select('*, events(*)')
                    .order('display_order', { ascending: true });

                if (error) throw error;

                if (!featured || featured.length === 0) {
                    portfolioContainer.innerHTML = '<p class="text-muted text-center">More work coming soon.</p>';
                    return;
                }

                portfolioContainer.innerHTML = '';

                featured.forEach((item, index) => {
                    const event = item.events; // Joined data
                    if (!event) return;

                    const name = event.title;
                    const imageUrl = event.image_url || 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80';
                    const link = `/event.html?id=${event.id}`;

                    const delay = index * 0.15;

                    const card = document.createElement('div');
                    card.className = 'portfolio-item';
                    card.style.animation = `fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards ${delay}s`;
                    card.style.opacity = '0';

                    card.onclick = () => {
                        if (event.external_link) {
                            window.open(event.external_link, '_blank');
                        } else {
                            window.location.href = link;
                        }
                    };
                    card.style.cursor = 'pointer';

                    card.innerHTML = `
                        <img src="${imageUrl}" alt="${name}" loading="lazy">
                        <div class="portfolio-overlay">
                            <h3 class="portfolio-title">${name}</h3>
                        </div>
                    `;

                    portfolioContainer.appendChild(card);
                });

            } catch (err) {
                console.error('Error fetching featured:', err);
                portfolioContainer.innerHTML = '<p class="text-muted text-center">Unable to load featured work.</p>';
            }
        }

        fetchFeatured();
    }

    // 3. Influencers Fetcher
    const influencersContainer = document.getElementById('influencers-container');
    if (influencersContainer) {
        async function fetchInfluencers() {
            try {
                // Fetch active influencers with profile data
                const { data: influencers, error } = await supabase
                    .from('influencers')
                    .select('*, profiles(full_name)')
                    .eq('active', true);

                if (error) throw error;

                if (!influencers || influencers.length === 0) {
                    influencersContainer.innerHTML = '<p class="text-muted text-center">Join our network of influencers.</p>';
                    return;
                }

                influencersContainer.innerHTML = '';

                influencers.forEach((inf, index) => {
                    const profileUrl = inf.image_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';

                    const delay = index * 0.1;

                    const card = document.createElement('div');
                    card.className = 'influencer-card';
                    card.style.animation = `fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards ${delay}s`;
                    card.style.opacity = '0';

                    // Prepare Social Links
                    let socialHtml = '';
                    if (inf.instagram) socialHtml += `<a href="${inf.instagram}" target="_blank" title="Instagram" class="social-icon insta"><img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png" alt="Insta"></a>`;
                    if (inf.facebook) socialHtml += `<a href="${inf.facebook}" target="_blank" title="Facebook" class="social-icon fb"><img src="https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg" alt="FB"></a>`;
                    if (inf.youtube) socialHtml += `<a href="${inf.youtube}" target="_blank" title="YouTube" class="social-icon yt"><img src="https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg" alt="YT"></a>`;

                    if (!socialHtml) socialHtml = '<span class="text-muted" style="font-size:0.8rem;">Socials coming soon</span>';

                    card.innerHTML = `
                        <div class="influencer-img-wrapper">
                            <img src="${profileUrl}" alt="${name}" loading="lazy">
                        </div>
                        <h3 class="influencer-name">${name}</h3>
                        <div class="influencer-contact social-links">
                            ${socialHtml}
                        </div>
                    `;
                    influencersContainer.appendChild(card);
                });

            } catch (err) {
                console.error('Error fetching influencers:', err);
                influencersContainer.innerHTML = '<p class="text-muted text-center">Unable to load influencers.</p>';
            }
        }

        fetchInfluencers();
    }
});
