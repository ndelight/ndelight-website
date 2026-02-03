import { supabase } from '../supabase.js'

async function initDashboard() {
    // 1. Auth Check
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        window.location.href = '/login.html'
        return
    }

    // 2. Get Profile First
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email, role')
        .eq('id', session.user.id)
        .single()

    if (profileError || !profile) {
        console.error('Profile fetch error:', profileError)
        return
    }

    // 3. Get Influencer Details
    let { data: influencer, error: infError } = await supabase
        .from('influencers')
        .select('*')
        .eq('id', session.user.id) // Using same ID as profile
        .single()

    // 4. Auto-Activate Logic (If Profile exists but Influencer row doesn't)
    if (!influencer && profile.role === 'influencer') {
        // Generate cleaner code: First Name + 'VIP' (e.g., ABDUVIP)
        const firstName = (profile.full_name || 'USER').split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '');
        const generatedCode = firstName + 'VIP';

        console.log('New Influencer - Creating Record with code:', generatedCode);

        const { data: newInf, error: createError } = await supabase
            .from('influencers')
            .insert([{
                id: session.user.id,
                code: generatedCode,
                active: true,
                phone: '', // Can be updated later
                instagram: ''
            }])
            .select()
            .single()

        if (createError) {
            console.error('Auto-creation failed:', createError);
            // If RLS blocks this, we will see it here.
            alert('Please ask Admin to activate your influencer account. (RLS Blocked Auto-Creation)');
            return;
        }
        influencer = newInf;
    }

    // 5. Update UI Stats
    if (influencer) {
        // Stats
        document.getElementById('userInfo').innerHTML = `
            <div>
                <strong style="display:block; font-size:1.2rem; color:#fff;">${profile.full_name}</strong>
                <span style="font-size:0.8rem; color:#888;">${profile.email}</span>
            </div>
        `
        document.getElementById('promoCode').textContent = influencer.code

        // Populate Profile Form
        document.getElementById('dispName').value = profile.full_name || ''
        document.getElementById('publicEmail').value = influencer.public_email || profile.email || '' // Default to profile email if public is unset
        document.getElementById('phone').value = influencer.phone || ''
        document.getElementById('imageUrl').value = influencer.image_url || ''
        document.getElementById('instagram').value = influencer.instagram || ''
        document.getElementById('facebook').value = influencer.facebook || ''
        document.getElementById('youtube').value = influencer.youtube || ''

        // Load bookings
        loadBookings(influencer.code)
    } else {
        document.getElementById('userInfo').textContent = `User: ${profile.full_name} (Not Active)`
        document.getElementById('bookingsTable').innerHTML = '<p>Account pending activation.</p>'
    }
}

// Save Profile Handler
document.getElementById('saveProfileBtn').addEventListener('click', async () => {
    const btn = document.getElementById('saveProfileBtn')
    const msg = document.getElementById('saveMsg')

    btn.disabled = true
    btn.textContent = 'Saving...'
    msg.textContent = ''

    // Get Session to confirm ID
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const updates = {
        public_email: document.getElementById('publicEmail').value,
        phone: document.getElementById('phone').value,
        image_url: document.getElementById('imageUrl').value,
        instagram: document.getElementById('instagram').value,
        facebook: document.getElementById('facebook').value,
        youtube: document.getElementById('youtube').value,
        updated_at: new Date()
    }

    const { error } = await supabase
        .from('influencers')
        .update(updates)
        .eq('id', session.user.id)

    if (error) {
        console.error('Update Error:', error)
        msg.textContent = 'Error saving profile: ' + error.message
        msg.style.color = '#ff6b6b'
    } else {
        msg.textContent = 'Profile updated successfully!'
        msg.style.color = '#4cd964'
        setTimeout(() => msg.textContent = '', 3000)
    }

    btn.disabled = false
    btn.textContent = 'Save Changes'
})

// Image Upload Logic
const uploadInput = document.getElementById('imageUpload');
if (uploadInput) {
    uploadInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const status = document.getElementById('uploadStatus');
        const urlInput = document.getElementById('imageUrl');

        status.textContent = 'Uploading...';
        status.style.color = '#ffd700';

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not logged in');

            // Sanitize file name
            const fileExt = file.name.split('.').pop();
            const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;

            const { data, error } = await supabase.storage
                .from('influencer-images')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('influencer-images')
                .getPublicUrl(fileName);

            urlInput.value = publicUrl;
            status.textContent = 'Upload Successful! (Don\'t forget to click Save Changes)';
            status.style.color = '#4caf50';

        } catch (err) {
            console.error('Upload failed:', err);
            status.textContent = 'Upload Failed: ' + err.message;
            status.style.color = '#ff6b6b';
        }
    });
}

async function loadBookings(myCode) {
    // Although RLS handles it, we can also filter by code explicitly. 
    // RLS is the real guard though.
    // JOIN events to get the title
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select('customer_name, event_id, created_at, events(title)')
        .eq('influencer_code', myCode) // Extra filter for clarity
        .order('created_at', { ascending: false })
        .limit(50) // Limit loading for performance

    if (error) {
        console.error('Error fetching bookings:', error)
        return
    }

    let html = '<table><thead><tr><th>Date</th><th>Customer</th><th>Event Name</th></tr></thead><tbody>'

    if (bookings && bookings.length > 0) {
        bookings.forEach(bk => {
            const eventName = bk.events ? bk.events.title : 'Unknown Event';

            html += `<tr>
            <td>${new Date(bk.created_at).toLocaleDateString()}</td>
            <td>${bk.customer_name}</td>
            <td>${eventName}</td>
        </tr>`
        })
        html += '</tbody></table>'
    } else {
        html += '<p>No bookings yet.</p>'
    }

    document.getElementById('bookingsTable').innerHTML = html
    document.getElementById('totalBookings').textContent = bookings ? bookings.length : 0
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await supabase.auth.signOut()
    window.location.href = '/login.html'
})

initDashboard()
