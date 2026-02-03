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
        nameInput.required = true
    } else {
        title.textContent = 'NDelight'
        submitBtn.textContent = 'Sign In'
        toggleText.textContent = 'New here?'
        toggleBtn.textContent = 'Create Account'
        nameGroup.style.display = 'none'
        nameInput.required = false
    }

    messageDiv.textContent = ''
    messageDiv.className = 'message'
})

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
            // --- SIGN UP FLOW ---
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        role: 'influencer' // Default role
                    }
                }
            })

            if (error) throw error

            // Auto Sign-in happens if email confirmation is disabled, 
            // otherwise user must check email.
            // But since user asked for "No invite emails / paid email plans", 
            // presumably "Confirm Email" is OFF in Supabase or we accept the "Confirm email" step.
            // If Confirm Email is OFF, data.session will be present.

            if (data.session) {
                window.location.href = '/influencer/' // Default landing
            } else {
                messageDiv.textContent = 'Account created! Please sign in.'
                messageDiv.classList.add('success')
                // Switch back to login view
                toggleBtn.click()
            }

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
        } else {
            window.location.href = '/'
        }
    } catch (err) {
        console.error('Role check failed:', err)
        // Fallback
        window.location.href = '/'
    }
}

// Check Session on Load
supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
        // User is logged in. Show a message instead of instant vanish to avoid confusion.
        messageDiv.innerHTML = `
            <div style="color: #ccc; margin-bottom: 1rem;">
                You are already logged in via ${session.user.email}
            </div>
            <button id="continueBtn" class="btn-login" style="margin-bottom: 0.5rem;">Continue to Dashboard</button>
            <button id="logoutBtn" class="btn-login" style="background: transparent; border: 1px solid #666; color: #ccc;">Sign Out</button>
        `;
        messageDiv.classList.add('success');

        // Hide form to prevent double-login
        authForm.style.display = 'none';
        document.querySelector('p').style.display = 'none'; // Hide toggle text

        // Handle Buttons
        document.getElementById('continueBtn').addEventListener('click', () => {
            checkUserRole(session.user.id);
        });

        document.getElementById('logoutBtn').addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.reload();
        });

        // Optional: Auto-redirect after 2 seconds if you prefer smooth flow
        // checkUserRole(session.user.id)
    }
})
