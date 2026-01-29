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
        });
    }

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

            setTimeout(() => {
                alert('Thank you! Your message has been sent successfully.');
                contactForm.reset();
                btn.textContent = originalText;
                btn.disabled = false;
            }, 1500);
        });
    }

    // Upcoming Events Fetcher
    const eventsContainer = document.getElementById('events-container');

    if (eventsContainer) {
        const SHEET_API = 'https://opensheet.elk.sh/1_7lOYKJZ_cmJeMn3hZNggNmk58Wu2SdYjVtlQgG-7lQ/upcoming_events';

        fetch(SHEET_API)
            .then(response => response.json())
            .then(data => {
                // Helper: Normalize Keys & Fix Drive Links
                const driveLinkToDirect = (link) => {
                    if (!link) return '';
                    // Check for standard Drive View Link (handles both /d/ and /file/d/)
                    const idMatch = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
                    if (idMatch && idMatch[1]) {
                        // Use thumbnail endpoint for reliable embedding (sz=w1920 asks for high-res)
                        return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1920`;
                    }
                    return link;
                };

                const parseEvents = data.map(item => {
                    // Handle flexible keys
                    const title = item['Title '] || item['Title'] || item['title'] || 'Untitled Event';
                    const date = item['Date'] || item['date'];
                    const location = item['Location'] || item['location'];
                    const type = item['Type'] || item['type'] || 'event';
                    const imageRaw = item['Image'] || item['image'];
                    const insta = item['Insta'] || item['insta'];

                    // Generate ID Logic: <type>-<yyyy-mm-dd>
                    // Ensure type is lowercase and date is yyyy-mm-dd
                    const cleanType = type.toLowerCase().trim();
                    const cleanDate = date; // Assumption: API date is already YYYY-MM-DD based on sheet usage
                    const generatedId = `${cleanType}-${cleanDate}`;

                    // Prefer generic 'id' from sheet if exists, else use generated
                    const finalId = item['id'] || item['Id'] || generatedId;

                    return {
                        id: finalId,
                        title: title.trim(),
                        date: date,
                        location: location,
                        type: type,
                        image: driveLinkToDirect(imageRaw),
                        insta: insta
                    };
                });

                // Filter & Sort: Date >= Today
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

                const upcomingEvents = parseEvents
                    .filter(event => {
                        if (!event.date) return false;
                        // Robust string comparison for YYYY-MM-DD
                        return event.date >= todayStr;
                    })
                    .sort((a, b) => (a.date > b.date ? 1 : -1))
                    .slice(0, 4);

                renderEvents(upcomingEvents);
            })
            .catch(err => {
                console.error('Error fetching events:', err);
                eventsContainer.innerHTML = `
                    <div class="error-state">
                        <p>Unable to load events.</p>
                    </div>
                `;
            });

        function renderEvents(events) {
            eventsContainer.innerHTML = '';

            if (events.length === 0) {
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

                // Link to Event Details Page (Clean URL)
                const eventLink = `href="/events/${event.id}"`;

                // Fallback image
                const imageUrl = event.image || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80';

                card.innerHTML = `
                    <a ${eventLink} class="event-image-link">
                        <img src="${imageUrl}" alt="${event.title}" loading="lazy">
                    </a>
                    <div class="event-details">
                        <span class="event-badge">${event.type}</span>
                        <h3 class="event-title">${event.title}</h3>
                        <p class="event-date">${dateStr}</p>
                        <p class="event-location">📍 ${event.location || 'TBA'}</p>
                    </div>
                `;

                eventsContainer.appendChild(card);
            });
        }
    }

    // Featured Work Fetcher (Sheet2)
    const portfolioContainer = document.getElementById('portfolio-container');
    if (portfolioContainer) {
        const PORTFOLIO_API = 'https://opensheet.elk.sh/1_7lOYKJZ_cmJeMn3hZNggNmk58Wu2SdYjVtlQgG-7lQ/featured_events';

        fetch(PORTFOLIO_API)
            .then(response => response.json())
            .then(data => {
                console.log('Portfolio Data:', data); // DEBUG: Check raw data

                if (data.length === 0) {
                    portfolioContainer.innerHTML = '<p class="text-muted text-center">More work coming soon.</p>';
                    return;
                }

                portfolioContainer.innerHTML = '';

                // Helper reuse usually good, but embedded for safety/clarity in this scope
                const driveLinkToDirect = (link) => {
                    if (!link) return '';
                    if (!link.includes('drive.google.com')) return link; // Not a drive link, return as is (maybe direct)

                    let id = '';
                    // Pattern 1: /d/IDENTIFIER
                    const idMatch = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
                    if (idMatch && idMatch[1]) id = idMatch[1];

                    // Pattern 2: id=IDENTIFIER
                    const idParamMatch = link.match(/id=([a-zA-Z0-9_-]+)/);
                    if (idParamMatch && idParamMatch[1]) id = idParamMatch[1];

                    if (id) {
                        // Revert to thumbnail endpoint for better reliability if lh3 fails
                        return `https://drive.google.com/thumbnail?id=${id}&sz=w1920`;
                    }

                    return link;
                };

                // Helper: Case-insensitive & trimmed key lookup
                const getValue = (item, target) => {
                    const keys = Object.keys(item);
                    const match = keys.find(k => k.trim().toLowerCase() === target.toLowerCase());
                    return match ? item[match] : undefined;
                };

                data.forEach((item, index) => {

                    // Flexible Keys with User Confirmed Priorities
                    const name = item['event_name'] || getValue(item, 'event_name') || getValue(item, 'name') || 'Featured Work';
                    const imageRaw = item['image'] || getValue(item, 'image');
                    const link = item['link'] || getValue(item, 'link') || '#';

                    const imageUrl = driveLinkToDirect(imageRaw) || 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80';

                    const delay = index * 0.15;

                    const card = document.createElement('div');
                    card.className = 'portfolio-item';
                    card.style.animation = `fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards ${delay}s`;
                    card.style.opacity = '0'; // Start hidden for animation

                    // Click interaction: Redirect
                    card.onclick = () => {
                        if (link && link !== '#') window.open(link, '_blank');
                    };
                    card.style.cursor = 'pointer';

                    card.innerHTML = `
                        <img src="${imageUrl}" alt="${name}" loading="lazy" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80';">
                        <div class="portfolio-overlay">
                            <h3 class="portfolio-title">${name}</h3>
                        </div>
                    `;

                    portfolioContainer.appendChild(card);
                });
            })
            .catch(err => {
                console.error('Error fetching portfolio:', err);
                portfolioContainer.innerHTML = '<p class="text-muted text-center">Unable to load featured work.</p>';
            });
    }

    // Influencers Fetcher (Sheet3)
    const influencersContainer = document.getElementById('influencers-container');
    if (influencersContainer) {
        const INFLUENCERS_API = 'https://opensheet.elk.sh/1_7lOYKJZ_cmJeMn3hZNggNmk58Wu2SdYjVtlQgG-7lQ/influencers';

        fetch(INFLUENCERS_API)
            .then(response => response.json())
            .then(data => {
                if (data.length === 0) {
                    influencersContainer.innerHTML = '<p class="text-muted text-center">Join our network of influencers.</p>';
                    return;
                }

                influencersContainer.innerHTML = '';

                // Re-defining helpers here as they are scoped above (or we could move them global later)
                const driveLinkToDirect = (link) => {
                    if (!link) return '';
                    if (!link.includes('drive.google.com')) return link;
                    let id = '';
                    const idMatch = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
                    if (idMatch && idMatch[1]) id = idMatch[1];
                    const idParamMatch = link.match(/id=([a-zA-Z0-9_-]+)/);
                    if (idParamMatch && idParamMatch[1]) id = idParamMatch[1];
                    return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1000` : link;
                };

                const getValue = (item, target) => {
                    const keys = Object.keys(item);
                    const match = keys.find(k => k.trim().toLowerCase() === target.toLowerCase());
                    return match ? item[match] : undefined;
                };

                data.forEach((item, index) => {
                    const name = getValue(item, 'Name') || 'Influencer';
                    // Admin data - hidden from UI
                    // const email = getValue(item, 'email');
                    // const phone = getValue(item, 'phone');

                    const profileRaw = getValue(item, 'profile') || getValue(item, 'image');
                    const profileUrl = driveLinkToDirect(profileRaw) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';

                    // Socials
                    const insta = getValue(item, 'insta') || getValue(item, 'instagram');
                    const fb = getValue(item, 'facebook') || getValue(item, 'fb');
                    const yt = getValue(item, 'yotuube') || getValue(item, 'youtube') || getValue(item, 'yt');

                    const delay = index * 0.1;

                    const card = document.createElement('div');
                    card.className = 'influencer-card';
                    card.style.animation = `fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards ${delay}s`;
                    card.style.opacity = '0';

                    // Prepare Social Links
                    let socialHtml = '';
                    if (insta) socialHtml += `<a href="${insta}" target="_blank" title="Instagram" class="social-icon insta"><img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png" alt="Insta"></a>`;
                    if (fb) socialHtml += `<a href="${fb}" target="_blank" title="Facebook" class="social-icon fb"><img src="https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg" alt="FB"></a>`;
                    if (yt) socialHtml += `<a href="${yt}" target="_blank" title="YouTube" class="social-icon yt"><img src="https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg" alt="YT"></a>`;

                    // Fallback visual if no socials
                    if (!socialHtml) socialHtml = '<span class="text-muted" style="font-size:0.8rem;">Socials coming soon</span>';

                    card.innerHTML = `
                        <div class="influencer-img-wrapper">
                            <img src="${profileUrl}" alt="${name}" loading="lazy" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';">
                        </div>
                        <h3 class="influencer-name">${name}</h3>
                        <div class="influencer-contact social-links">
                            ${socialHtml}
                        </div>
                    `;
                    influencersContainer.appendChild(card);
                });
            })
            .catch(err => {
                console.error('Error fetching influencers:', err);
                influencersContainer.innerHTML = '<p class="text-muted text-center">Unable to load influencers.</p>';
            });
    }
});
