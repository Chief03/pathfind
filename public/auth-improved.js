// Improved Authentication System
(function() {
    'use strict';
    
    // Auth state
    let authState = {
        user: null,
        token: null,
        refreshToken: null
    };
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    function init() {
        console.log('[Auth] Initializing improved authentication...');
        
        // Check for existing session
        loadAuthState();
        
        // Setup UI based on auth state
        updateAuthUI();
        
        // Setup event listeners
        setupEventListeners();
    }
    
    function loadAuthState() {
        const token = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        const user = localStorage.getItem('user');
        
        if (token && user) {
            authState.token = token;
            authState.refreshToken = refreshToken;
            authState.user = JSON.parse(user);
            
            // Verify token is still valid
            verifyToken();
        }
    }
    
    function saveAuthState(data) {
        authState.token = data.accessToken;
        authState.refreshToken = data.refreshToken;
        authState.user = data.user;
        
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        updateAuthUI();
    }
    
    function clearAuthState() {
        authState.token = null;
        authState.refreshToken = null;
        authState.user = null;
        
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        updateAuthUI();
    }
    
    function updateAuthUI() {
        const authBtn = document.getElementById('nav-auth');
        const navDropdown = document.getElementById('nav-dropdown');
        const navTrips = document.getElementById('nav-trips');
        const navProfile = document.getElementById('nav-profile');
        const navLogout = document.getElementById('nav-logout');
        
        if (authState.user) {
            // User is logged in
            if (authBtn) authBtn.textContent = authState.user.firstName || 'Account';
            if (navTrips) navTrips.classList.remove('hidden');
            if (navProfile) navProfile.classList.remove('hidden');
            if (navLogout) navLogout.classList.remove('hidden');
            
            // Hide login button in dropdown
            const loginItem = navDropdown?.querySelector('#nav-auth');
            if (loginItem) loginItem.classList.add('hidden');
        } else {
            // User is not logged in
            if (authBtn) authBtn.textContent = 'Log in / Sign up';
            if (navTrips) navTrips.classList.add('hidden');
            if (navProfile) navProfile.classList.add('hidden');
            if (navLogout) navLogout.classList.add('hidden');
        }
    }
    
    function setupEventListeners() {
        // Modal triggers
        const authBtn = document.getElementById('nav-auth');
        if (authBtn && !authState.user) {
            authBtn.addEventListener('click', showAuthModal);
        }
        
        // Logout
        const logoutBtn = document.getElementById('nav-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }
    }
    
    function showAuthModal() {
        const modal = document.getElementById('auth-modal-improved');
        if (!modal) {
            createAuthModal();
        } else {
            modal.classList.remove('hidden');
        }
    }
    
    function createAuthModal() {
        const modalHTML = `
            <div id="auth-modal-improved" class="auth-modal-overlay">
                <div class="auth-modal-container">
                    <button class="auth-modal-close">&times;</button>
                    
                    <div class="auth-tabs">
                        <button class="auth-tab active" data-tab="login">Log In</button>
                        <button class="auth-tab" data-tab="signup">Sign Up</button>
                    </div>
                    
                    <div class="auth-content">
                        <!-- Login Form -->
                        <form id="login-form" class="auth-form active">
                            <h2>Welcome Back</h2>
                            <div class="form-group">
                                <input type="email" id="login-email" placeholder="Email" required>
                            </div>
                            <div class="form-group">
                                <input type="password" id="login-password" placeholder="Password" required>
                            </div>
                            <button type="submit" class="auth-submit-btn">Log In</button>
                            <div class="auth-error" id="login-error"></div>
                        </form>
                        
                        <!-- Signup Form -->
                        <form id="signup-form" class="auth-form">
                            <h2>Create Account</h2>
                            <div class="form-row">
                                <div class="form-group">
                                    <input type="text" id="signup-firstname" placeholder="First Name" required>
                                </div>
                                <div class="form-group">
                                    <input type="text" id="signup-lastname" placeholder="Last Name" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <input type="email" id="signup-email" placeholder="Email" required>
                            </div>
                            <div class="form-group">
                                <input type="tel" id="signup-phone" placeholder="Phone (optional)">
                            </div>
                            <div class="form-group">
                                <input type="date" id="signup-birthdate" placeholder="Birthdate (optional)">
                            </div>
                            <div class="form-group">
                                <input type="password" id="signup-password" placeholder="Password" required minlength="6">
                            </div>
                            <div class="form-group">
                                <input type="password" id="signup-confirm" placeholder="Confirm Password" required>
                            </div>
                            <button type="submit" class="auth-submit-btn">Sign Up</button>
                            <div class="auth-error" id="signup-error"></div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Get modal element
        const modal = document.getElementById('auth-modal-improved');
        
        // Setup modal event listeners
        setupModalListeners(modal);
    }
    
    function setupModalListeners(modal) {
        // Close button
        const closeBtn = modal.querySelector('.auth-modal-close');
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
        
        // Backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
        
        // Tab switching
        const tabs = modal.querySelectorAll('.auth-tab');
        const forms = modal.querySelectorAll('.auth-form');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update active form
                forms.forEach(form => {
                    if (form.id === `${targetTab}-form`) {
                        form.classList.add('active');
                    } else {
                        form.classList.remove('active');
                    }
                });
            });
        });
        
        // Form submissions
        const loginForm = modal.querySelector('#login-form');
        const signupForm = modal.querySelector('#signup-form');
        
        loginForm.addEventListener('submit', handleLogin);
        signupForm.addEventListener('submit', handleSignup);
    }
    
    async function handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorDiv = document.getElementById('login-error');
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                saveAuthState(data);
                document.getElementById('auth-modal-improved').classList.add('hidden');
                showNotification('Login successful!', 'success');
            } else {
                errorDiv.textContent = data.error || 'Login failed';
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            console.error('[Auth] Login error:', error);
            errorDiv.textContent = 'Connection error. Please try again.';
            errorDiv.style.display = 'block';
        }
    }
    
    async function handleSignup(e) {
        e.preventDefault();
        
        const firstName = document.getElementById('signup-firstname').value;
        const lastName = document.getElementById('signup-lastname').value;
        const email = document.getElementById('signup-email').value;
        const phone = document.getElementById('signup-phone').value;
        const birthdate = document.getElementById('signup-birthdate').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm').value;
        const errorDiv = document.getElementById('signup-error');
        
        // Validate passwords match
        if (password !== confirmPassword) {
            errorDiv.textContent = 'Passwords do not match';
            errorDiv.style.display = 'block';
            return;
        }
        
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    firstName,
                    lastName,
                    email,
                    phoneNumber: phone,
                    birthdate,
                    password
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                saveAuthState(data);
                document.getElementById('auth-modal-improved').classList.add('hidden');
                showNotification('Account created successfully!', 'success');
            } else {
                errorDiv.textContent = data.error || 'Registration failed';
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            console.error('[Auth] Signup error:', error);
            errorDiv.textContent = 'Connection error. Please try again.';
            errorDiv.style.display = 'block';
        }
    }
    
    async function verifyToken() {
        try {
            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${authState.token}`
                }
            });
            
            if (!response.ok) {
                // Token is invalid, try to refresh
                await refreshToken();
            }
        } catch (error) {
            console.error('[Auth] Token verification error:', error);
            clearAuthState();
        }
    }
    
    async function refreshToken() {
        if (!authState.refreshToken) {
            clearAuthState();
            return;
        }
        
        try {
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refreshToken: authState.refreshToken
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                authState.token = data.accessToken;
                authState.refreshToken = data.refreshToken;
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
            } else {
                clearAuthState();
            }
        } catch (error) {
            console.error('[Auth] Token refresh error:', error);
            clearAuthState();
        }
    }
    
    async function logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authState.token}`
                }
            });
        } catch (error) {
            console.error('[Auth] Logout error:', error);
        }
        
        clearAuthState();
        showNotification('Logged out successfully', 'info');
        
        // Redirect to home
        window.location.href = '/';
    }
    
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
    
    // Expose auth state and functions globally
    window.authSystem = {
        getUser: () => authState.user,
        getToken: () => authState.token,
        isAuthenticated: () => !!authState.user,
        logout,
        showAuthModal
    };
})();