import { supabase } from '../supabase.js'

let currentEvents = [] // Store for quick access

// Auth Check
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        window.location.href = '/login.html'
        return
    }

    // Check Role
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, full_name, email')
        .eq('id', session.user.id)
        .single()

    if (error) {
        console.error('Profile Fetch Error:', error)
        alert(`Error fetching profile:\nCode: ${error.code}\nMessage: ${error.message}\nDetails: ${error.details || 'None'}`)
        return
    }

    if (!profile) {
        alert('Profile not found. Please run the fix_profiles.sql script again.')
        return
    }

    if (profile.role !== 'admin') {
        alert(`Access Denied. Your role is '${profile.role}', but 'admin' is required.\n\nPlease update your role in the Supabase 'profiles' table.`)
        window.location.href = '/'
        return
    }

    document.getElementById('userInfo').textContent = `Logged in as: ${profile.full_name || profile.email}`
}

checkAuth()

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await supabase.auth.signOut()
    window.location.href = '/login.html'
})

// Section Navigation (Simple SPA feel)
window.showSection = async (section) => {
    const contentDiv = document.getElementById('dynamicContent')
    contentDiv.innerHTML = 'Loading...'

    if (section === 'events') {
        await loadEvents(contentDiv)
    } else if (section === 'water') {
        await loadWater(contentDiv)
    } else if (section === 'influencers') {
        await loadInfluencers(contentDiv)
    } else if (section === 'bookings') {
        await loadBookings(contentDiv)
    } else if (section === 'pending') {
        await loadPending(contentDiv)
    }
}

// Pending Approval Logic
async function loadPending(container) {
    const { data: pendingUsers, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'pending_influencer')

    let html = '<h3>Pending Influencer Applications</h3>'
    if (pendingUsers && pendingUsers.length > 0) {
        html += '<table><thead><tr><th>Name</th><th>Email</th><th>Actions</th></tr></thead><tbody>'
        pendingUsers.forEach(user => {
            html += `<tr>
            <td>${user.full_name || 'Unknown'}</td>
            <td>${user.email}</td>
            <td>
                <button class="btn-action" style="font-size:0.8rem; margin-right:10px;" onclick="window.approveInfluencer('${user.id}', '${user.full_name}', this)">Approve ✅</button>
                <button class="btn-logout" style="font-size:0.8rem;" onclick="window.rejectInfluencer('${user.id}', this)">Reject ❌</button>
            </td>
        </tr>`
        })
        html += '</tbody></table>'
    } else {
        html += '<p>No pending applications.</p>'
    }
    container.innerHTML = html
}

window.approveInfluencer = async (userId, fullName, btnElement) => {
    if (!confirm(`Approve ${fullName} as an Influencer?`)) return

    if (btnElement) {
        btnElement.disabled = true;
        btnElement.textContent = 'Processing...';
    }

    // 1. Generate Code (First Letter + Second Name Letter (or duplicate first) + Last 4 of UUID)
    const nameParts = (fullName || 'USER').trim().split(/\s+/);
    const nameOne = nameParts[0] ? nameParts[0][0].toUpperCase() : 'U';
    const nameTwo = nameParts.length > 1 ? nameParts[1][0].toUpperCase() : nameOne; // Duplicate first if no second name
    const shortInitials = (nameOne + nameTwo).replace(/[^A-Z]/g, 'X'); // Fallback for special chars

    const uniqueSuffix = userId.split('-').pop().slice(-4).toUpperCase();
    const code = `${shortInitials}${uniqueSuffix}`;

    // 2. Create Influencer Record
    const { error: infError } = await supabase.from('influencers').insert([{
        id: userId,
        code: code,
        active: true
    }])

    if (infError) {
        alert('Error creating influencer record: ' + infError.message)
        if (btnElement) {
            btnElement.disabled = false;
            btnElement.textContent = 'Approve ✅';
        }
        return
    }

    // 3. Update Profile Role
    const { error: profileError } = await supabase.from('profiles').update({ role: 'influencer' }).eq('id', userId)

    if (profileError) {
        alert('Error updating profile: ' + profileError.message)
    } else {
        //alert(`Approved! Code: ${code}`) // Removed alert for smoother flow, or keep it short
        await loadPending(document.getElementById('dynamicContent'))
    }
}

window.rejectInfluencer = async (userId, btnElement) => {
    if (!confirm('Reject this application? They will become a normal user.')) return

    if (btnElement) {
        btnElement.disabled = true;
        btnElement.textContent = '...';
    }

    // Demote to 'user'
    const { error } = await supabase.from('profiles').update({ role: 'user' }).eq('id', userId)

    if (error) {
        alert('Error: ' + error.message)
        if (btnElement) {
            btnElement.disabled = false;
            btnElement.textContent = 'Reject ❌';
        }
    } else {
        await loadPending(document.getElementById('dynamicContent'))
    }
}

// Data Loaders
async function loadEvents(container) {
    // 1. Fetch Events
    const { data: events, error } = await supabase.from('events').select('*').order('date', { ascending: true })

    if (error) {
        container.innerHTML = `<p style="color:red">Error loading events: ${error.message}</p>`
        return
    }

    // 2. Fetch Featured Events to check status
    const { data: featuredData, error: featError } = await supabase.from('featured_events').select('event_id')
    if (featError) console.error('Error fetching featured:', featError)

    // Create a Set for O(1) lookup
    const featuredSet = new Set((featuredData || []).map(f => f.event_id))

    currentEvents = events || []

    let html = '<h3>All Events</h3><button class="btn-action" style="margin-bottom:1rem;" onclick="window.openEventModal(null)">+ Add New Event</button>'
    if (currentEvents.length > 0) {
        html += '<table><thead><tr><th>Featured</th><th>Title</th><th>Date</th><th>Price</th><th>Actions</th></tr></thead><tbody>'
        currentEvents.forEach(ev => {
            const isFeatured = featuredSet.has(ev.id)
            const starIcon = isFeatured ? '⭐' : '☆' // Filled vs Empty Star
            const starClass = isFeatured ? 'featured-star active' : 'featured-star'

            html += `<tr>
            <td style="text-align:center; font-size:1.5rem; cursor:pointer; user-select:none;" 
                onclick="event.stopPropagation(); window.toggleFeatured('${ev.id}', this)" 
                title="${isFeatured ? 'Remove from Featured' : 'Add to Featured'}">
                ${starIcon}
            </td>
            <td>${ev.title}</td>
            <td>${new Date(ev.date).toLocaleDateString()}</td>
            <td>₹${ev.price}</td>
            <td>
                <button class="btn-action" style="font-size:0.7rem; margin-right:5px;" onclick="window.openEventModal('${ev.id}')">Edit</button>
                <button class="btn-logout" style="font-size:0.7rem;" onclick="window.deleteEvent('${ev.id}')">Delete</button>
            </td>
        </tr>`
        })
        html += '</tbody></table>'
    } else {
        html += '<p>No events found.</p>'
    }
    container.innerHTML = html
}

// Modal Logic
window.openEventModal = (id) => {
    const modal = document.getElementById('eventModal')
    const title = document.getElementById('modalTitle')
    document.getElementById('modalError').style.display = 'none'

    if (id) {
        // Edit Mode
        const ev = currentEvents.find(e => e.id === id)
        if (!ev) return

        title.textContent = 'Edit Event'
        document.getElementById('eventId').value = ev.id
        document.getElementById('evTitle').value = ev.title
        // Format for datetime-local: YYYY-MM-DDTHH:MM
        const d = new Date(ev.date)
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset()) // Adjust to local
        document.getElementById('evDate').value = d.toISOString().slice(0, 16)

        document.getElementById('evDescription').value = ev.description || '' // Populate
        document.getElementById('evLocation').value = ev.location || ''
        document.getElementById('evPrice').value = ev.price || 0
        document.getElementById('evImageUrl').value = ev.image_url || ''
        document.getElementById('evImageFile').value = '' // Clear file input

        const info = document.getElementById('evImagePreviewInfo')
        if (ev.image_url) {
            info.innerHTML = `Current: <a href="${ev.image_url}" target="_blank" style="color:#ffd700">View Image</a> (Upload new to replace)`
        } else {
            info.textContent = 'No image currently set.'
        }
    } else {
        // Add Mode
        title.textContent = 'Add New Event'
        document.getElementById('eventId').value = ''
        document.getElementById('evTitle').value = ''
        document.getElementById('evDate').value = ''
        document.getElementById('evDescription').value = '' // Reset
        document.getElementById('evLocation').value = ''
        document.getElementById('evPrice').value = ''
        document.getElementById('evImageUrl').value = ''
        document.getElementById('evImageFile').value = ''
        document.getElementById('evImagePreviewInfo').textContent = ''
    }

    modal.classList.add('active')
}

window.closeEventModal = () => {
    document.getElementById('eventModal').classList.remove('active')
}

window.saveEvent = async () => {
    const id = document.getElementById('eventId').value
    const title = document.getElementById('evTitle').value
    const date = document.getElementById('evDate').value
    const description = document.getElementById('evDescription').value
    const location = document.getElementById('evLocation').value
    const price = document.getElementById('evPrice').value

    // Image logic
    const fileInput = document.getElementById('evImageFile')
    const hiddenUrlInput = document.getElementById('evImageUrl')
    let finalImageUrl = hiddenUrlInput.value // Default to existing URL

    // Upload if file selected
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0]
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `events/${fileName}`

        // Show generic loading state
        document.getElementById('evImagePreviewInfo').textContent = 'Uploading image...'

        const { error: uploadError } = await supabase.storage
            .from('event-images')
            .upload(filePath, file)

        if (uploadError) {
            alert('Image Upload Failed: ' + uploadError.message)
            document.getElementById('evImagePreviewInfo').textContent = 'Upload failed.'
            return
        }

        const { data: { publicUrl } } = supabase.storage
            .from('event-images')
            .getPublicUrl(filePath)

        finalImageUrl = publicUrl
    }

    if (!title || !date || !price) {
        const err = document.getElementById('modalError')
        err.textContent = 'Please fill in Title, Date and Price.'
        err.style.display = 'block'
        return
    }

    const payload = {
        title,
        date: new Date(date).toISOString(),
        description,
        location,
        price,
        image_url: finalImageUrl
    }

    let error
    if (id) {
        // Update
        const res = await supabase.from('events').update(payload).eq('id', id)
        error = res.error
    } else {
        // Insert
        const res = await supabase.from('events').insert([payload])
        error = res.error
    }

    if (error) {
        const err = document.getElementById('modalError')
        err.textContent = 'Save Error: ' + error.message
        err.style.display = 'block'
    } else {
        window.closeEventModal()
        // Reload list
        const contentDiv = document.getElementById('dynamicContent')
        await loadEvents(contentDiv)
    }
}

window.deleteEvent = async (id) => {
    if (!confirm('Are you sure you want to delete this event? This cannot be undone.')) return

    const { error } = await supabase.from('events').delete().eq('id', id)

    if (error) {
        alert('Delete Failed: ' + error.message)
    } else {
        // Reload list
        const contentDiv = document.getElementById('dynamicContent')
        await loadEvents(contentDiv)
    }
}




// TOGGLE FEATURED LOGIC
window.toggleFeatured = async (eventId, starElement) => {
    console.log('toggleFeatured clicked:', eventId) // DEBUG
    // Visual Feedback immediately
    const isCurrentlyFeatured = starElement.textContent.trim() === '⭐'
    starElement.textContent = '...' // Loading state
    starElement.style.opacity = '0.5'

    try {
        if (isCurrentlyFeatured) {
            // REMOVE
            const { error } = await supabase
                .from('featured_events')
                .delete()
                .eq('event_id', eventId)

            if (error) throw error

        } else {
            // ADD
            // 1. Get max order
            const { data: maxOrderData, error: maxError } = await supabase
                .from('featured_events')
                .select('display_order')
                .order('display_order', { ascending: false })
                .limit(1)

            if (maxError && maxError.code !== 'PGRST116') { // Ignore empty result error
                console.error('Max Order Error', maxError)
            }

            const nextOrder = (maxOrderData && maxOrderData.length > 0) ? (maxOrderData[0].display_order + 1) : 1

            // 2. Insert
            const { error: insertError } = await supabase
                .from('featured_events')
                .insert([{ event_id: eventId, display_order: nextOrder }])

            if (insertError) throw insertError
        }

        // Success - Reload to ensure state execution
        await loadEvents(document.getElementById('dynamicContent'))

    } catch (err) {
        alert('Action Failed: ' + err.message)
        // Revert visual on error (though loadEvents will overwrite)
        starElement.textContent = isCurrentlyFeatured ? '⭐' : '☆'
        starElement.style.opacity = '1'
    }
}

// -------------------------------------------------------------
// PATCH: Add Email Trigger to Approve Function
// (Re-defining approveInfluencer to include email logic)
window.approveInfluencer = async (userId, fullName, btnElement) => {
    if (!confirm(`Approve ${fullName} as an Influencer?`)) return

    if (btnElement) {
        btnElement.disabled = true;
        btnElement.textContent = 'Processing...';
    }

    // 1. Generate Code
    const nameParts = (fullName || 'USER').trim().split(/\s+/);
    const nameOne = nameParts[0] ? nameParts[0][0].toUpperCase() : 'U';
    const nameTwo = nameParts.length > 1 ? nameParts[1][0].toUpperCase() : nameOne;
    const shortInitials = (nameOne + nameTwo).replace(/[^A-Z]/g, 'X');

    const uniqueSuffix = userId.split('-').pop().slice(-4).toUpperCase();
    const code = `${shortInitials}${uniqueSuffix}`;

    // 2. Create Influencer Record
    const { error: infError } = await supabase.from('influencers').insert([{
        id: userId,
        code: code,
        active: true
    }])

    if (infError) {
        alert('Error creating influencer record: ' + infError.message)
        if (btnElement) {
            btnElement.disabled = false;
            btnElement.textContent = 'Approve ✅';
        }
        return
    }

    // 3. Update Profile Role
    const { error: profileError } = await supabase.from('profiles').update({ role: 'influencer' }).eq('id', userId)

    if (profileError) {
        alert('Error updating profile: ' + profileError.message)
    } else {
        // --- TRIGGER EMAIL ---
        try {
            await fetch('/api/send-approval-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ influencer_id: userId })
            });
            console.log('Approval email triggered');
        } catch (err) {
            console.error('Email trigger failed', err);
        }
        // ---------------------
        await loadPending(document.getElementById('dynamicContent'))
    }
}


async function loadInfluencers(container) {
    const { data: influencers } = await supabase.from('influencers').select('*, profiles(full_name, email)')

    let html = '<h3>Influencers</h3>'
    if (influencers && influencers.length > 0) {
        html += '<table><thead><tr><th>Name</th><th>Email</th><th>Code</th><th>Active</th><th>Actions</th></tr></thead><tbody>'
        influencers.forEach(inf => {
            const name = inf.profiles ? inf.profiles.full_name : 'Unknown'
            const email = inf.profiles ? inf.profiles.email : 'No Email'
            html += `<tr>
            <td>${name}</td>
            <td>${email}</td>
            <td>${inf.code}</td>
            <td>${inf.active ? 'Yes' : 'No'}</td>
            <td>
                <button class="btn-delete" onclick="deleteInfluencer('${inf.id}')">Delete</button>
            </td>
        </tr>`
        })
        html += '</tbody></table>'
    } else {
        html += '<p>No influencers found.</p>'
    }
    container.innerHTML = html
}

window.deleteBooking = async (id) => {
    if (!confirm('Are you sure you want to delete this booking?')) return
    const { error } = await supabase.from('bookings').delete().eq('id', id)
    if (error) alert('Delete Failed: ' + error.message)
    else await loadBookings(document.getElementById('dynamicContent'))
}

async function loadBookings(container) {
    // Join with events to get title
    const { data: bookings } = await supabase
        .from('bookings')
        .select('*, events(title)')
        .order('created_at', { ascending: false })
        .limit(20)

    let html = '<h3>Recent Bookings</h3>'
    if (bookings && bookings.length > 0) {
        html += '<table><thead><tr><th>Customer</th><th>Event</th><th>Status</th><th>Amount</th><th>Actions</th></tr></thead><tbody>'
        bookings.forEach(bk => {
            const eventName = bk.events ? bk.events.title : 'Unknown Event'
            html += `<tr>
              <td>${bk.customer_name}</td>
              <td>${eventName}</td>
              <td>${bk.status}</td>
              <td>₹${bk.amount}</td>
              <td>
                  <button class="btn-delete" onclick="deleteBooking('${bk.id}')">Delete</button>
              </td>
          </tr>`
        })
        html += '</tbody></table>'
    } else {
        html += '<p>No bookings found.</p>'
    }
    container.innerHTML = html
}

// ----------------- WATER MANAGEMENT -----------------

async function loadWater(container) {
    // 1. Orders
    const { data: orders, error: ordersError } = await supabase
        .from('water_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

    // 2. Showcase config
    const { data: showcase, error: showcaseError } = await supabase
        .from('water_showcase')
        .select('*')
        .order('display_order', { ascending: true })

    // 3. Products (pricing)
    const { data: products, error: productsError } = await supabase
        .from('water_products')
        .select('id, size_ml, title, unit_price, image_url, display_order, is_active')
        .order('display_order', { ascending: true })

    let html = '<h3>Water Orders</h3>'

    if (ordersError) {
        html += `<p style="color:red">Error loading orders: ${ordersError.message}</p>`
    } else if (orders && orders.length > 0) {
        html += '<table><thead><tr><th>Created</th><th>Name</th><th>Phone</th><th>Quantity</th><th>Status</th><th>Payment</th><th>Actions</th></tr></thead><tbody>'
        orders.forEach(ord => {
            html += `<tr>
                <td>${new Date(ord.created_at).toLocaleString()}</td>
                <td>${ord.customer_name}</td>
                <td>${ord.phone}</td>
                <td>${ord.quantity_text}</td>
                <td>${ord.status}</td>
                <td>${ord.payment_status}</td>
                <td>
                    <button class="btn-action" style="font-size:0.7rem; margin-right:5px;" onclick="window.openWaterOrderModal('${ord.id}')">Edit</button>
                    <button class="btn-delete" style="font-size:0.7rem;" onclick="window.deleteWaterOrder('${ord.id}')">Delete</button>
                </td>
            </tr>`
        })
        html += '</tbody></table>'
    } else {
        html += '<p>No water orders yet.</p>'
    }

    html += '<h3 style="margin-top:2.5rem;">Water Page Cards</h3>'

    if (showcaseError) {
        html += `<p style="color:red">Error loading water cards: ${showcaseError.message}</p>`
    } else {
        html += '<button class="btn-action" style="margin-bottom:1rem;" onclick="window.openWaterShowcaseModal(null)">+ Add Card</button>'

        if (showcase && showcase.length > 0) {
            html += '<table><thead><tr><th>Order</th><th>Title</th><th>Tag</th><th>Active</th><th>Actions</th></tr></thead><tbody>'
            showcase.forEach(card => {
                html += `<tr>
                    <td>${card.display_order}</td>
                    <td>${card.title}</td>
                    <td>${card.tag || ''}</td>
                    <td>${card.is_active ? 'Yes' : 'No'}</td>
                    <td>
                        <button class="btn-action" style="font-size:0.7rem; margin-right:5px;" onclick="window.openWaterShowcaseModal('${card.id}')">Edit</button>
                        <button class="btn-delete" style="font-size:0.7rem;" onclick="window.deleteWaterShowcase('${card.id}')">Delete</button>
                    </td>
                </tr>`
            })
            html += '</tbody></table>'
        } else {
            html += '<p>No cards configured yet. The front-end will fall back to default sample cards.</p>'
        }
    }

    html += '<h3 style="margin-top:2.5rem;">Water Products (Pricing)</h3>'

    if (productsError) {
        html += `<p style="color:red">Error loading water products: ${productsError.message}</p>`
    } else {
        html += '<button class="btn-action" style="margin-bottom:1rem;" onclick="window.openWaterProductModal(null)">+ Add Product</button>'

        if (products && products.length > 0) {
            html += '<table><thead><tr><th>Size</th><th>Title</th><th>Price</th><th>Active</th><th>Actions</th></tr></thead><tbody>'
            products.forEach(p => {
                html += `<tr>
                    <td>${p.size_ml}</td>
                    <td>${p.title}</td>
                    <td>₹${p.unit_price}</td>
                    <td>${p.is_active ? 'Yes' : 'No'}</td>
                    <td>
                        <button class="btn-action" style="font-size:0.7rem; margin-right:5px;" onclick="window.openWaterProductModal('${p.id}')">Edit</button>
                        <button class="btn-delete" style="font-size:0.7rem;" onclick="window.deleteWaterProduct('${p.id}')">Delete</button>
                    </td>
                </tr>`
            })
            html += '</tbody></table>'
        } else {
            html += '<p>No products configured. The storefront may not show items.</p>'
        }
    }

    container.innerHTML = html
}

// Water Order Modal helpers
window.openWaterOrderModal = async (id) => {
    const modal = document.getElementById('waterOrderModal')
    const err = document.getElementById('waterModalError')
    err.style.display = 'none'
    err.textContent = ''

    if (!id) return

    const { data, error } = await supabase
        .from('water_orders')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !data) {
        alert('Unable to load order.')
        return
    }

    document.getElementById('waterOrderId').value = data.id
    document.getElementById('waterCustomerName').value = data.customer_name || ''
    document.getElementById('waterCustomerPhone').value = data.phone || ''
    document.getElementById('waterCustomerEmail').value = data.email || ''
    document.getElementById('waterQuantityText').value = data.quantity_text || ''
    document.getElementById('waterFullAddress').value = data.full_address || ''
    document.getElementById('waterStatus').value = data.status || ''
    document.getElementById('waterPaymentStatus').value = data.payment_status || ''
    document.getElementById('waterNotes').value = data.notes || ''

    modal.classList.add('active')
}

window.closeWaterOrderModal = () => {
    document.getElementById('waterOrderModal').classList.remove('active')
}

window.saveWaterOrder = async () => {
    const id = document.getElementById('waterOrderId').value
    const err = document.getElementById('waterModalError')

    const payload = {
        customer_name: document.getElementById('waterCustomerName').value,
        phone: document.getElementById('waterCustomerPhone').value,
        email: document.getElementById('waterCustomerEmail').value || null,
        quantity_text: document.getElementById('waterQuantityText').value,
        full_address: document.getElementById('waterFullAddress').value,
        status: document.getElementById('waterStatus').value || 'new',
        payment_status: document.getElementById('waterPaymentStatus').value || 'pending',
        notes: document.getElementById('waterNotes').value || null
    }

    const { error } = await supabase
        .from('water_orders')
        .update(payload)
        .eq('id', id)

    if (error) {
        err.textContent = 'Save failed: ' + error.message
        err.style.display = 'block'
        return
    }

    window.closeWaterOrderModal()
    await loadWater(document.getElementById('dynamicContent'))
}

window.deleteWaterOrder = async (id) => {
    if (!confirm('Delete this water order?')) return
    const { error } = await supabase.from('water_orders').delete().eq('id', id)
    if (error) {
        alert('Delete failed: ' + error.message)
    } else {
        await loadWater(document.getElementById('dynamicContent'))
    }
}

// Water Showcase Modal helpers
window.openWaterShowcaseModal = async (id) => {
    const modal = document.getElementById('waterShowcaseModal')
    const err = document.getElementById('waterShowcaseError')
    const imageFileInput = document.getElementById('waterShowcaseImageFile')
    const imageInfo = document.getElementById('waterShowcaseImageInfo')
    err.style.display = 'none'
    err.textContent = ''
    imageFileInput.value = ''

    if (id) {
        const { data, error } = await supabase
            .from('water_showcase')
            .select('*')
            .eq('id', id)
            .single()

        if (error || !data) {
            alert('Unable to load card.')
            return
        }

        document.getElementById('waterShowcaseId').value = data.id
        document.getElementById('waterShowcaseCardTitle').value = data.title || ''
        document.getElementById('waterShowcaseSubtitle').value = data.subtitle || ''
        document.getElementById('waterShowcaseTag').value = data.tag || ''
        document.getElementById('waterShowcaseImageUrl').value = data.image_url || ''
        document.getElementById('waterShowcaseOrder').value = data.display_order || 1
        document.getElementById('waterShowcaseActive').checked = !!data.is_active
        imageInfo.innerHTML = data.image_url
            ? `Current: <a href="${data.image_url}" target="_blank" style="color:#ffd700">View Image</a> (Upload new to replace)`
            : 'No image currently set.'

        document.getElementById('waterShowcaseTitle').textContent = 'Edit Card'
    } else {
        document.getElementById('waterShowcaseId').value = ''
        document.getElementById('waterShowcaseCardTitle').value = ''
        document.getElementById('waterShowcaseSubtitle').value = ''
        document.getElementById('waterShowcaseTag').value = ''
        document.getElementById('waterShowcaseImageUrl').value = ''
        document.getElementById('waterShowcaseOrder').value = 1
        document.getElementById('waterShowcaseActive').checked = true
        imageInfo.textContent = ''
        document.getElementById('waterShowcaseTitle').textContent = 'Add Card'
    }

    modal.classList.add('active')
}

window.closeWaterShowcaseModal = () => {
    document.getElementById('waterShowcaseModal').classList.remove('active')
}

window.saveWaterShowcase = async () => {
    const id = document.getElementById('waterShowcaseId').value
    const err = document.getElementById('waterShowcaseError')
    const imageFileInput = document.getElementById('waterShowcaseImageFile')
    const imageInfo = document.getElementById('waterShowcaseImageInfo')

    let finalImageUrl = document.getElementById('waterShowcaseImageUrl').value || null

    if (imageFileInput.files.length > 0) {
        const file = imageFileInput.files[0]
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `showcase/${fileName}`

        imageInfo.textContent = 'Uploading image...'

        const { error: uploadError } = await supabase.storage
            .from('water-designs')
            .upload(filePath, file)

        if (uploadError) {
            err.textContent = 'Image upload failed: ' + uploadError.message
            err.style.display = 'block'
            imageInfo.textContent = 'Upload failed.'
            return
        }

        const { data: { publicUrl } } = supabase.storage
            .from('water-designs')
            .getPublicUrl(filePath)

        finalImageUrl = publicUrl
        document.getElementById('waterShowcaseImageUrl').value = finalImageUrl
        imageInfo.innerHTML = `Uploaded: <a href="${finalImageUrl}" target="_blank" style="color:#ffd700">View Image</a>`
    }

    const payload = {
        title: document.getElementById('waterShowcaseCardTitle').value,
        subtitle: document.getElementById('waterShowcaseSubtitle').value || null,
        tag: document.getElementById('waterShowcaseTag').value || null,
        image_url: finalImageUrl,
        display_order: parseInt(document.getElementById('waterShowcaseOrder').value || '1', 10),
        is_active: document.getElementById('waterShowcaseActive').checked
    }

    if (!payload.title) {
        err.textContent = 'Title is required.'
        err.style.display = 'block'
        return
    }

    let dbError
    if (id) {
        const { error } = await supabase
            .from('water_showcase')
            .update(payload)
            .eq('id', id)
        dbError = error
    } else {
        const { error } = await supabase
            .from('water_showcase')
            .insert([payload])
        dbError = error
    }

    if (dbError) {
        err.textContent = 'Save failed: ' + dbError.message
        err.style.display = 'block'
        return
    }

    window.closeWaterShowcaseModal()
    await loadWater(document.getElementById('dynamicContent'))
}

window.deleteWaterShowcase = async (id) => {
    if (!confirm('Delete this water card?')) return
    const { error } = await supabase.from('water_showcase').delete().eq('id', id)
    if (error) {
        alert('Delete failed: ' + error.message)
    } else {
        await loadWater(document.getElementById('dynamicContent'))
    }
}

// Water Products Modal helpers
window.openWaterProductModal = async (id) => {
    const modal = document.getElementById('waterProductModal')
    const err = document.getElementById('waterProductModalError')
    const imageFileInput = document.getElementById('waterProductImageFile')
    const imageInfo = document.getElementById('waterProductImageInfo')

    err.style.display = 'none'
    err.textContent = ''

    if (imageFileInput) imageFileInput.value = ''

    if (id) {
        const { data, error } = await supabase
            .from('water_products')
            .select('*')
            .eq('id', id)
            .single()

        if (error || !data) {
            alert('Unable to load product.')
            return
        }

        document.getElementById('waterProductId').value = data.id
        document.getElementById('waterProductSizeMl').value = data.size_ml || ''
        document.getElementById('waterProductTitle').value = data.title || ''
        document.getElementById('waterProductUnitPrice').value = data.unit_price || ''
        document.getElementById('waterProductDisplayOrder').value = data.display_order || 1
        document.getElementById('waterProductIsActive').checked = !!data.is_active

        document.getElementById('waterProductImageUrlInput').value = data.image_url || ''
        document.getElementById('waterProductImageUrl').value = data.image_url || ''

        imageInfo.innerHTML = data.image_url
            ? `Current: <a href="${data.image_url}" target="_blank" style="color:#ffd700">View Image</a> (Upload new to replace)`
            : 'No image currently set.'

        document.getElementById('waterProductModalTitle').textContent = 'Edit Water Product'
    } else {
        document.getElementById('waterProductId').value = ''
        document.getElementById('waterProductSizeMl').value = ''
        document.getElementById('waterProductTitle').value = ''
        document.getElementById('waterProductUnitPrice').value = ''
        document.getElementById('waterProductDisplayOrder').value = 1
        document.getElementById('waterProductIsActive').checked = true

        document.getElementById('waterProductImageUrlInput').value = ''
        document.getElementById('waterProductImageUrl').value = ''
        imageInfo.textContent = ''
        document.getElementById('waterProductModalTitle').textContent = 'Add Water Product'
    }

    modal.classList.add('active')
}

window.closeWaterProductModal = () => {
    document.getElementById('waterProductModal').classList.remove('active')
}

window.saveWaterProduct = async () => {
    const id = document.getElementById('waterProductId').value
    const err = document.getElementById('waterProductModalError')
    const imageFileInput = document.getElementById('waterProductImageFile')
    const imageInfo = document.getElementById('waterProductImageInfo')

    const size_ml = parseInt(document.getElementById('waterProductSizeMl').value || '', 10)
    const title = document.getElementById('waterProductTitle').value
    const unit_price = parseFloat(document.getElementById('waterProductUnitPrice').value || '0')
    const display_order = parseInt(document.getElementById('waterProductDisplayOrder').value || '1', 10)
    const is_active = document.getElementById('waterProductIsActive').checked

    let finalImageUrl = document.getElementById('waterProductImageUrlInput').value || null

    if (!size_ml || !title || Number.isNaN(unit_price)) {
        err.textContent = 'Size, Title, and Unit Price are required.'
        err.style.display = 'block'
        return
    }

    if (imageFileInput.files.length > 0) {
        const file = imageFileInput.files[0]
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `products/${fileName}`

        imageInfo.textContent = 'Uploading image...'

        const { error: uploadError } = await supabase.storage
            .from('water-designs')
            .upload(filePath, file)

        if (uploadError) {
            err.textContent = 'Image upload failed: ' + uploadError.message
            err.style.display = 'block'
            imageInfo.textContent = 'Upload failed.'
            return
        }

        const { data: { publicUrl } } = supabase.storage
            .from('water-designs')
            .getPublicUrl(filePath)

        finalImageUrl = publicUrl
        document.getElementById('waterProductImageUrlInput').value = finalImageUrl
        document.getElementById('waterProductImageUrl').value = finalImageUrl
        imageInfo.innerHTML = `Uploaded: <a href="${finalImageUrl}" target="_blank" style="color:#ffd700">View Image</a>`
    }

    const payload = {
        size_ml,
        title,
        unit_price,
        image_url: finalImageUrl,
        display_order,
        is_active
    }

    let dbError
    if (id) {
        const { error } = await supabase
            .from('water_products')
            .update(payload)
            .eq('id', id)
        dbError = error
    } else {
        const { error } = await supabase
            .from('water_products')
            .insert([payload])
        dbError = error
    }

    if (dbError) {
        err.textContent = 'Save failed: ' + dbError.message
        err.style.display = 'block'
        return
    }

    window.closeWaterProductModal()
    await loadWater(document.getElementById('dynamicContent'))
}

window.deleteWaterProduct = async (id) => {
    if (!confirm('Delete this water product?')) return
    const { error } = await supabase.from('water_products').delete().eq('id', id)
    if (error) {
        alert('Delete failed: ' + error.message)
    } else {
        await loadWater(document.getElementById('dynamicContent'))
    }
}
