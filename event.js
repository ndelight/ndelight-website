document.addEventListener('DOMContentLoaded', () => {
    console.log('Event JS Loaded'); // DEBUG
    const eventContainer = document.getElementById('event-full-details');
    console.log('Container found:', eventContainer); // DEBUG

    // Only run on the event details page
    if (!eventContainer) return;

    // Get Event ID from URL (Clean Path: /events/type-date)
    const getEventIdFromUrl = () => {
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

    // Updated to use Secure Unified Script
    const API_URL = 'https://script.google.com/macros/s/AKfycby6Vn7zF3wTGLWbchur1GGXbWy9w-X--_ry1Bc9Mwrss9s3Wpk_XPIhTHi8ZA6Lans_/exec';

    // Helper to fix Google Drive Images
    const driveLinkToDirect = (link) => {
        if (!link) return '';
        let id = '';
        const idMatch = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (idMatch && idMatch[1]) id = idMatch[1];
        const idParamMatch = link.match(/id=([a-zA-Z0-9_-]+)/);
        if (idParamMatch && idParamMatch[1]) id = idParamMatch[1];
        return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1920` : link;
    };

    fetch(`${API_URL}?action=get_events`)
        .then(response => response.json())
        .then(data => {
            console.log('Data fetched:', data.length, 'rows'); // DEBUG

            // Find the event
            const event = data.find(item => {
                // Normalize keys for ID check
                const type = item['Type'] || item['type'] || 'event';
                const date = item['Date'] || item['date'];

                // Prompt: "Each event must have an id field... format <type>-<yyyy-mm-dd>"
                // We check the 'id' column first.
                const rawId = item['id'] || item['Id'] || item['ID'];

                // Fallback ID generation to MATCH main.js exactly
                let generatedId = rawId;
                if (!generatedId && type && date) {
                    generatedId = `${type.toLowerCase().trim()}-${date}`;
                }

                console.log(`Checking ID: ${generatedId} vs URL: ${eventId}`); // Debug log
                return generatedId === eventId;
            });

            if (event) {
                renderEvent(event);
            } else {
                renderError('Event not found.');
            }
        })
        .catch(err => {
            console.error(err);
            renderError('Unable to load event details.');
        });

    function renderEvent(item) {
        // Normalizing data keys
        const title = item['Title '] || item['Title'] || item['title'] || 'Untitled Event';
        const date = item['Date'] || item['date'];
        const time = item['Time'] || item['time'] || '';
        const location = item['Location'] || item['location'] || '';
        const address = item['Address'] || item['address'] || '';
        const type = item['Type'] || item['type'] || 'Event';
        const description = item['Description'] || item['description'] || '';
        const imageRaw = item['Image'] || item['image'];
        const imageUrl = driveLinkToDirect(imageRaw) || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80';
        const insta = item['Insta'] || item['insta'];
        const tickets = item['Tickets'] || item['tickets'] || 'TBA';
        const formLink = item['Form'] || item['form'] || item['Link'] || 'index.html#contact'; // Fallback to contact section

        // Date formatting
        const dateObj = new Date(date);
        const dateStr = isNaN(dateObj) ? date : dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

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
                            <span class="meta-value">${time}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Location</span>
                            <span class="meta-value">${location}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Tickets</span>
                            <span class="meta-value">${tickets}</span>
                        </div>
                    </div>

                    ${address ? `<p class="event-address"><strong>Address:</strong> ${address}</p>` : ''}
                    
                    <div class="event-description">
                        <h3>About this Event</h3>
                        <p>${description || 'No description available for this event.'}</p>
                    </div>

                    <div class="event-actions">
                        <a href="/book/${eventId}" class="btn btn-primary">Book Tickets</a>
                        ${insta ? `<a href="${insta}" target="_blank" class="btn btn-outline" style="margin-left: 10px;">View on Instagram ↗</a>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    function renderError(msg) {
        eventContainer.innerHTML = `
            <div class="error-state">
                <h3>${msg}</h3>
                <a href="index.html#events" class="btn btn-outline" style="margin-top: 1rem;">Back to Events</a>
            </div>
        `;
    }
});
