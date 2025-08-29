// Unified Amplify Authentication System
import { Amplify } from 'https://cdn.jsdelivr.net/npm/aws-amplify@6/+esm';
import { 
  signUp, 
  signIn, 
  signOut, 
  confirmSignUp, 
  resendSignUpCode,
  getCurrentUser,
  fetchUserAttributes,
  fetchAuthSession
} from 'https://cdn.jsdelivr.net/npm/aws-amplify@6/auth/+esm';

// Load configuration from root directory
async function loadAmplifyConfig() {
  try {
    const response = await fetch('/api/amplify-config');
    if (!response.ok) {
      throw new Error('Failed to load Amplify configuration');
    }
    const config = await response.json();
    return config;
  } catch (error) {
    console.error('[AmplifyAuth] Failed to load configuration:', error);
    throw error;
  }
}

class AmplifyAuthSystem {
  constructor() {
    this.authState = {
      user: null,
      isAuthenticated: false,
      isLoading: true
    };
    
    this.init();
  }
  
  async init() {
    console.log('[AmplifyAuth] Initializing authentication...');
    
    try {
      // Load and configure Amplify
      const config = await loadAmplifyConfig();
      Amplify.configure(config);
      
      // Check for existing session
      await this.checkAuthState();
      
      // Setup UI
      this.setupUI();
      this.setupEventListeners();
    } catch (error) {
      console.error('[AmplifyAuth] Initialization failed:', error);
      this.authState.isLoading = false;
      this.showError('Authentication service unavailable');
    }
  }
  
  async checkAuthState() {
    try {
      const user = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      
      this.authState.user = {
        username: user.username,
        userId: user.userId,
        ...attributes
      };
      this.authState.isAuthenticated = true;
      
      console.log('[AmplifyAuth] User authenticated:', this.authState.user.email);
      this.updateAuthUI();
    } catch (error) {
      console.log('[AmplifyAuth] No authenticated user');
      this.authState.isAuthenticated = false;
      this.authState.user = null;
    } finally {
      this.authState.isLoading = false;
      this.updateAuthUI();
    }
  }
  
  setupUI() {
    // Check if auth UI already exists in page
    const existingModal = document.getElementById('login-modal');
    if (existingModal) {
      // Use existing modal structure
      this.modal = existingModal;
      this.enhanceExistingModal();
    } else {
      // Create new modal if needed
      this.createAuthModal();
    }
  }
  
  enhanceExistingModal() {
    // Update existing modal to use Amplify auth
    const form = document.getElementById('auth-form');
    if (form) {
      // Remove old event listener and add new one
      const newForm = form.cloneNode(true);
      form.parentNode.replaceChild(newForm, form);
      
      newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSignIn(e);
      });
    }
  }
  
  createAuthModal() {
    const modalHTML = `
      <div id="amplify-auth-modal" class="auth-modal-overlay hidden">
        <div class="auth-modal-container">
          <button class="auth-modal-close">&times;</button>
          
          <div class="auth-tabs">
            <button class="auth-tab active" data-tab="signin">Sign In</button>
            <button class="auth-tab" data-tab="signup">Sign Up</button>
          </div>
          
          <div class="auth-content">
            <!-- Sign In Form -->
            <form id="amplify-signin-form" class="auth-form active">
              <h2>Welcome Back</h2>
              <div class="form-group">
                <input type="email" id="signin-email" placeholder="Email" required>
              </div>
              <div class="form-group">
                <input type="password" id="signin-password" placeholder="Password" required>
              </div>
              <button type="submit" class="auth-submit-btn">Sign In</button>
              <div class="auth-error" id="signin-error"></div>
            </form>
            
            <!-- Sign Up Form -->
            <form id="amplify-signup-form" class="auth-form">
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
                <input type="password" id="signup-password" placeholder="Password" required>
                <small>Min 8 chars, include uppercase, lowercase, number & symbol</small>
              </div>
              <button type="submit" class="auth-submit-btn">Sign Up</button>
              <div class="auth-error" id="signup-error"></div>
            </form>
            
            <!-- Verification Form -->
            <form id="amplify-verify-form" class="auth-form">
              <h2>Verify Your Email</h2>
              <p>We've sent a verification code to your email</p>
              <div class="form-group">
                <input type="text" id="verify-code" placeholder="Verification Code" required>
              </div>
              <button type="submit" class="auth-submit-btn">Verify</button>
              <button type="button" id="resend-code" class="link-btn">Resend Code</button>
              <div class="auth-error" id="verify-error"></div>
            </form>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('amplify-auth-modal');
  }
  
  setupEventListeners() {
    // Auth button in nav
    const authBtn = document.getElementById('nav-auth');
    if (authBtn) {
      authBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.showModal();
      });
    }
    
    // Tab switching
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });
    
    // Sign In form
    const signinForm = document.getElementById('amplify-signin-form') || document.getElementById('auth-form');
    if (signinForm) {
      signinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSignIn(e);
      });
    }
    
    // Sign Up form
    const signupForm = document.getElementById('amplify-signup-form');
    if (signupForm) {
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSignUp(e);
      });
    }
    
    // Verify form
    const verifyForm = document.getElementById('amplify-verify-form');
    if (verifyForm) {
      verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleVerification(e);
      });
      
      document.getElementById('resend-code')?.addEventListener('click', async () => {
        await this.resendVerificationCode();
      });
    }
    
    // Close modal
    document.querySelectorAll('.auth-modal-close, .auth-close').forEach(btn => {
      btn.addEventListener('click', () => this.hideModal());
    });
    
    // Close on backdrop click
    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal || e.target.classList.contains('auth-backdrop')) {
        this.hideModal();
      }
    });
    
    // Sign out button
    document.getElementById('sign-out-btn')?.addEventListener('click', async () => {
      await this.handleSignOut();
    });
  }
  
  async handleSignIn(e) {
    const email = document.getElementById('signin-email')?.value || 
                  document.getElementById('auth-email')?.value;
    const password = document.getElementById('signin-password')?.value ||
                     document.getElementById('auth-password')?.value;
    
    if (!email || !password) {
      this.showError('Please enter email and password', 'signin');
      return;
    }
    
    try {
      this.showLoading(true);
      const result = await signIn({
        username: email,
        password
      });
      
      if (result.isSignedIn) {
        console.log('[AmplifyAuth] Sign in successful');
        await this.checkAuthState();
        this.hideModal();
        this.showSuccess('Successfully signed in!');
      } else if (result.nextStep) {
        console.log('[AmplifyAuth] Additional step required:', result.nextStep);
        // Handle MFA or other steps if needed
      }
    } catch (error) {
      console.error('[AmplifyAuth] Sign in failed:', error);
      this.showError(error.message || 'Invalid email or password', 'signin');
    } finally {
      this.showLoading(false);
    }
  }
  
  async handleSignUp(e) {
    const firstName = document.getElementById('signup-firstname').value;
    const lastName = document.getElementById('signup-lastname').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    
    try {
      this.showLoading(true);
      const result = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            given_name: firstName,
            family_name: lastName
          }
        }
      });
      
      if (result.nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        console.log('[AmplifyAuth] Sign up successful, verification needed');
        this.pendingEmail = email;
        this.switchTab('verify');
      }
    } catch (error) {
      console.error('[AmplifyAuth] Sign up failed:', error);
      this.showError(error.message || 'Sign up failed', 'signup');
    } finally {
      this.showLoading(false);
    }
  }
  
  async handleVerification(e) {
    const code = document.getElementById('verify-code').value;
    
    if (!this.pendingEmail) {
      this.showError('No pending verification', 'verify');
      return;
    }
    
    try {
      this.showLoading(true);
      await confirmSignUp({
        username: this.pendingEmail,
        confirmationCode: code
      });
      
      console.log('[AmplifyAuth] Email verified successfully');
      this.showSuccess('Email verified! Please sign in.');
      this.switchTab('signin');
    } catch (error) {
      console.error('[AmplifyAuth] Verification failed:', error);
      this.showError(error.message || 'Invalid verification code', 'verify');
    } finally {
      this.showLoading(false);
    }
  }
  
  async resendVerificationCode() {
    if (!this.pendingEmail) return;
    
    try {
      await resendSignUpCode({
        username: this.pendingEmail
      });
      this.showSuccess('Verification code resent!');
    } catch (error) {
      console.error('[AmplifyAuth] Resend failed:', error);
      this.showError('Failed to resend code', 'verify');
    }
  }
  
  async handleSignOut() {
    try {
      await signOut();
      this.authState.user = null;
      this.authState.isAuthenticated = false;
      this.updateAuthUI();
      console.log('[AmplifyAuth] User signed out');
      window.location.href = '/';
    } catch (error) {
      console.error('[AmplifyAuth] Sign out failed:', error);
    }
  }
  
  switchTab(tabName) {
    // Update tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Update forms
    document.querySelectorAll('.auth-form').forEach(form => {
      form.classList.toggle('active', form.id.includes(tabName));
    });
    
    // Clear errors
    document.querySelectorAll('.auth-error').forEach(err => {
      err.textContent = '';
    });
  }
  
  showModal() {
    if (this.modal) {
      this.modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
  }
  
  hideModal() {
    if (this.modal) {
      this.modal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }
  
  showError(message, form) {
    const errorEl = document.getElementById(`${form}-error`) || 
                   document.querySelector('.auth-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }
  
  showSuccess(message) {
    // Could show a toast notification
    console.log('[AmplifyAuth]', message);
  }
  
  showLoading(show) {
    const buttons = document.querySelectorAll('.auth-submit-btn');
    buttons.forEach(btn => {
      btn.disabled = show;
      btn.textContent = show ? 'Loading...' : btn.dataset.originalText || 'Submit';
      if (!show) btn.dataset.originalText = btn.textContent;
    });
  }
  
  updateAuthUI() {
    const authBtn = document.getElementById('nav-auth');
    const userMenu = document.getElementById('user-menu');
    
    if (this.authState.isAuthenticated) {
      // Hide auth button, show user menu
      if (authBtn) authBtn.style.display = 'none';
      
      // Create or update user menu
      if (!userMenu) {
        const userMenuHTML = `
          <div id="user-menu" class="dropdown-item">
            <span>${this.authState.user?.email || 'User'}</span>
            <button id="sign-out-btn" class="link-btn">Sign Out</button>
          </div>
        `;
        document.getElementById('nav-dropdown')?.insertAdjacentHTML('beforeend', userMenuHTML);
        
        document.getElementById('sign-out-btn')?.addEventListener('click', async () => {
          await this.handleSignOut();
        });
      }
    } else {
      // Show auth button, hide user menu
      if (authBtn) authBtn.style.display = 'flex';
      if (userMenu) userMenu.remove();
    }
  }
  
  // Public method to check if user is authenticated
  isAuthenticated() {
    return this.authState.isAuthenticated;
  }
  
  // Public method to get current user
  getUser() {
    return this.authState.user;
  }
}

// Initialize auth system when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.amplifyAuth = new AmplifyAuthSystem();
  });
} else {
  window.amplifyAuth = new AmplifyAuthSystem();
}

// Export for use in other modules
export default AmplifyAuthSystem;