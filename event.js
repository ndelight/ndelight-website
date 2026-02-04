import { supabase } from './supabase.js'

document.addEventListener('DOMContentLoaded', () => {
    console.log('Event JS Loaded'); // DEBUG
    const eventContainer = document.getElementById('event-full-details');
    console.log('Container found:', eventContainer); // DEBUG

    // Only run on the event details page
    if (!eventContainer) return;

    // Get Event ID from URL matches query param or path
    const getEventIdFromUrl = () => {
        // First check query param (new standard)
        const params = new URLSearchParams(window.location.search);
        if (params.get('id')) return params.get('id');

        // Fallback to path match (legacy support if redirects work)
        const path = window.location.pathname;
        const match = path.match(/\/events\/([a-zA-Z0-9-]+)/);
        return match ? match[1] : null;
    };

    const eventId = getEventIdFromUrl();
    console.log('URL ID:', eventId); // DEBUG

    if (!eventId) {
        console.error('No ID found in URL');
        renderError('No event specified.');
        return;
    }

    async function fetchEventDetails() {
        try {
            // Fetch Single Event from Supabase
            const { data: event, error } = await supabase
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();

            if (error) throw error;

            if (event) {
                renderEvent(event);
            } else {
                renderError('Event not found.');
            }
        } catch (err) {
            console.error('Error fetching event:', err);
            renderError('Unable to load event details.');
        }
    }

    fetchEventDetails();

    function renderEvent(item) {
        const title = item.title;
        const date = item.date;
        const description = item.description || '';
        const imageUrl = item.image_url || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80';
        const type = 'Event';
        const location = item.location || 'TBA';
        const priceDisplay = item.price > 0 ? `₹${item.price}` : 'Free';
        const externalLink = item.external_link;

        // Date formatting
        const dateObj = new Date(date);
        const dateStr = isNaN(dateObj) ? date : dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = isNaN(dateObj) ? '' : dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

        const isEnded = new Date(item.date) < new Date();

        // New Premium Structure
        eventContainer.innerHTML = `
            <div class="event-premium-wrapper fade-in-up">
                <!-- Visuals -->
                <div class="event-visuals">
                    <span class="event-type-badge">${type}</span>
                    <img src="${imageUrl}" alt="${title}" class="event-main-image">
                </div>

                <!-- Info -->
                <div class="event-info">
                    <h1 class="event-title">${title}</h1>

                    <div class="event-meta-grid">
                        <div class="meta-item">
                            <span class="meta-label">Date</span>
                            <span class="meta-value">${dateStr}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Time</span>
                            <span class="meta-value">${timeStr || 'TBA'}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Location</span>
                            <span class="meta-value">${location}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Price</span>
                            <span class="meta-value">${priceDisplay}</span>
                        </div>
                    </div>

                    <div class="event-description">
                        <h3>About this Event</h3>
                        <p>${description}</p>
                    </div>

                    <div class="event-actions">
                        ${isEnded
                ? `<button class="btn btn-disabled btn-block" disabled>Event Ended</button>`
                : `<a href="/book.html?id=${item.id}" class="btn btn-primary btn-block">Book Tickets</a>`
            }
                        
                        ${externalLink
                ? `<a href="${externalLink}" target="_blank" class="btn btn-outline btn-block">View on Instagram 📸</a>`
                : ''
            }
                    </div>
                </div>
            </div>
        `;
    }

    function renderError(msg) {
        eventContainer.innerHTML = `
            <div class="error-state" style="padding: 4rem 0; text-align: center;">
                <h3 style="color: #aaa; margin-bottom: 1rem;">${msg}</h3>
                <a href="/#events" class="btn btn-outline">Back to Events</a>
            </div>
        `;
    }
});
