// Amplify Authentication System
import { Amplify } from 'aws-amplify';
import { 
  signUp, 
  signIn, 
  signOut, 
  confirmSignUp, 
  resendSignUpCode,
  getCurrentUser,
  fetchUserAttributes,
  fetchAuthSession
} from 'aws-amplify/auth';
import amplifyOutputs from '../amplify_outputs.json';

// Configure Amplify
Amplify.configure(amplifyOutputs);

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
    
    // Check for existing session
    await this.checkAuthState();
    
    // Setup UI
    this.setupUI();
    this.setupEventListeners();
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
      
      console.log('[AmplifyAuth] User authenticated:', this.authState.user);
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
    // Create auth modal if it doesn't exist
    if (!document.getElementById('amplify-auth-modal')) {
      this.createAuthModal();
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
              <div class="auth-link">
                <a href="#" id="forgot-password-link">Forgot password?</a>
              </div>
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
                <input type="tel" id="signup-phone" placeholder="Phone (optional)">
              </div>
              <div class="form-group">
                <input type="password" id="signup-password" placeholder="Password" required minlength="8">
                <small class="password-hint">Must be at least 8 characters with uppercase, lowercase, number, and symbol</small>
              </div>
              <div class="form-group">
                <input type="password" id="signup-confirm" placeholder="Confirm Password" required>
              </div>
              <button type="submit" class="auth-submit-btn">Sign Up</button>
              <div class="auth-error" id="signup-error"></div>
            </form>
            
            <!-- Verification Form -->
            <form id="amplify-verify-form" class="auth-form">
              <h2>Verify Your Email</h2>
              <p>We've sent a verification code to <span id="verify-email"></span></p>
              <div class="form-group">
                <input type="text" id="verify-code" placeholder="Enter verification code" required maxlength="6">
              </div>
              <button type="submit" class="auth-submit-btn">Verify</button>
              <div class="auth-error" id="verify-error"></div>
              <div class="auth-link">
                <a href="#" id="resend-code-link">Resend code</a>
              </div>
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
    const modal = document.getElementById('amplify-auth-modal');
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
      const signinForm = document.getElementById('amplify-signin-form');
      const signupForm = document.getElementById('amplify-signup-form');
      const verifyForm = document.getElementById('amplify-verify-form');
      
      signinForm?.addEventListener('submit', (e) => this.handleSignIn(e));
      signupForm?.addEventListener('submit', (e) => this.handleSignUp(e));
      verifyForm?.addEventListener('submit', (e) => this.handleVerification(e));
      
      // Links
      document.getElementById('forgot-password-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleForgotPassword();
      });
      
      document.getElementById('resend-code-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleResendCode();
      });
    }
  }
  
  showAuthModal() {
    const modal = document.getElementById('amplify-auth-modal');
    if (modal) {
      modal.classList.remove('hidden');
      this.switchTab('signin');
    }
  }
  
  hideAuthModal() {
    const modal = document.getElementById('amplify-auth-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }
  
  switchTab(tabName) {
    const modal = document.getElementById('amplify-auth-modal');
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
      if (form.id === `amplify-${tabName}-form`) {
        form.classList.add('active');
      } else {
        form.classList.remove('active');
      }
    });
  }
  
  async handleSignIn(event) {
    event.preventDefault();
    
    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;
    const errorDiv = document.getElementById('signin-error');
    
    try {
      errorDiv.textContent = '';
      errorDiv.style.display = 'none';
      
      const { isSignedIn, nextStep } = await signIn({
        username: email,
        password: password
      });
      
      if (isSignedIn) {
        console.log('[AmplifyAuth] Sign in successful');
        await this.checkAuthState();
        this.hideAuthModal();
        this.showNotification('Successfully signed in!', 'success');
      } else {
        // Handle additional steps if needed (MFA, etc.)
        console.log('[AmplifyAuth] Additional steps required:', nextStep);
        this.handleNextStep(nextStep);
      }
    } catch (error) {
      console.error('[AmplifyAuth] Sign in error:', error);
      errorDiv.textContent = error.message || 'Sign in failed';
      errorDiv.style.display = 'block';
    }
  }
  
  async handleSignUp(event) {
    event.preventDefault();
    
    const firstName = document.getElementById('signup-firstname').value;
    const lastName = document.getElementById('signup-lastname').value;
    const email = document.getElementById('signup-email').value;
    const phone = document.getElementById('signup-phone').value;
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
      errorDiv.textContent = '';
      errorDiv.style.display = 'none';
      
      const signUpOptions = {
        username: email,
        password: password,
        options: {
          userAttributes: {
            email: email,
            given_name: firstName,
            family_name: lastName
          }
        }
      };
      
      // Add phone if provided
      if (phone) {
        signUpOptions.options.userAttributes.phone_number = phone;
      }
      
      const { isSignUpComplete, userId, nextStep } = await signUp(signUpOptions);
      
      console.log('[AmplifyAuth] Sign up response:', { isSignUpComplete, userId, nextStep });
      
      if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        // Store email for verification
        this.pendingVerificationEmail = email;
        
        // Show verification form
        document.getElementById('verify-email').textContent = email;
        this.switchTab('verify');
        
        this.showNotification('Verification code sent to your email', 'info');
      } else if (isSignUpComplete) {
        // Auto sign-in if enabled
        await this.handleSignIn({ 
          preventDefault: () => {}, 
          target: { 
            querySelector: () => ({ value: email }) 
          } 
        });
      }
    } catch (error) {
      console.error('[AmplifyAuth] Sign up error:', error);
      errorDiv.textContent = error.message || 'Sign up failed';
      errorDiv.style.display = 'block';
    }
  }
  
  async handleVerification(event) {
    event.preventDefault();
    
    const code = document.getElementById('verify-code').value;
    const errorDiv = document.getElementById('verify-error');
    
    try {
      errorDiv.textContent = '';
      errorDiv.style.display = 'none';
      
      const { isSignUpComplete } = await confirmSignUp({
        username: this.pendingVerificationEmail,
        confirmationCode: code
      });
      
      if (isSignUpComplete) {
        this.showNotification('Email verified successfully! Please sign in.', 'success');
        this.switchTab('signin');
        
        // Pre-fill email
        document.getElementById('signin-email').value = this.pendingVerificationEmail;
      }
    } catch (error) {
      console.error('[AmplifyAuth] Verification error:', error);
      errorDiv.textContent = error.message || 'Verification failed';
      errorDiv.style.display = 'block';
    }
  }
  
  async handleResendCode() {
    try {
      await resendSignUpCode({
        username: this.pendingVerificationEmail
      });
      
      this.showNotification('Verification code resent', 'info');
    } catch (error) {
      console.error('[AmplifyAuth] Resend code error:', error);
      this.showNotification('Failed to resend code', 'error');
    }
  }
  
  async handleSignOut() {
    try {
      await signOut();
      
      this.authState.user = null;
      this.authState.isAuthenticated = false;
      
      this.updateAuthUI();
      this.showNotification('Signed out successfully', 'info');
      
      // Redirect to home
      window.location.href = '/';
    } catch (error) {
      console.error('[AmplifyAuth] Sign out error:', error);
      this.showNotification('Sign out failed', 'error');
    }
  }
  
  async handleForgotPassword() {
    // TODO: Implement password reset flow
    this.showNotification('Password reset coming soon', 'info');
  }
  
  handleNextStep(nextStep) {
    // Handle additional authentication steps
    switch (nextStep.signInStep) {
      case 'CONFIRM_SIGN_IN_WITH_SMS_CODE':
      case 'CONFIRM_SIGN_IN_WITH_TOTP_CODE':
      case 'CONFIRM_SIGN_IN_WITH_EMAIL_CODE':
        // Show MFA input
        this.showNotification('MFA required - feature coming soon', 'info');
        break;
      case 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED':
        // Show new password form
        this.showNotification('New password required - feature coming soon', 'info');
        break;
      default:
        console.log('[AmplifyAuth] Unhandled next step:', nextStep);
    }
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
  
  // Public API
  getUser() {
    return this.authState.user;
  }
  
  isAuthenticated() {
    return this.authState.isAuthenticated;
  }
  
  async getSession() {
    try {
      return await fetchAuthSession();
    } catch (error) {
      console.error('[AmplifyAuth] Failed to get session:', error);
      return null;
    }
  }
  
  // Expose showAuthModal publicly
  showAuthModal() {
    const modal = document.getElementById('amplify-auth-modal');
    if (modal) {
      modal.classList.remove('hidden');
      this.switchTab('signin');
    }
  }
  
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.amplifyAuth = new AmplifyAuthSystem();
  });
} else {
  window.amplifyAuth = new AmplifyAuthSystem();
}

// Export for use in other modules
export default AmplifyAuthSystem;