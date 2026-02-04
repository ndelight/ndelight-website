
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
    let currentDiscountPercent = 0;
    let validatedCode = null;

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

        // Image Logic
        const summaryImage = document.getElementById('summary-image');
        if (summaryImage && event.image_url) {
            summaryImage.src = event.image_url;
            summaryImage.style.display = 'block';
        } else if (summaryImage) {
            // Fallback
            summaryImage.src = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80';
        }

        const dateObj = new Date(event.date);
        displayDate.textContent = isNaN(dateObj) ? event.date : dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });

        displayLocation.textContent = event.location || 'Verify via details';

        // Price Logic
        ticketPrice = parseFloat(event.price) || 0;
        displayPrice.textContent = ticketPrice > 0 ? `₹${ticketPrice}` : 'Free';

        // Add External Link Button if exists
        const summaryContent = document.querySelector('.booking-summary-content'); // Use new wrapper
        if (event.external_link && summaryContent) {
            const btn = document.createElement('a');
            btn.href = event.external_link;
            btn.target = "_blank";
            btn.className = "btn btn-outline";
            btn.style.marginTop = "1rem";
            btn.style.width = "100%";
            btn.style.textAlign = "center";
            btn.style.padding = "0.6rem";
            btn.style.fontSize = "0.9rem";
            btn.textContent = "View on Instagram 📸";
            summaryContent.appendChild(btn);
        }

        // Initial Total
        calculateTotal();

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
    function calculateTotal() {
        let val = ticketsInput.value;
        if (val === '') {
            displayTotal.textContent = '₹0';
            return;
        }
        let count = parseInt(val);
        if (isNaN(count) || count < 0) count = 0;

        let total = count * ticketPrice;

        // Apply Discount
        if (currentDiscountPercent > 0) {
            const discountAmount = Math.round(total * (currentDiscountPercent / 100));
            total = total - discountAmount;

            // Show Discount UI
            document.getElementById('summary-discount-row').style.display = 'flex';
            document.getElementById('summary-discount').textContent = `-₹${discountAmount} (${currentDiscountPercent}%)`;
        } else {
            document.getElementById('summary-discount-row').style.display = 'none';
        }

        displayTotal.textContent = total > 0 ? `₹${total}` : 'Free';
    }

    // Enforce limits on blur
    function validateTickets() {
        let count = parseInt(ticketsInput.value);
        if (isNaN(count) || count < 1) {
            count = 1;
        } else if (count > 10) {
            count = 10;
            alert("Maximum 10 tickets per booking.");
        }
        ticketsInput.value = count;
        calculateTotal();
    }

    ticketsInput.addEventListener('input', calculateTotal);
    ticketsInput.addEventListener('blur', validateTickets);


    // --- Promo Code Logic ---
    const promoDisplay = document.getElementById('promoCode');
    const applyPromoBtn = document.getElementById('applyPromoBtn');
    const promoMessage = document.getElementById('promo-message');

    applyPromoBtn.addEventListener('click', async () => {
        const code = promoDisplay.value.trim().toUpperCase();
        if (!code) return;

        applyPromoBtn.textContent = 'Checking...';
        applyPromoBtn.disabled = true;

        try {
            const { data, error } = await supabase
                .from('influencers')
                .select('code, discount_percent, active')
                .eq('code', code)
                .single();

            if (error || !data || !data.active) {
                throw new Error('Invalid or inactive code');
            }

            // Success
            validatedCode = data.code;
            currentDiscountPercent = data.discount_percent || 0;

            promoMessage.textContent = `Success! Code applied. ${currentDiscountPercent > 0 ? currentDiscountPercent + '% OFF' : ''}`;
            promoMessage.style.color = '#4cd964';

            // Recalculate
            calculateTotal();

        } catch (err) {
            console.log('Promo Error:', err);
            validatedCode = null;
            currentDiscountPercent = 0;
            promoMessage.textContent = 'Invalid Promocode';
            promoMessage.style.color = '#ff6b6b';
            calculateTotal();
        } finally {
            applyPromoBtn.textContent = 'Apply';
            applyPromoBtn.disabled = false;
        }
    });


    // 3. Handle Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Re-validate code if user typed but didn't click Apply
        const enteredCode = promoDisplay.value.trim().toUpperCase();
        if (enteredCode && enteredCode !== validatedCode) {
            // Auto-click apply? Or just warn. Let's warn.
            alert('Please click "Apply" to validate your promo code first.');
            return;
        }

        const customerInfo = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
        };

        const influencerCode = validatedCode; // Use validated one

        const totalAmount = parseInt(displayTotal.textContent.replace(/[^0-9]/g, '')) || 0;

        // If free, handle differently?
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
                        status: 'paid', // Instant success for free
                        influencer_code: influencerCode
                    }])
                    .select()
                    .single();

                if (error) throw error;

                // --- TRIGGER EMAIL FOR FREE BOOKING ---
                try {
                    if (data.id) {
                        await fetch('http://localhost:3000/api/send-booking-email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ booking_id: data.id })
                        });
                    }
                } catch (err) {
                    console.error('Free booking email trigger failed:', err);
                }
                // -------------------------------------

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
                    influencer_code: influencerCode, // Send validated code
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
                key: orderData.key_id,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "NDelight Events",
                description: displayTitle.textContent,
                image: "/logo.png",
                order_id: orderData.order_id,
                handler: async function (response) {
                    console.log('Payment Success:', response);

                    // Show temporary success UI to prevent quick redirect before email trigger
                    submitBtn.textContent = 'Verifying...';

                    // --- TRIGGER EMAIL ---
                    try {
                        if (orderData.booking_id) {
                            await fetch('http://localhost:3000/api/send-booking-email', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ booking_id: orderData.booking_id })
                            });
                        }
                    } catch (err) {
                        console.error('Email trigger failed:', err);
                    }
                    // ---------------------

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
