// Simple Amplify Authentication for Static HTML App
(function() {
  'use strict';
  
  // Check if user clicked auth button
  const authButton = document.getElementById('nav-auth');
  const searchButton = document.querySelector('.search-btn');
  
  // Auth state
  let authState = {
    isAuthenticated: false,
    user: null
  };
  
  // Initialize auth check
  function initAuth() {
    // Check localStorage for mock auth (temporary solution)
    const savedUser = localStorage.getItem('pathfindUser');
    if (savedUser) {
      authState.user = JSON.parse(savedUser);
      authState.isAuthenticated = true;
      updateUI();
    }
  }
  
  // Show login modal
  function showLoginPrompt() {
    const existingModal = document.getElementById('login-modal');
    if (existingModal) {
      existingModal.classList.remove('hidden');
      return;
    }
    
    // Create simple login modal
    const modalHTML = `
      <div id="simple-auth-modal" class="auth-modal-overlay">
        <div class="auth-modal-container" style="max-width: 400px; margin: 100px auto; background: white; padding: 30px; border-radius: 12px;">
          <h2 style="margin-bottom: 20px;">Sign In to Continue</h2>
          <p style="color: #666; margin-bottom: 20px;">Please sign in to create and manage trips</p>
          
          <form id="simple-auth-form">
            <div style="margin-bottom: 15px;">
              <input type="email" id="auth-email" placeholder="Email" required 
                     style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
            </div>
            <div style="margin-bottom: 15px;">
              <input type="password" id="auth-password" placeholder="Password" required
                     style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
            </div>
            <button type="submit" style="width: 100%; padding: 12px; background: #FF5A5F; color: white; border: none; border-radius: 6px; cursor: pointer;">
              Sign In
            </button>
          </form>
          
          <div style="margin-top: 20px; text-align: center;">
            <p style="color: #666; font-size: 14px;">Don't have an account?</p>
            <button id="show-signup" style="color: #FF5A5F; background: none; border: none; cursor: pointer; text-decoration: underline;">
              Create Account
            </button>
          </div>
          
          <button id="close-auth-modal" style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer;">
            ×
          </button>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners
    document.getElementById('simple-auth-form').addEventListener('submit', handleLogin);
    document.getElementById('close-auth-modal').addEventListener('click', closeModal);
    document.getElementById('show-signup').addEventListener('click', showSignupForm);
  }
  
  // Handle login
  function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    
    // For now, accept any email/password (temporary)
    // In production, this would call Amplify Auth
    if (email && password) {
      // Mock successful login
      authState.isAuthenticated = true;
      authState.user = {
        email: email,
        name: email.split('@')[0]
      };
      
      // Save to localStorage
      localStorage.setItem('pathfindUser', JSON.stringify(authState.user));
      
      // Close modal and update UI
      closeModal();
      updateUI();
      
      // Continue with original action
      if (window.pendingTripCreation) {
        window.pendingTripCreation();
        window.pendingTripCreation = null;
      }
    }
  }
  
  // Show signup form
  function showSignupForm() {
    const modal = document.getElementById('simple-auth-modal');
    if (!modal) return;
    
    const container = modal.querySelector('.auth-modal-container');
    container.innerHTML = `
      <h2 style="margin-bottom: 20px;">Create Account</h2>
      <p style="color: #666; margin-bottom: 20px;">Sign up to start planning trips</p>
      
      <form id="simple-signup-form">
        <div style="margin-bottom: 15px;">
          <input type="text" id="signup-name" placeholder="Full Name" required 
                 style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
        </div>
        <div style="margin-bottom: 15px;">
          <input type="email" id="signup-email" placeholder="Email" required 
                 style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
        </div>
        <div style="margin-bottom: 15px;">
          <input type="password" id="signup-password" placeholder="Password" required
                 style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
        </div>
        <button type="submit" style="width: 100%; padding: 12px; background: #FF5A5F; color: white; border: none; border-radius: 6px; cursor: pointer;">
          Create Account
        </button>
      </form>
      
      <div style="margin-top: 20px; text-align: center;">
        <p style="color: #666; font-size: 14px;">Already have an account?</p>
        <button id="show-login" style="color: #FF5A5F; background: none; border: none; cursor: pointer; text-decoration: underline;">
          Sign In
        </button>
      </div>
      
      <button id="close-auth-modal" style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer;">
        ×
      </button>
    `;
    
    // Add event listeners
    document.getElementById('simple-signup-form').addEventListener('submit', handleSignup);
    document.getElementById('close-auth-modal').addEventListener('click', closeModal);
    document.getElementById('show-login').addEventListener('click', () => {
      closeModal();
      showLoginPrompt();
    });
  }
  
  // Handle signup
  function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    
    if (name && email && password) {
      // Mock successful signup
      authState.isAuthenticated = true;
      authState.user = {
        email: email,
        name: name
      };
      
      // Save to localStorage
      localStorage.setItem('pathfindUser', JSON.stringify(authState.user));
      
      // Close modal and update UI
      closeModal();
      updateUI();
      
      // Continue with original action
      if (window.pendingTripCreation) {
        window.pendingTripCreation();
        window.pendingTripCreation = null;
      }
    }
  }
  
  // Close modal
  function closeModal() {
    const modal = document.getElementById('simple-auth-modal');
    if (modal) {
      modal.remove();
    }
  }
  
  // Update UI based on auth state
  function updateUI() {
    const authBtn = document.getElementById('nav-auth');
    const dropdown = document.getElementById('nav-dropdown');
    
    if (authState.isAuthenticated && authState.user) {
      // Update auth button to show user info
      if (authBtn) {
        authBtn.innerHTML = `
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="8" r="3"></circle>
            <path d="M12 14c-4 0-7 2-7 4v1h14v-1c0-2-3-4-7-4z"></path>
          </svg>
          <span>${authState.user.name || authState.user.email.split('@')[0]}</span>
        `;
      }
      
      // Add sign out option to dropdown
      if (dropdown && !document.getElementById('nav-signout')) {
        const signoutBtn = document.createElement('button');
        signoutBtn.id = 'nav-signout';
        signoutBtn.className = 'dropdown-item';
        signoutBtn.innerHTML = `
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"></path>
          </svg>
          <span>Sign Out</span>
        `;
        signoutBtn.addEventListener('click', handleSignout);
        dropdown.appendChild(signoutBtn);
      }
    }
  }
  
  // Handle signout
  function handleSignout() {
    authState.isAuthenticated = false;
    authState.user = null;
    localStorage.removeItem('pathfindUser');
    window.location.reload();
  }
  
  // Intercept trip creation to require auth
  function requireAuth(callback) {
    if (authState.isAuthenticated) {
      callback();
    } else {
      window.pendingTripCreation = callback;
      showLoginPrompt();
    }
  }
  
  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', function() {
    initAuth();
    
    // Intercept search button click
    const searchBtn = document.querySelector('.search-btn');
    if (searchBtn) {
      const originalOnclick = searchBtn.onclick;
      searchBtn.onclick = function(e) {
        e.preventDefault();
        requireAuth(() => {
          // Continue with original search action
          if (originalOnclick) {
            originalOnclick.call(this, e);
          } else {
            // Trigger search manually if needed
            const form = document.querySelector('.hero-form');
            if (form) {
              form.dispatchEvent(new Event('submit'));
            }
          }
        });
      };
    }
    
    // Add auth button handler
    if (authButton) {
      authButton.addEventListener('click', (e) => {
        e.preventDefault();
        if (!authState.isAuthenticated) {
          showLoginPrompt();
        }
      });
    }
  });
  
  // Export auth state for other scripts
  window.pathfindAuth = {
    isAuthenticated: () => authState.isAuthenticated,
    getUser: () => authState.user,
    requireAuth: requireAuth
  };
})();