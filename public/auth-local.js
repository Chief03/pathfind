// Local Authentication System (for testing without AWS)
class LocalAuthSystem {
  constructor() {
    this.authState = {
      user: null,
      isAuthenticated: false,
      isLoading: true,
      tokens: null
    };
    
    this.baseURL = 'http://localhost:3002/api/amplify-auth';
    this.init();
  }
  
  async init() {
    console.log('[LocalAuth] Initializing local authentication...');
    
    // Check for existing session
    await this.checkAuthState();
    
    // Setup UI
    this.setupUI();
    this.setupEventListeners();
  }
  
  async checkAuthState() {
    try {
      const accessToken = localStorage.getItem('localAccessToken');
      const userAttr = localStorage.getItem('localUserAttributes');
      
      if (accessToken && userAttr) {
        // Verify token is still valid by making a request
        const response = await fetch(`${this.baseURL}/current-user`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (response.ok) {
          this.authState.user = JSON.parse(userAttr);
          this.authState.isAuthenticated = true;
          this.authState.tokens = { accessToken };
          
          console.log('[LocalAuth] User authenticated:', this.authState.user);
        } else {
          // Token expired, clear storage
          this.clearAuthState();
        }
      }
    } catch (error) {
      console.log('[LocalAuth] No valid session found');
      this.clearAuthState();
    } finally {
      this.authState.isLoading = false;
      this.updateAuthUI();
    }
  }
  
  setupUI() {
    // Create auth modal if it doesn't exist
    if (!document.getElementById('local-auth-modal')) {
      this.createAuthModal();
    }
  }
  
  createAuthModal() {
    const modalHTML = `
      <div id="local-auth-modal" class="auth-modal-overlay hidden">
        <div class="auth-modal-container">
          <button class="auth-modal-close">&times;</button>
          
          <div class="auth-tabs">
            <button class="auth-tab active" data-tab="signin">Sign In</button>
            <button class="auth-tab" data-tab="signup">Sign Up</button>
          </div>
          
          <div class="auth-content">
            <!-- Sign In Form -->
            <form id="local-signin-form" class="auth-form active">
              <h2>Welcome Back</h2>
              <div class="form-group">
                <input type="email" id="local-signin-email" placeholder="Email" required>
              </div>
              <div class="form-group">
                <input type="password" id="local-signin-password" placeholder="Password" required>
              </div>
              <button type="submit" class="auth-submit-btn">Sign In</button>
              <div class="auth-error" id="local-signin-error"></div>
            </form>
            
            <!-- Sign Up Form -->
            <form id="local-signup-form" class="auth-form">
              <h2>Create Account</h2>
              <div class="form-row">
                <div class="form-group">
                  <input type="text" id="local-signup-firstname" placeholder="First Name" required>
                </div>
                <div class="form-group">
                  <input type="text" id="local-signup-lastname" placeholder="Last Name" required>
                </div>
              </div>
              <div class="form-group">
                <input type="email" id="local-signup-email" placeholder="Email" required>
              </div>
              <div class="form-group">
                <input type="tel" id="local-signup-phone" placeholder="Phone (optional)">
              </div>
              <div class="form-group">
                <input type="password" id="local-signup-password" placeholder="Password" required minlength="6">
                <small class="password-hint">Must be at least 6 characters</small>
              </div>
              <div class="form-group">
                <input type="password" id="local-signup-confirm" placeholder="Confirm Password" required>
              </div>
              <button type="submit" class="auth-submit-btn">Sign Up</button>
              <div class="auth-error" id="local-signup-error"></div>
            </form>
            
            <!-- Verification Form -->
            <form id="local-verify-form" class="auth-form">
              <h2>Verify Your Email</h2>
              <p>We've sent a verification code to <span id="local-verify-email"></span></p>
              <div class="form-group">
                <input type="text" id="local-verify-code" placeholder="Enter verification code" required maxlength="6">
              </div>
              <button type="submit" class="auth-submit-btn">Verify</button>
              <div class="auth-error" id="local-verify-error"></div>
              <div class="auth-success" id="local-verify-success"></div>
            </form>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }
  
  setupEventListeners() {
    // Auth button in navbar
    const authBtn = document.getElementById('nav-auth');
    if (authBtn) {
      authBtn.addEventListener('click', () => {
        if (!this.authState.isAuthenticated) {
          this.showAuthModal();
        }
      });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('nav-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleSignOut());
    }
    
    // Modal elements
    const modal = document.getElementById('local-auth-modal');
    if (modal) {
      // Close button
      const closeBtn = modal.querySelector('.auth-modal-close');
      closeBtn?.addEventListener('click', () => this.hideAuthModal());
      
      // Backdrop click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.hideAuthModal();
      });
      
      // Tab switching
      const tabs = modal.querySelectorAll('.auth-tab');
      tabs.forEach(tab => {
        tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
      });
      
      // Form submissions
      const signinForm = document.getElementById('local-signin-form');
      const signupForm = document.getElementById('local-signup-form');
      const verifyForm = document.getElementById('local-verify-form');
      
      signinForm?.addEventListener('submit', (e) => this.handleSignIn(e));
      signupForm?.addEventListener('submit', (e) => this.handleSignUp(e));
      verifyForm?.addEventListener('submit', (e) => this.handleVerification(e));
    }
  }
  
  showAuthModal() {
    const modal = document.getElementById('local-auth-modal');
    if (modal) {
      modal.classList.remove('hidden');
      this.switchTab('signin');
    }
  }
  
  hideAuthModal() {
    const modal = document.getElementById('local-auth-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }
  
  switchTab(tabName) {
    const modal = document.getElementById('local-auth-modal');
    const tabs = modal.querySelectorAll('.auth-tab');
    const forms = modal.querySelectorAll('.auth-form');
    
    tabs.forEach(tab => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    
    forms.forEach(form => {
      if (form.id === `local-${tabName}-form`) {
        form.classList.add('active');
      } else {
        form.classList.remove('active');
      }
    });
  }
  
  async handleSignIn(event) {
    event.preventDefault();
    
    const email = document.getElementById('local-signin-email').value;
    const password = document.getElementById('local-signin-password').value;
    const errorDiv = document.getElementById('local-signin-error');
    
    try {
      errorDiv.textContent = '';
      errorDiv.style.display = 'none';
      
      const response = await fetch(`${this.baseURL}/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: email,
          password: password
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.isSignedIn) {
        // Get user attributes
        const userResponse = await fetch(`${this.baseURL}/user-attributes`, {
          headers: {
            'Authorization': `Bearer ${data.tokens.accessToken.value}`
          }
        });
        
        if (userResponse.ok) {
          const userAttributes = await userResponse.json();
          
          // Store tokens and user data
          localStorage.setItem('localAccessToken', data.tokens.accessToken.value);
          localStorage.setItem('localUserAttributes', JSON.stringify(userAttributes));
          
          this.authState.user = userAttributes;
          this.authState.isAuthenticated = true;
          this.authState.tokens = data.tokens;
          
          this.updateAuthUI();
          this.hideAuthModal();
          this.showNotification('Successfully signed in!', 'success');
          
          console.log('[LocalAuth] Sign in successful');
        }
      } else {
        errorDiv.textContent = data.message || 'Sign in failed';
        errorDiv.style.display = 'block';
      }
    } catch (error) {
      console.error('[LocalAuth] Sign in error:', error);
      errorDiv.textContent = 'Connection error. Please make sure the local auth server is running on port 3002.';
      errorDiv.style.display = 'block';
    }
  }
  
  async handleSignUp(event) {
    event.preventDefault();
    
    const firstName = document.getElementById('local-signup-firstname').value;
    const lastName = document.getElementById('local-signup-lastname').value;
    const email = document.getElementById('local-signup-email').value;
    const phone = document.getElementById('local-signup-phone').value;
    const password = document.getElementById('local-signup-password').value;
    const confirmPassword = document.getElementById('local-signup-confirm').value;
    const errorDiv = document.getElementById('local-signup-error');
    
    // Validate passwords match
    if (password !== confirmPassword) {
      errorDiv.textContent = 'Passwords do not match';
      errorDiv.style.display = 'block';
      return;
    }
    
    try {
      errorDiv.textContent = '';
      errorDiv.style.display = 'none';
      
      const response = await fetch(`${this.baseURL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: email,
          password: password,
          options: {
            userAttributes: {
              given_name: firstName,
              family_name: lastName,
              phone_number: phone || undefined
            }
          }
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.nextStep?.signUpStep === 'CONFIRM_SIGN_UP') {
        // Store email for verification
        this.pendingVerificationEmail = email;
        
        // Show verification form
        document.getElementById('local-verify-email').textContent = email;
        this.switchTab('verify');
        
        this.showNotification('Verification code sent! Check the server console for the code.', 'info');
      } else {
        errorDiv.textContent = data.message || 'Registration failed';
        errorDiv.style.display = 'block';
      }
    } catch (error) {
      console.error('[LocalAuth] Sign up error:', error);
      errorDiv.textContent = 'Connection error. Please make sure the local auth server is running on port 3002.';
      errorDiv.style.display = 'block';
    }
  }
  
  async handleVerification(event) {
    event.preventDefault();
    
    const code = document.getElementById('local-verify-code').value;
    const errorDiv = document.getElementById('local-verify-error');
    const successDiv = document.getElementById('local-verify-success');
    
    try {
      errorDiv.textContent = '';
      errorDiv.style.display = 'none';
      successDiv.textContent = '';
      successDiv.style.display = 'none';
      
      const response = await fetch(`${this.baseURL}/confirm-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: this.pendingVerificationEmail,
          confirmationCode: code
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.isSignUpComplete) {
        successDiv.textContent = 'Email verified successfully! Please sign in.';
        successDiv.style.display = 'block';
        
        setTimeout(() => {
          this.switchTab('signin');
          // Pre-fill email
          document.getElementById('local-signin-email').value = this.pendingVerificationEmail;
        }, 2000);
      } else {
        errorDiv.textContent = data.message || 'Verification failed';
        errorDiv.style.display = 'block';
      }
    } catch (error) {
      console.error('[LocalAuth] Verification error:', error);
      errorDiv.textContent = 'Connection error. Please try again.';
      errorDiv.style.display = 'block';
    }
  }
  
  async handleSignOut() {
    try {
      await fetch(`${this.baseURL}/signout`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('[LocalAuth] Sign out error:', error);
    }
    
    this.clearAuthState();
    this.showNotification('Signed out successfully', 'info');
    
    // Redirect to home
    window.location.href = '/';
  }
  
  clearAuthState() {
    this.authState.user = null;
    this.authState.isAuthenticated = false;
    this.authState.tokens = null;
    
    localStorage.removeItem('localAccessToken');
    localStorage.removeItem('localUserAttributes');
    
    this.updateAuthUI();
  }
  
  updateAuthUI() {
    const authBtn = document.getElementById('nav-auth');
    const navTrips = document.getElementById('nav-trips');
    const navProfile = document.getElementById('nav-profile');
    const navLogout = document.getElementById('nav-logout');
    const authNote = document.querySelector('.auth-requirement-note');
    
    if (this.authState.isAuthenticated && this.authState.user) {
      // User is signed in
      if (authBtn) {
        authBtn.textContent = this.authState.user.given_name || this.authState.user.email || 'Account';
      }
      
      navTrips?.classList.remove('hidden');
      navProfile?.classList.remove('hidden');
      navLogout?.classList.remove('hidden');
      
      // Hide auth requirement note
      if (authNote) {
        authNote.style.display = 'none';
      }
    } else {
      // User is not signed in
      if (authBtn) {
        authBtn.textContent = 'Sign in / Sign up';
      }
      
      navTrips?.classList.add('hidden');
      navProfile?.classList.add('hidden');
      navLogout?.classList.add('hidden');
      
      // Show auth requirement note
      if (authNote) {
        authNote.style.display = 'flex';
      }
    }
  }
  
  showNotification(message, type = 'info') {
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
  
  // Public API (compatible with Amplify Auth interface)
  getUser() {
    return this.authState.user;
  }
  
  isAuthenticated() {
    return this.authState.isAuthenticated;
  }
  
  async getSession() {
    return {
      tokens: this.authState.tokens
    };
  }
  
  showAuthModal() {
    const modal = document.getElementById('local-auth-modal');
    if (modal) {
      modal.classList.remove('hidden');
      this.switchTab('signin');
    }
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.amplifyAuth = new LocalAuthSystem();
  });
} else {
  window.amplifyAuth = new LocalAuthSystem();
}

// Add auth success style
const style = document.createElement('style');
style.textContent = `
.auth-success {
  display: none;
  margin-top: 12px;
  padding: 10px 14px;
  background: #d4edda;
  border: 1px solid #c3e6cb;
  border-radius: 6px;
  color: #155724;
  font-size: 14px;
}
`;
document.head.appendChild(style);

export default LocalAuthSystem;