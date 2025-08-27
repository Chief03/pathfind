// Check if variables are already declared
if (typeof currentUser === 'undefined') {
    window.currentUser = null;
}
if (typeof authToken === 'undefined') {
    window.authToken = null;
}

document.addEventListener('DOMContentLoaded', () => {
    initAuthListeners();
    checkAuthStatus();
});

function initAuthListeners() {
    // Logo click handler
    const logoLink = document.getElementById('logo-link');
    if (logoLink) {
        logoLink.addEventListener('click', (e) => {
            e.preventDefault();
            hideAllPages();
            document.getElementById('landing-page').classList.add('active');
        });
    }
    
    // Navigation
    const navLogin = document.getElementById('nav-login');
    const navSignup = document.getElementById('nav-signup');
    const navTrips = document.getElementById('nav-trips');
    const navProfile = document.getElementById('nav-profile');
    
    if (navLogin) navLogin.addEventListener('click', showLoginPage);
    if (navSignup) navSignup.addEventListener('click', showSignupPage);
    if (navTrips) navTrips.addEventListener('click', showMyTrips);
    if (navProfile) navProfile.addEventListener('click', showProfile);
    
    // Auth forms
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    // Auth switches
    const switchToLogin = document.getElementById('switch-to-login');
    const switchToSignup = document.getElementById('switch-to-signup');
    
    if (switchToLogin) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            showLoginPage();
        });
    }
    
    if (switchToSignup) {
        switchToSignup.addEventListener('click', (e) => {
            e.preventDefault();
            showSignupPage();
        });
    }
}

function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');
    
    if (token && user) {
        authToken = token;
        currentUser = JSON.parse(user);
        updateUIForAuth(true);
    } else {
        updateUIForAuth(false);
    }
}

function updateUIForAuth(isAuthenticated) {
    const navLogin = document.getElementById('nav-login');
    const navSignup = document.getElementById('nav-signup');
    const navTrips = document.getElementById('nav-trips');
    const navProfile = document.getElementById('nav-profile');
    const userMenu = document.getElementById('user-menu');
    
    if (isAuthenticated && currentUser) {
        if (navLogin) navLogin.classList.add('hidden');
        if (navSignup) navSignup.classList.add('hidden');
        if (navTrips) navTrips.classList.remove('hidden');
        if (navProfile) navProfile.classList.remove('hidden');
        if (userMenu) {
            userMenu.classList.remove('hidden');
            
            // Update user menu
            const userName = userMenu.querySelector('.user-name');
            const userAvatar = userMenu.querySelector('.user-avatar');
            if (userName && currentUser.firstName && currentUser.lastName) {
                userName.textContent = currentUser.firstName + ' ' + currentUser.lastName;
            }
            if (userAvatar && currentUser.firstName && currentUser.lastName) {
                userAvatar.textContent = (currentUser.firstName[0] + currentUser.lastName[0]).toUpperCase();
            }
        }
    } else {
        if (navLogin) navLogin.classList.remove('hidden');
        if (navSignup) navSignup.classList.remove('hidden');
        if (navTrips) navTrips.classList.add('hidden');
        if (navProfile) navProfile.classList.add('hidden');
        if (userMenu) userMenu.classList.add('hidden');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    
    const email = document.getElementById('signup-email').value;
    const phone = document.getElementById('signup-phone').value;
    const firstName = document.getElementById('signup-firstname').value;
    const lastName = document.getElementById('signup-lastname').value;
    const birthdate = document.getElementById('signup-birthdate').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm').value;
    const termsAccepted = document.getElementById('signup-terms').checked;
    
    // Validation
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    if (!termsAccepted) {
        alert('Please accept the terms and conditions');
        return;
    }
    
    // Check age (18+)
    const birthDate = new Date(birthdate);
    const age = Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 18) {
        alert('You must be 18 or older to use Pathfind');
        return;
    }
    
    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                phone,
                firstName,
                lastName,
                birthdate,
                password
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            authToken = data.token;
            currentUser = data.user;
            
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            updateUIForAuth(true);
            showLandingPage();
        } else {
            const error = await response.json();
            alert(error.message || 'Signup failed');
        }
    } catch (error) {
        console.error('Signup error:', error);
        alert('Failed to create account. Please try again.');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        if (response.ok) {
            const data = await response.json();
            authToken = data.token;
            currentUser = data.user;
            
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            updateUIForAuth(true);
            showLandingPage();
        } else {
            alert('Invalid email or password');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Failed to log in. Please try again.');
    }
}

function handleLogout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    updateUIForAuth(false);
    showLandingPage();
}

function requireAuth() {
    if (!authToken || !currentUser) {
        showLoginPage();
        return false;
    }
    return true;
}

// Page navigation functions
function showLandingPage() {
    hideAllPages();
    document.getElementById('landing-page').classList.add('active');
}

function showSignupPage() {
    hideAllPages();
    document.getElementById('signup-page').classList.add('active');
}

function showLoginPage() {
    hideAllPages();
    document.getElementById('login-page').classList.add('active');
}

function showMyTrips() {
    if (!requireAuth()) return;
    hideAllPages();
    document.getElementById('my-trips-page').classList.add('active');
    loadUserTrips();
}

function showProfile() {
    if (!requireAuth()) return;
    hideAllPages();
    document.getElementById('profile-page').classList.add('active');
    
    // Update profile information
    document.getElementById('profile-name').textContent = 
        `${currentUser.firstName} ${currentUser.lastName}`;
    document.getElementById('profile-email').textContent = currentUser.email;
    document.getElementById('profile-phone').textContent = currentUser.phone;
}

function hideAllPages() {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
}

async function loadUserTrips() {
    try {
        const response = await fetch('/api/trips/user', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const trips = await response.json();
            displayUserTrips(trips);
        }
    } catch (error) {
        console.error('Error loading trips:', error);
    }
}

function displayUserTrips(trips) {
    const tripsGrid = document.getElementById('trips-grid');
    tripsGrid.innerHTML = '';
    
    if (trips.length === 0) {
        tripsGrid.innerHTML = '<p>No trips yet. Create your first trip!</p>';
        return;
    }
    
    trips.forEach(trip => {
        const tripCard = document.createElement('div');
        tripCard.className = 'trip-card';
        tripCard.onclick = () => openTrip(trip.id);
        
        const startDate = new Date(trip.startDate).toLocaleDateString();
        const endDate = new Date(trip.endDate).toLocaleDateString();
        
        tripCard.innerHTML = `
            <div class="trip-card-image"></div>
            <div class="trip-card-content">
                <div class="trip-card-title">${trip.name}</div>
                <div class="trip-card-route">${trip.departureCity} → ${trip.destinationCity}</div>
                <div class="trip-card-dates">${startDate} - ${endDate}</div>
            </div>
        `;
        
        tripsGrid.appendChild(tripCard);
    });
}

function openTrip(tripId) {
    window.currentTripId = tripId;
    loadTripDashboard(tripId);
}

// Export functions for use in app.js
window.requireAuth = requireAuth;
window.hideAllPages = hideAllPages;
window.showLandingPage = showLandingPage;