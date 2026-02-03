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
                    const name = (inf.profiles && inf.profiles.full_name) || 'Influencer';
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

    // 4. Auth Header Logic (Profile vs Login)
    const headerCta = document.querySelector('.header-cta');
    if (headerCta) {
        checkAuthHeader();
    }

    async function checkAuthHeader() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return; // Keep default Login/Signup

        // Fetch user profile for name/role
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        const name = profile ? profile.full_name : 'User';
        const role = profile ? profile.role : 'user';
        const initial = name.charAt(0).toUpperCase();

        // Target the Login/Signup buttons to hide them
        const loginBtn = headerCta.querySelector('a[href="/login.html"].nav-link');
        const signupBtn = headerCta.querySelector('a[href="/login.html"].btn');
        if (loginBtn) loginBtn.style.display = 'none';
        if (signupBtn) signupBtn.style.display = 'none';

        // Create Profile Dropdown
        const profileContainer = document.createElement('div');
        profileContainer.className = 'auth-profile-dropdown';
        profileContainer.style.position = 'relative';
        profileContainer.style.marginRight = '1.5rem';
        profileContainer.style.cursor = 'pointer';
        profileContainer.style.display = 'inline-block';

        // Profile Avatar HTML
        // Use Brand Green Border + Light Grey Background for premium feel matching logo/theme.
        profileContainer.innerHTML = `
            <div class="profile-trigger" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;">
                <div style="width: 40px; height: 40px; background: #E6E2DC; color: #184E4A; border: 2px solid #184E4A; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    ${initial}
                </div>
                <div style="display: flex; align-items: center; gap: 4px;">
                    <span class="profile-name" style="color: #1F2F2E; font-size: 0.8rem; font-weight: 600;">${name.split(' ')[0]}</span>
                    <span style="color: #184E4A; font-size: 0.7rem;">▼</span>
                </div>
            </div>
            
            <div class="profile-menu" style="
                display: none;
                position: absolute;
                top: 110%; /* moved down slightly */
                right: -10px; /* shift left to align better under corner */
                background: #1a1a1a;
                border: 1px solid #333;
                border-radius: 8px;
                min-width: 160px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                padding: 0.5rem 0;
                z-index: 1000;
            ">
                ${(role === 'influencer' || role === 'admin') ? `
                <a href="/${role}/" style="display: block; padding: 10px 20px; color: #fff; text-decoration: none; font-size: 0.9rem; transition: background 0.2s;">
                    Dashboard
                </a>` : ''}
                <div id="header-logout" style="display: block; padding: 10px 20px; color: #ff4d4d; text-decoration: none; font-size: 0.9rem; cursor: pointer; transition: background 0.2s;">
                    Sign Out
                </div>
            </div>
        `;

        // Insert before the menu toggle
        const menuToggle = headerCta.querySelector('.menu-toggle');
        if (menuToggle) {
            headerCta.insertBefore(profileContainer, menuToggle);
        } else {
            headerCta.appendChild(profileContainer);
        }

        // Dropdown Toggle Logic
        // Re-selecting inside the container to ensure we get the fresh elements
        const trigger = profileContainer.querySelector('.profile-trigger');
        const menu = profileContainer.querySelector('.profile-menu');

        // Toggle on click
        trigger.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent document click from immediately closing it
            const isHidden = menu.style.display === 'none' || menu.style.display === '';
            menu.style.display = isHidden ? 'block' : 'none';
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            // If click is outside the container, close logic
            if (!profileContainer.contains(e.target)) {
                menu.style.display = 'none';
            }
        });

        // Hover Effect specific to this menu items
        const menuItems = menu.querySelectorAll('a, div');
        menuItems.forEach(item => {
            item.addEventListener('mouseenter', () => item.style.background = '#333');
            item.addEventListener('mouseleave', () => item.style.background = 'transparent');
        });

        // Logout Action
        const logoutBtn = profileContainer.querySelector('#header-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.stopPropagation(); // Prevent menu toggle conflict
                await supabase.auth.signOut();
                window.location.reload();
            });
        }
    }
});
