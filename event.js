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
        // Normalizing data keys not really needed with direct DB but good for safety
        const title = item.title;
        const date = item.date;
        const time = ''; // We didn't create a time column, maybe it's in date or description? 
        // Date is timestamptz so it has time.
        const location = item.location || '';
        const address = ''; // Not in schema
        const type = 'Event'; // Schema doesn't have type? Ah, user prompted for events table.
        // Check schema: title, description, date, location, price, capacity, image_url
        // No 'type' column in the schema I made. 
        // I'll default to 'Event'.
        const description = item.description || '';
        const imageUrl = item.image_url || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80';
        // const insta = item.insta; // No insta column in schema yet.

        // Date formatting
        const dateObj = new Date(date);
        const dateStr = isNaN(dateObj) ? date : dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = isNaN(dateObj) ? '' : dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

        const priceDisplay = item.price > 0 ? `₹${item.price}` : 'Free';

        eventContainer.innerHTML = `
                <div class="event-detail-header">
                    <img src="${imageUrl}" alt="${title}" class="event-detail-image">
                    <div class="event-detail-badge">${type}</div>
                </div>

                <div class="event-detail-content">
                    <h1 class="event-detail-title">${title}</h1>
                    
                    <div class="event-meta-grid">
                        <div class="meta-item">
                            <span class="meta-label">Date</span>
                            <span class="meta-value">${dateStr}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Time</span>
                            <span class="meta-value">${timeStr}</span>
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
                        <p>${description || 'No description available for this event.'}</p>
                    </div>

                    <div class="event-actions">
                ${new Date(item.date) < new Date()
                ? `<button class="btn btn-disabled" disabled style="opacity:0.6; cursor:not-allowed; border:1px solid #444; background:#333; color:#aaa; width:100%;">Event Ended</button>`
                : `<a href="/book.html?id=${item.id}" class="btn btn-primary" style="width:100%; text-align:center;">Book Tickets</a>`
            }
                ${item.external_link ? `<a href="${item.external_link}" target="_blank" class="btn btn-outline" style="margin-top:10px; width:100%; text-align:center; display:block;">View on Instagram 📸</a>` : ''}
            </div>        </div>
                </div>
            </div>
        `;
    }

    function renderError(msg) {
        eventContainer.innerHTML = `
            <div class="error-state">
                <h3>${msg}</h3>
                <a href="/#events" class="btn btn-outline" style="margin-top: 1rem;">Back to Events</a>
            </div>
        `;
    }
});
