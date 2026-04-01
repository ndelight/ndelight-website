document.addEventListener('DOMContentLoaded', () => {
    const productsWrap = document.getElementById('water-products');
    const form = document.getElementById('water-checkout-form');
    const submitBtn = document.getElementById('checkout-btn');
    const cartList = document.getElementById('cart-list');
    const cartTotalEl = document.getElementById('cart-total');

    if (!form || !productsWrap) return;

    let products = [
        { id: 'w250', name: 'NDelight Water 250ml', sizeMl: 250, unitPrice: 8, image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=600&q=80' },
        { id: 'w500', name: 'NDelight Water 500ml', sizeMl: 500, unitPrice: 12, image: 'https://images.unsplash.com/photo-1606168094336-48f6f7aa8f3a?auto=format&fit=crop&w=600&q=80' },
        { id: 'w1000', name: 'NDelight Water 1000ml', sizeMl: 1000, unitPrice: 18, image: 'https://images.unsplash.com/photo-1616118132534-381148898bb4?auto=format&fit=crop&w=600&q=80' },
    ];
    const cart = {};

    // Payment method UI: change CTA text without changing behavior.
    const paymentRadios = form.querySelectorAll('input[name="water-payment-method"]');
    if (paymentRadios && paymentRadios.length) {
        const syncButtonText = () => {
            const selected =
                form.querySelector('input[name="water-payment-method"]:checked')?.value || 'razorpay';
            submitBtn.textContent = selected === 'cash' ? 'Place Order' : 'Proceed to Payment';
        };
        paymentRadios.forEach((r) => r.addEventListener('change', syncButtonText));
        syncButtonText();
    }

    async function fetchWithFallback(urls, options = {}) {
        let lastResponse = null;
        for (const url of urls) {
            try {
                const response = await fetch(url, options);
                if (response.status !== 404) return response;
                lastResponse = response;
            } catch (err) {
                // Try next URL
            }
        }
        return lastResponse || new Response('', { status: 404, statusText: 'Not Found' });
    }

    function getSelectedQty(card) {
        const activeBtn = card.querySelector('.bulk-btn.active');
        const customInput = card.querySelector('.bulk-custom');
        if (customInput && customInput.value) {
            const custom = parseInt(customInput.value, 10);
            if (!Number.isNaN(custom) && custom > 0) return custom;
        }
        if (activeBtn) return parseInt(activeBtn.dataset.qty, 10);
        return 100;
    }

    function renderCart() {
        const entries = Object.values(cart);
        if (entries.length === 0) {
            cartList.innerHTML = '<div class="cart-empty">No items in cart.</div>';
            cartTotalEl.textContent = '0';
            return;
        }
        let total = 0;
        cartList.innerHTML = entries.map((item) => {
            const line = item.qty * item.unitPrice;
            total += line;
            return `<div class="cart-item">
                        <div>
                            <div>${item.name}</div>
                            <div style="font-size:.75rem;color:#94a3b8;">Qty: ${item.qty}</div>
                            <div class="cart-item-actions">
                                <button type="button" class="cart-mini-btn cart-dec" data-id="${item.id}">-</button>
                                <button type="button" class="cart-mini-btn cart-inc" data-id="${item.id}">+</button>
                                <button type="button" class="cart-mini-btn cart-remove" data-id="${item.id}">Remove</button>
                            </div>
                        </div>
                        <strong>₹${line}</strong>
                    </div>`;
        }).join('');
        cartTotalEl.textContent = String(total);

        cartList.querySelectorAll('.cart-dec').forEach((btn) => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                if (!cart[id]) return;
                cart[id].qty = Math.max(1, (cart[id].qty || 1) - 1);
                renderCart();
            });
        });
        cartList.querySelectorAll('.cart-inc').forEach((btn) => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                if (!cart[id]) return;
                cart[id].qty = (cart[id].qty || 1) + 1;
                renderCart();
            });
        });
        cartList.querySelectorAll('.cart-remove').forEach((btn) => {
            btn.addEventListener('click', () => {
                delete cart[btn.dataset.id];
                renderCart();
            });
        });
    }

    function addToCart(product, qty, button) {
        cart[product.id] = { ...product, qty };
        renderCart();
        if (button) {
            const original = button.textContent;
            button.textContent = 'Added';
            button.disabled = true;
            setTimeout(() => {
                button.textContent = original;
                button.disabled = false;
            }, 800);
        }
    }

    function renderProducts() {
        productsWrap.innerHTML = products.map((p) => `
        <article class="product" data-id="${p.id}">
            <img src="${p.image}" alt="${p.name}">
            <h3>${p.name}</h3>
            <div class="price">₹${p.unitPrice} / bottle</div>
            <div class="bulk-buttons">
                <button type="button" class="bulk-btn active" data-qty="100">100</button>
                <button type="button" class="bulk-btn" data-qty="200">200</button>
                <button type="button" class="bulk-btn" data-qty="500">500</button>
            </div>
            <div class="custom-row">
                <span style="font-size:.78rem;color:#6b7280;">Custom</span>
                <input class="bulk-custom" type="number" min="1" placeholder="Qty">
            </div>
            <div class="action-row">
                <button type="button" class="btn btn-cart add-cart">Add to Cart</button>
                <button type="button" class="btn btn-buy buy-now">Buy Now</button>
            </div>
        </article>
    `).join('');

        productsWrap.querySelectorAll('.product').forEach((card) => {
            const product = products.find((p) => p.id === card.dataset.id);
            card.querySelectorAll('.bulk-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                    card.querySelectorAll('.bulk-btn').forEach((b) => b.classList.remove('active'));
                    btn.classList.add('active');
                    const custom = card.querySelector('.bulk-custom');
                    if (custom) custom.value = '';
                });
            });
            card.querySelector('.add-cart').addEventListener('click', () => {
                addToCart(product, getSelectedQty(card), card.querySelector('.add-cart'));
            });
            card.querySelector('.buy-now').addEventListener('click', () => {
                addToCart(product, getSelectedQty(card), card.querySelector('.buy-now'));
                form.scrollIntoView({ behavior: 'smooth', block: 'start' });
                document.getElementById('checkout-btn').focus();
            });
        });
    }

    (async () => {
        try {
            const response = await fetchWithFallback([
                '/api/get-water-products',
                '/api/water/get-products',
            ]);
            if (!response.ok) throw new Error('Failed');
            const payload = await response.json();
            if (payload.products && payload.products.length > 0) {
                products = payload.products.map((p) => ({
                    id: `w${p.size_ml}`,
                    name: p.title,
                    sizeMl: parseInt(p.size_ml, 10),
                    unitPrice: Number(p.unit_price),
                    image: p.image_url || 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=600&q=80',
                }));
            }
        } catch (err) {
            console.warn('Using fallback water products');
        } finally {
            renderProducts();
        }
    })();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('water-name').value.trim();
        const phone = document.getElementById('water-phone').value.trim();
        const email = document.getElementById('water-email').value.trim();
        const address = document.getElementById('water-address').value.trim();
        const paymentMethod =
            form.querySelector('input[name="water-payment-method"]:checked')?.value || 'razorpay';

        const cartItems = Object.values(cart);
        if (cartItems.length === 0) {
            alert('Please add at least one water product to cart.');
            return;
        }

        if (!name || !phone || !address) {
            alert('Please fill in Name, Phone and Address.');
            return;
        }

        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent =
            paymentMethod === 'cash' ? 'Placing order...' : 'Creating payment order...';

        try {
            const response = await fetchWithFallback(
                ['/api/create-water-razorpay-order', '/api/water/create-order'],
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        customer_info: { name, phone, email: email || null, address },
                        items: cartItems.map((i) => ({ size_ml: i.sizeMl, qty: i.qty })),
                        design_url: null,
                        payment_method: paymentMethod,
                    }),
                }
            );

            const raw = await response.text();
            let parsed = {};
            try { parsed = raw ? JSON.parse(raw) : {}; } catch (_) { parsed = {}; }
            if (!response.ok) {
                throw new Error(parsed.message || raw || 'Unable to create payment order');
            }
            const orderData = parsed;

            // Cash payment: backend will only create the DB row (no Razorpay checkout).
            if (paymentMethod === 'cash') {
                window.location.href = `/success.html?water_order_id=${orderData.water_order_id || ''}`;
                return;
            }

            const rzp = new Razorpay({
                key: orderData.key_id,
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'NDelight Water',
                description: 'Bulk water bottle order',
                order_id: orderData.order_id,
                prefill: orderData.prefill,
                theme: { color: '#0ea5e9' },
                handler: function (rpRes) {
                    window.location.href = `/success.html?water_order_id=${orderData.water_order_id}&payment_id=${rpRes.razorpay_payment_id}`;
                },
                modal: {
                    ondismiss: function () {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                    },
                },
            });
            rzp.open();
        } catch (err) {
            console.error('Unexpected water order error:', err);
            alert(err.message || 'Something went wrong. Please try again.');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
});

