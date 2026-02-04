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
        .select('full_name, email, role, email_verified')
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
        // Generate cleaner code: First Letter + Second Name Letter (or duplicate first) + Last 4 of UUID
        const nameParts = (profile.full_name || 'USER').trim().split(/\s+/);
        const nameOne = nameParts[0] ? nameParts[0][0].toUpperCase() : 'U';
        const nameTwo = nameParts.length > 1 ? nameParts[1][0].toUpperCase() : nameOne; // Duplicate first if no second name
        const shortInitials = (nameOne + nameTwo).replace(/[^A-Z]/g, 'X'); // Fallback for special chars

        const uniqueSuffix = session.user.id.split('-').pop().slice(-4).toUpperCase();
        const generatedCode = `${shortInitials}${uniqueSuffix}`;

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


        // Render Profile
        document.getElementById('dispName').value = profile.full_name || '';
        document.getElementById('publicEmail').value = profile.email || ''; // Assuming email is now in profiles or fetched
        // Wait, did we fetch email? Line 19: .select('*') -> yes.
        document.getElementById('phone').value = profile.phone || '';
        document.getElementById('imageUrl').value = profile.avatar_url || '';
        document.getElementById('instagram').value = profile.social_instagram || '';
        document.getElementById('facebook').value = profile.social_facebook || '';
        document.getElementById('youtube').value = profile.social_youtube || '';

        // Verification UI
        const verifiedBadge = document.getElementById('verifiedBadge');
        const verifyBtn = document.getElementById('verifyEmailBtn');

        if (profile.email_verified) {
            verifiedBadge.style.display = 'inline-block';
            verifyBtn.style.display = 'none';
        } else {
            verifiedBadge.style.display = 'none';
            verifyBtn.style.display = 'inline-block';
        }

        // --- OTP Logic ---
        const otpModal = document.getElementById('otpModal');
        const otpInput = document.getElementById('otpInput');
        const submitOtpBtn = document.getElementById('submitOtpBtn');
        const resendOtpBtn = document.getElementById('resendOtpBtn');
        const closeOtpBtn = document.getElementById('closeOtpBtn');
        const otpMsg = document.getElementById('otpMsg');
        const otpTimer = document.getElementById('otpTimer');

        let cooldownInterval;

        // Open Modal & Send OTP
        verifyBtn.addEventListener('click', async () => {
            alert('Debug: Verify Button Clicked. Opening Modal...');
            otpModal.style.display = 'flex';
            otpInput.value = '';
            otpMsg.textContent = '';
            otpTimer.textContent = '';
            await sendOtp();
        });

        // Close Modal
        closeOtpBtn.addEventListener('click', () => {
            otpModal.style.display = 'none';
        });

        // Send OTP Function
        async function sendOtp() {
            otpMsg.style.color = '#fff';
            otpMsg.textContent = 'Sending code...';
            resendOtpBtn.style.display = 'none';

            try {
                // Using relative path for Vercel
                const res = await fetch('/api/auth/send-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: session.user.id,
                        email: profile.email || session.user.email
                    })
                });

                const data = await res.json();

                if (data.success) {
                    otpMsg.style.color = '#51cf66';
                    otpMsg.textContent = 'Code sent! Check your email.';
                    startCooldown(10);
                } else {
                    otpMsg.style.color = '#ff6b6b';
                    otpMsg.textContent = data.error || 'Failed to send OTP';
                    resendOtpBtn.style.display = 'inline-block';
                }
            } catch (err) {
                console.error('OTP Client Error:', err);
                otpMsg.textContent = 'Connection Error. Is server running?';
                otpMsg.style.color = '#ff6b6b';
                resendOtpBtn.style.display = 'inline-block';
            }
        }

        // Resend Click
        resendOtpBtn.addEventListener('click', sendOtp);

        // Cooldown Timer
        function startCooldown(seconds) {
            let left = seconds;
            resendOtpBtn.style.display = 'none';
            otpTimer.textContent = `Resend available in ${left}s`;

            clearInterval(cooldownInterval);
            cooldownInterval = setInterval(() => {
                left--;
                otpTimer.textContent = `Resend available in ${left}s`;
                if (left <= 0) {
                    clearInterval(cooldownInterval);
                    otpTimer.textContent = '';
                    resendOtpBtn.style.display = 'inline-block';
                }
            }, 1000);
        }

        // Verify OTP Action
        submitOtpBtn.addEventListener('click', async () => {
            const code = otpInput.value.trim();
            if (code.length !== 6) {
                otpMsg.style.color = '#ff6b6b';
                otpMsg.textContent = 'Enter a 6-digit code';
                return;
            }

            otpMsg.style.color = '#fff';
            otpMsg.textContent = 'Verifying...';

            try {
                const res = await fetch('/api/auth/verify-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: session.user.id,
                        otp: code
                    })
                });
                const data = await res.json();

                if (data.success) {
                    otpMsg.style.color = '#51cf66';
                    otpMsg.textContent = 'Verified!';
                    setTimeout(() => {
                        otpModal.style.display = 'none';
                        verifiedBadge.style.display = 'inline-block';
                        verifyBtn.style.display = 'none';
                        // Ideally update local profile state too
                        profile.email_verified = true;
                    }, 1500);
                } else {
                    otpMsg.style.color = '#ff6b6b';
                    otpMsg.textContent = data.error || 'Verification failed';
                }
            } catch (err) {
                otpMsg.textContent = 'Network Error';
            }
        });

        // --------------------------------------------------

        // Load bookings
        loadBookings(influencer.code)
    } else {
        // If not influencer/active, check if pending
        if (profile.role === 'pending_influencer') {
            window.location.href = '/pending.html';
            return;
        }

        // Fallback for completely unknown roles
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
