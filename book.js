
document.addEventListener('DOMContentLoaded', () => {

    // --- Configuration ---
    // If you deploy the Google Apps Script, paste the Web App URL here.
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxecJKDwbwI-HTfJpmah4hDWaRlI4s4AWFDzdmK8uwrIVOfVSm-XRAhRI9VZXW8Lwhb/exec';

    // --- References ---
    const loadingState = document.getElementById('loading-state');
    const bookingCard = document.getElementById('booking-card');
    const backLink = document.getElementById('back-link');
    const form = document.getElementById('booking-form');
    const submitBtn = document.getElementById('submit-btn');

    // Display Fields
    const displayTitle = document.getElementById('summary-title');
    const displayDate = document.getElementById('summary-date');
    const displayLocation = document.getElementById('summary-location');
    const displayPrice = document.getElementById('summary-price');
    const displayTotal = document.getElementById('summary-total');
    const ticketsInput = document.getElementById('tickets');

    // --- Logic ---

    // 1. Get ID
    const getEventIdFromUrl = () => {
        const path = window.location.pathname;
        const match = path.match(/\/book\/([a-zA-Z0-9-]+)/);
        return match ? match[1] : null;
    };
    const eventId = getEventIdFromUrl();

    if (!eventId) {
        alert('Invalid Booking URL');
        window.location.href = '/';
        return;
    }

    // 2. Fetch Data
    // Updated to use Secure Unified Script
    const API_URL = 'https://script.google.com/macros/s/AKfycby6Vn7zF3wTGLWbchur1GGXbWy9w-X--_ry1Bc9Mwrss9s3Wpk_XPIhTHi8ZA6Lans_/exec';

    let eventData = null;
    let ticketPrice = 0;

    let currentEvent = null;
    // let ticketPrice = 0; // This line was a duplicate and is removed for clarity.

    fetch(`${API_URL}?action=get_events`)
        .then(res => res.json())
        .then(data => {
            currentEvent = data.find(item => {
                const type = item['Type'] || item['type'] || 'event';
                const date = item['Date'] || item['date'];
                const rawId = item['id'] || item['Id'] || item['ID'];

                let generatedId = rawId;
                if (!generatedId && type && date) {
                    generatedId = `${type.toLowerCase().trim()}-${date}`;
                }
                return generatedId === eventId;
            });

            if (currentEvent) {
                renderBookingPage(currentEvent);
            } else {
                alert('Event not found.');
                window.location.href = '/';
            }
        })
        .catch(err => {
            console.error(err);
            alert('Error loading event data.');
            window.location.href = '/';
        });

    function renderBookingPage(event) {
        // Populate Summary
        displayTitle.textContent = event['Title'] || event['Title '] || event['title'];

        const dateObj = new Date(event['Date'] || event['date']);
        displayDate.textContent = isNaN(dateObj) ? (event['Date'] || event['date']) : dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });

        displayLocation.textContent = event['Location'] || event['location'] || 'Verify via details';

        // Price Logic
        const rawPrice = event['ticket_price'] || event['Ticket Price'] || event['price'] || '0';
        ticketPrice = parseInt(rawPrice.toString().replace(/[^0-9]/g, '')) || 0;

        displayPrice.textContent = ticketPrice > 0 ? `₹${ticketPrice}` : 'Free';

        // Initial Total
        updateTotal();

        updateBackLink();

        // Show UI
        loadingState.style.display = 'none';
        bookingCard.style.display = 'grid';
        setTimeout(() => bookingCard.style.opacity = '1', 50);
    }

    function updateBackLink() {
        backLink.href = `/events/${eventId}`;
    }

    // Calculate Total
    function updateTotal() {
        const count = parseInt(ticketsInput.value) || 1;
        const total = count * ticketPrice;
        displayTotal.textContent = total > 0 ? `₹${total}` : 'Free';
    }

    ticketsInput.addEventListener('input', updateTotal);
    ticketsInput.addEventListener('change', updateTotal);

    // 3. Handle Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!GOOGLE_SCRIPT_URL) {
            alert('Configuration Error: GOOGLE_SCRIPT_URL is missing in book.js');
            return;
        }

        // Clean amount string "₹500" -> 500
        const totalAmount = parseInt(displayTotal.textContent.replace(/[^0-9]/g, '')) || 0;

        if (totalAmount <= 0) {
            alert("This event is free or has invalid pricing. Please contact support.");
            return;
        }

        const formData = {
            action: 'create_booking', // Flag for script
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            tickets: ticketsInput.value,
            event_id: eventId,
            event_title: displayTitle.textContent,
            total_amount: totalAmount
        };

        submitBtn.textContent = 'Generating Secure Payment Link...';
        submitBtn.disabled = true;

        try {
            // POST to Apps Script (Expecting JSON response)
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.result === 'success' && result.payment_url) {
                // Redirect to the dynamic Razorpay page
                window.location.href = result.payment_url;
            } else {
                throw new Error(result.error || 'Failed to generate payment link.');
            }

        } catch (err) {
            console.error('Booking Process Failed:', err);
            // Fallback error message
            alert('Unable to initiate payment. Please check your connection or contact support. (' + err.message + ')');
            submitBtn.textContent = 'Proceed to Payment';
            submitBtn.disabled = false;
        }
    });

});
