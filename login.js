import { supabase } from './supabase.js'

// DOM Elements
const authForm = document.getElementById('authForm')
const emailInput = document.getElementById('email')
const passwordInput = document.getElementById('password')
const nameInput = document.getElementById('fullName')
const nameGroup = document.getElementById('nameGroup')
const submitBtn = document.getElementById('submitBtn')
const toggleBtn = document.getElementById('toggleBtn')
const toggleText = document.getElementById('toggleText')
const messageDiv = document.getElementById('message')
const title = document.querySelector('.login-title')

// State
let isSignup = false
let isInfluencer = false

// Toggle Login / Signup
toggleBtn.addEventListener('click', (e) => {
    e.preventDefault()
    isSignup = !isSignup

    if (isSignup) {
        title.textContent = 'Join NDelight'
        submitBtn.textContent = 'Create Account'
        toggleText.textContent = 'Already have an account?'
        toggleBtn.textContent = 'Sign In'
        nameGroup.style.display = 'block'
        document.getElementById('influencerGroup').style.display = 'flex'
        nameInput.required = true
    } else {
        title.textContent = 'NDelight'
        submitBtn.textContent = 'Sign In'
        toggleText.textContent = 'New here?'
        toggleBtn.textContent = 'Create Account'
        nameGroup.style.display = 'none'
        document.getElementById('influencerGroup').style.display = 'none'
        nameInput.required = false
    }

    messageDiv.textContent = ''
    messageDiv.className = 'message'
})

// Toggle Influencer Mode
const influencerCheck = document.getElementById('influencerCheck')
if (influencerCheck) {
    influencerCheck.addEventListener('change', (e) => {
        isInfluencer = e.target.checked
    })
}

// Handle Submit
authForm.addEventListener('submit', async (e) => {
    e.preventDefault()

    const email = emailInput.value
    const password = passwordInput.value
    const fullName = nameInput.value

    submitBtn.disabled = true
    submitBtn.textContent = 'Processing...'
    messageDiv.textContent = ''
    messageDiv.className = 'message'

    try {
        if (isSignup) {
            // --- NEW: PRE-SIGNUP VERIFICATION ---
            submitBtn.textContent = 'Sending Verification Code...';

            // 1. Send OTP
            const res = await fetch('http://localhost:3000/api/auth/send-otp-pre-signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to send verification code');
            }

            // 2. Show Modal
            document.getElementById('signupEmailDisplay').textContent = email;
            document.getElementById('signupOtpModal').style.display = 'flex';
            submitBtn.textContent = 'Verify Email First';
            submitBtn.disabled = false; // Re-enable so they can try again if they close modal
            return; // STOP HERE. Wait for OTP.

        } else {
            // --- SIGN IN FLOW ---
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (error) throw error

            checkUserRole(data.user.id)
        }
    } catch (error) {
        console.error('Auth error:', error)
        messageDiv.textContent = error.message
        messageDiv.classList.add('error')
        submitBtn.disabled = false
        submitBtn.textContent = isSignup ? 'Create Account' : 'Sign In'
    }
})

// Check Role & Redirect
async function checkUserRole(userId) {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single()

        if (error) throw error

        if (profile?.role === 'admin') {
            window.location.href = '/admin/'
        } else if (profile?.role === 'influencer') {
            window.location.href = '/influencer/'
        } else if (profile?.role === 'pending_influencer') {
            // New Logic: Redirect to Pending Page
            window.location.href = '/pending.html';
        } else {
            window.location.href = '/'
        }
    } catch (err) {
        console.error('Role check failed:', err)
        // Fallback
        window.location.href = '/'
    }
}

// Forgot Password Logic
const forgotLink = document.getElementById('forgotPasswordLink');
const forgotModal = document.getElementById('forgotModal');
const closeForgotBtn = document.getElementById('closeForgotBtn');
const sendResetBtn = document.getElementById('sendResetBtn');
const forgotEmailInput = document.getElementById('forgotEmail');
const forgotMsg = document.getElementById('forgotMsg');

if (forgotLink) {
    forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        forgotModal.style.display = 'flex';
        forgotEmailInput.value = '';
        forgotMsg.textContent = '';
    });

    closeForgotBtn.addEventListener('click', () => {
        forgotModal.style.display = 'none';
        forgotMsg.textContent = '';
    });

    sendResetBtn.addEventListener('click', async () => {
        const email = forgotEmailInput.value.trim();
        if (!email) {
            forgotMsg.style.color = '#ff6b6b';
            forgotMsg.textContent = 'Please enter your email';
            return;
        }

        forgotMsg.style.color = '#fff';
        forgotMsg.textContent = 'Sending...';
        sendResetBtn.disabled = true;

        try {
            const res = await fetch('http://localhost:3000/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            if (data.success) {
                forgotMsg.style.color = '#51cf66';
                forgotMsg.textContent = data.message;
                setTimeout(() => {
                    forgotModal.style.display = 'none';
                    sendResetBtn.disabled = false;
                }, 3000);
            } else {
                forgotMsg.style.color = '#ff6b6b';
                forgotMsg.textContent = data.error || 'Request failed';
                sendResetBtn.disabled = false;
            }
        } catch (err) {
            console.error(err);
            forgotMsg.textContent = 'Network Error';
            sendResetBtn.disabled = false;
        }
    });

    // Close on outside click
    window.addEventListener('click', (e) => {
        if (e.target === forgotModal) {
            forgotModal.style.display = 'none';
        }
    });
}

// Check Session on Load
supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (session) {
        // Hide form immediately
        authForm.style.display = 'none';
        document.querySelector('.login-subtitle').style.display = 'none';
        document.querySelector('p').style.display = 'none'; // Hide toggle text

        // Fetch Profile for nice display
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, role, email')
            .eq('id', session.user.id)
            .single();

        const name = profile ? profile.full_name : 'User';
        const role = profile ? profile.role : 'user';
        const roleBadge = role === 'influencer' ? '🌟 Influencer' : (role === 'admin' ? '🛡️ Admin' : '👤 Member');

        // Render Profile Card
        messageDiv.innerHTML = `
            <div style="background: #2a2a2a; padding: 2rem; border-radius: 12px; border: 1px solid #444; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                <div style="width: 60px; height: 60px; background: #ffd700; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold; margin: 0 auto 1rem;">
                    ${name.charAt(0).toUpperCase()}
                </div>
                <h3 style="color: #fff; margin-bottom: 0.2rem;">${name}</h3>
                <p style="color: #888; font-size: 0.9rem; margin-bottom: 0.5rem;">${session.user.email}</p>
                <div style="display:inline-block; padding: 4px 12px; background: rgba(255, 215, 0, 0.1); border: 1px solid #ffd700; border-radius: 20px; color: #ffd700; font-size: 0.8rem; margin-bottom: 1.5rem;">
                    ${roleBadge}
                </div>
                
                <button id="continueBtn" class="btn-login" style="margin-bottom: 0.8rem;">
                    Go to Dashboard →
                </button>
                <button id="logoutBtn" class="btn-login" style="background: transparent; border: 1px solid #444; color: #ccc;">
                    Sign Out
                </button>
            </div>
        `;
        messageDiv.classList.add('success');

        // Handle Buttons
        document.getElementById('continueBtn').addEventListener('click', () => {
            checkUserRole(session.user.id);
        });

        document.getElementById('logoutBtn').addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.reload();
        });
    }
})

// --- NEW: HANDLE SIGNUP OTP VERIFICATION ---
const signupOtpModal = document.getElementById('signupOtpModal');
const signupOtpInput = document.getElementById('signupOtpInput');
const verifySignupOtpBtn = document.getElementById('verifySignupOtpBtn');
const signupOtpError = document.getElementById('signupOtpError');
const closeSignupOtpBtn = document.getElementById('closeSignupOtpBtn');

if (closeSignupOtpBtn) {
    closeSignupOtpBtn.addEventListener('click', () => {
        signupOtpModal.style.display = 'none';
        submitBtn.textContent = 'Create Account';
        submitBtn.disabled = false;
    });
}

if (verifySignupOtpBtn) {
    verifySignupOtpBtn.addEventListener('click', async () => {
        const otp = signupOtpInput.value.trim();
        const email = emailInput.value.trim(); // Get from main form

        if (otp.length !== 6) {
            signupOtpError.textContent = 'Enter 6-digit code';
            return;
        }

        verifySignupOtpBtn.textContent = 'Verifying...';
        signupOtpError.textContent = '';

        try {
            // 1. Verify OTP
            const res = await fetch('http://localhost:3000/api/auth/verify-otp-pre-signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });
            const data = await res.json();

            if (!data.success) {
                throw new Error(data.error || 'Invalid Code');
            }

            // 2. OTP Valid! Now Create Account
            await processSignup();

        } catch (err) {
            console.error(err);
            signupOtpError.textContent = err.message;
            verifySignupOtpBtn.textContent = 'Verify & Create Account';
        }
    });
}


async function processSignup() {
    verifySignupOtpBtn.textContent = 'Creating Account...';

    const email = emailInput.value;
    const password = passwordInput.value;
    const fullName = nameInput.value;

    try {
        // A. Supabase Signup
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role: isInfluencer ? 'pending_influencer' : 'user'
                }
            }
        });

        if (error) throw error;

        // B. Mark as Verified (Server-Side)
        if (data.session) {
            // Call server to mark email_verified = true
            await fetch('http://localhost:3000/api/auth/mark-verified', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${data.session.access_token}` // Send session token
                },
                body: JSON.stringify({ user_id: data.user.id })
            });

            signupOtpModal.style.display = 'none';
            checkUserRole(data.user.id);
        } else {
            messageDiv.textContent = 'Account created! Please sign in.';
            messageDiv.classList.add('success');
            signupOtpModal.style.display = 'none';
            toggleBtn.click();
        }

    } catch (err) {
        signupOtpError.textContent = err.message;
        verifySignupOtpBtn.textContent = 'Verify & Create Account';
    }
}

