
import { supabase } from './supabase.js'

document.addEventListener('DOMContentLoaded', () => {

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
        const params = new URLSearchParams(window.location.search);
        if (params.get('id')) return params.get('id');

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

    // 2. Fetch Data using Supabase
    let ticketPrice = 0;

    async function fetchEventData() {
        try {
            const { data: event, error } = await supabase
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();

            if (error || !event) {
                console.error(error);
                alert('Event not found.');
                window.location.href = '/';
                return;
            }

            renderBookingPage(event);
        } catch (err) {
            console.error(err);
            alert('Error loading event data.');
            window.location.href = '/';
        }
    }

    fetchEventData();

    function renderBookingPage(event) {
        // Populate Summary
        displayTitle.textContent = event.title;

        const dateObj = new Date(event.date);
        displayDate.textContent = isNaN(dateObj) ? event.date : dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });

        displayLocation.textContent = event.location || 'Verify via details';

        // Price Logic
        ticketPrice = parseFloat(event.price) || 0;
        displayPrice.textContent = ticketPrice > 0 ? `₹${ticketPrice}` : 'Free';

        // Add External Link Button if exists
        if (event.external_link) {
            const btnContainer = document.createElement('div');
            btnContainer.style.marginTop = '10px';
            btnContainer.innerHTML = `<a href="${event.external_link}" target="_blank" class="btn btn-outline" style="font-size:0.9rem; padding:8px 12px; display:inline-block; border-color:#ffd700; color:#ffd700;">View on Instagram 📸</a>`;
            // Insert after title or somewhere appropriate. Let's append to summary container or just after title.
            // Actually, inserting it into the Summary Grid might be messy.
            // Let's replace the arrow logic in Title first.
        }

        // Better Placement:
        const summaryCard = document.querySelector('.summary-card');
        if (event.external_link && summaryCard) {
            const btn = document.createElement('a');
            btn.href = event.external_link;
            btn.target = "_blank";
            btn.className = "btn btn-outline";
            btn.style.marginTop = "1rem";
            btn.style.width = "100%";
            btn.style.textAlign = "center";
            btn.textContent = "View on Instagram 📸";
            summaryCard.appendChild(btn);
        }

        // Initial Total
        updateTotal();

        updateBackLink();

        // Show UI
        loadingState.style.display = 'none';
        bookingCard.style.display = 'grid';
        setTimeout(() => bookingCard.style.opacity = '1', 50);
    }

    function updateBackLink() {
        backLink.href = `/event.html?id=${eventId}`;
    }

    // Calculate Total
    function updateTotal() {
        // Enforce max tickets limits if needed or just use input
        let count = parseInt(ticketsInput.value) || 1;
        if (count < 1) count = 1;
        ticketsInput.value = count;

        const total = count * ticketPrice;
        displayTotal.textContent = total > 0 ? `₹${total}` : 'Free';
    }

    ticketsInput.addEventListener('input', updateTotal);
    ticketsInput.addEventListener('change', updateTotal);

    // 3. Handle Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const customerInfo = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
        };

        const influencerCode = document.getElementById('promoCode').value.trim() || null;

        const totalAmount = parseInt(displayTotal.textContent.replace(/[^0-9]/g, '')) || 0;

        // If free, handle differently? For now, let's assume all paid or we skip razorpay
        if (totalAmount <= 0) {
            // Free Booking Logic
            submitBtn.textContent = 'Processing Free Booking...';
            submitBtn.disabled = true;

            try {
                const { data, error } = await supabase
                    .from('bookings')
                    .insert([{
                        event_id: eventId,
                        customer_name: customerInfo.name,
                        customer_email: customerInfo.email,
                        customer_phone: customerInfo.phone,
                        amount: 0,
                        status: 'paid',
                        influencer_code: influencerCode
                    }])
                    .select()
                    .single();

                if (error) throw error;

                // Redirect to success
                window.location.href = `/success.html?booking_id=${data.id}&payment_id=free_event`;

            } catch (err) {
                console.error('Free booking error:', err);
                alert('Booking failed. ' + err.message);
                submitBtn.textContent = 'Book Ticket';
                submitBtn.disabled = false;
            }
            return;
        }





        submitBtn.textContent = 'Processing Payment...';
        submitBtn.disabled = true;

        try {
            // 1. Create Order via Vercel API
            const response = await fetch('/api/create-razorpay-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event_id: eventId,
                    influencer_code: influencerCode,
                    customer_info: customerInfo
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Order creation failed');
            }

            const orderData = await response.json();

            // 2. Open Razorpay Checkout
            const options = {
                key: orderData.key_id, // Public Key from API response
                amount: orderData.amount,
                currency: orderData.currency,
                name: "NDelight Events",
                description: displayTitle.textContent,
                image: "/logo.png", // Ensure logo exists or use placeholder
                order_id: orderData.order_id,

                handler: function (response) {
                    // Payment Success!
                    // Status is updated via Webhook, but we can redirect to success page
                    window.location.href = `/success.html?booking_id=${orderData.booking_id}&payment_id=${response.razorpay_payment_id}`;
                },
                prefill: orderData.prefill,
                theme: {
                    color: "#ffd700"
                },
                modal: {
                    ondismiss: function () {
                        submitBtn.textContent = 'Proceed to Payment';
                        submitBtn.disabled = false;
                    }
                }
            };

            const rzp1 = new Razorpay(options);
            rzp1.on('payment.failed', function (response) {
                alert("Payment Failed: " + response.error.description);
                submitBtn.textContent = 'Proceed to Payment';
                submitBtn.disabled = false;
            });

            rzp1.open();

        } catch (err) {
            console.error('Booking Process Failed:', err);
            alert('Unable to initiate payment: ' + err.message);
            submitBtn.textContent = 'Proceed to Payment';
            submitBtn.disabled = false;
        }
    });

});
