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

    // 1. Generate Code (Firstname + VIP)
    const firstName = (fullName || 'USER').split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '');
    const code = firstName + 'VIP';

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
    const { data: events, error } = await supabase.from('events').select('*').order('date', { ascending: true })

    if (error) {
        container.innerHTML = `<p style="color:red">Error loading events: ${error.message}</p>`
        return
    }

    currentEvents = events || []

    let html = '<h3>All Events</h3><button class="btn-action" style="margin-bottom:1rem;" onclick="window.openEventModal(null)">+ Add New Event</button>'
    if (currentEvents.length > 0) {
        html += '<table><thead><tr><th>Title</th><th>Date</th><th>Price</th><th>Actions</th></tr></thead><tbody>'
        currentEvents.forEach(ev => {
            html += `<tr>
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

        document.getElementById('evLocation').value = ev.location || ''
        document.getElementById('evPrice').value = ev.price || 0
        document.getElementById('evImage').value = ev.image_url || ''
    } else {
        // Add Mode
        title.textContent = 'Add New Event'
        document.getElementById('eventId').value = ''
        document.getElementById('evTitle').value = ''
        document.getElementById('evDate').value = ''
        document.getElementById('evLocation').value = ''
        document.getElementById('evPrice').value = ''
        document.getElementById('evImage').value = ''
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
    const location = document.getElementById('evLocation').value
    const price = document.getElementById('evPrice').value
    const image_url = document.getElementById('evImage').value

    if (!title || !date || !price) {
        const err = document.getElementById('modalError')
        err.textContent = 'Please fill in Title, Date and Price.'
        err.style.display = 'block'
        return
    }

    const payload = {
        title,
        date: new Date(date).toISOString(),
        location,
        price,
        image_url
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




window.deleteInfluencer = async (id) => {
    if (!confirm('Are you sure you want to delete this influencer? This will revoke their access.')) return

    // 1. Delete from influencers table
    const { error: infError } = await supabase.from('influencers').delete().eq('id', id)

    if (infError) {
        // If FK violation (e.g., has bookings), just de-activate
        if (infError.code === '23503') { // ForeignKey Violation
            if (confirm('This influencer has existing bookings and cannot be fully deleted to preserve history. Do you want to Deactivate them instead?')) {
                await supabase.from('influencers').update({ active: false }).eq('id', id);
                alert('Influencer Deactivated.');
                await loadInfluencers(document.getElementById('dynamicContent'));
                return;
            }
        }
        alert('Delete Failed: ' + infError.message)
        return;
    }

    // 2. Set profile role back to user (optional, keeps account but removes influencer status)
    await supabase.from('profiles').update({ role: 'user' }).eq('id', id)

    await loadInfluencers(document.getElementById('dynamicContent'))
}

async function loadInfluencers(container) {
    const { data: influencers } = await supabase.from('influencers').select('*, profiles(full_name, email)')

    let html = '<h3>Influencers</h3>'
    if (influencers && influencers.length > 0) {
        html += '<table><thead><tr><th>Name</th><th>Code</th><th>Active</th><th>Actions</th></tr></thead><tbody>'
        influencers.forEach(inf => {
            const name = inf.profiles ? inf.profiles.full_name : 'Unknown'
            html += `<tr>
            <td>${name}</td>
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
