// Authentication Guard for Pathfind
// Ensures users are logged in before accessing protected features

class AuthGuard {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.amplifyConfigured = false;
        this.dataClient = null;
        this.init();
    }

    async init() {
        console.log('[AuthGuard] Initializing authentication guard...');
        
        try {
            // Check if Amplify is available globally (loaded via script tag)
            if (typeof window.Amplify !== 'undefined') {
                // Use globally loaded Amplify
                this.setupAmplifyFromGlobal();
            } else {
                // Try CDN import as fallback
                await this.setupAmplifyFromCDN();
            }
            
            console.log('[AuthGuard] Initialized successfully');
            
        } catch (error) {
            console.error('[AuthGuard] Initialization failed:', error);
            // Set a flag to indicate limited functionality
            this.amplifyConfigured = false;
        }
    }

    async setupAmplifyFromGlobal() {
        // Load Amplify config
        const response = await fetch('/amplify_outputs.json');
        const outputs = await response.json();
        
        // Configure Amplify using global object
        const config = {
            Auth: {
                Cognito: {
                    userPoolId: outputs.auth.user_pool_id,
                    userPoolClientId: outputs.auth.user_pool_client_id,
                    identityPoolId: outputs.auth.identity_pool_id,
                    region: outputs.auth.aws_region
                }
            },
            API: {
                GraphQL: {
                    endpoint: outputs.data.url,
                    region: outputs.data.aws_region,
                    defaultAuthMode: outputs.data.default_authorization_type
                }
            }
        };
        
        window.Amplify.configure(config);
        this.dataClient = window.AmplifyAPI?.generateClient?.();
        this.amplifyConfigured = true;
        
        // Check current authentication status
        await this.checkAuthStatus();
    }

    async setupAmplifyFromCDN() {
        // Simplified CDN import without specific version pinning
        const { Amplify } = await import('https://cdn.skypack.dev/aws-amplify');
        
        // Load Amplify config
        const response = await fetch('/amplify_outputs.json');
        const outputs = await response.json();
        
        // Configure Amplify
        const config = {
            Auth: {
                Cognito: {
                    userPoolId: outputs.auth.user_pool_id,
                    userPoolClientId: outputs.auth.user_pool_client_id,
                    identityPoolId: outputs.auth.identity_pool_id,
                    region: outputs.auth.aws_region
                }
            },
            API: {
                GraphQL: {
                    endpoint: outputs.data.url,
                    region: outputs.data.aws_region,
                    defaultAuthMode: outputs.data.default_authorization_type
                }
            }
        };
        
        Amplify.configure(config);
        this.amplifyConfigured = true;
        
        // Check current authentication status
        await this.checkAuthStatus();
    }

    async checkAuthStatus() {
        try {
            // Try different methods to get user info
            let user, attributes;
            
            if (window.AmplifyAuth && typeof window.AmplifyAuth.getCurrentUser === 'function') {
                // Use globally available Amplify Auth
                user = await window.AmplifyAuth.getCurrentUser();
                attributes = await window.AmplifyAuth.fetchUserAttributes?.();
            } else {
                // Try safer CDN import
                const authModule = await import('https://cdn.skypack.dev/@aws-amplify/auth');
                user = await authModule.getCurrentUser();
                attributes = await authModule.fetchUserAttributes?.();
            }
            
            this.isAuthenticated = true;
            this.currentUser = {
                userId: user.userId || user.sub,
                username: user.username,
                attributes: attributes || {}
            };
            
            console.log('[AuthGuard] User authenticated:', this.currentUser);
            
        } catch (error) {
            this.isAuthenticated = false;
            this.currentUser = null;
            console.log('[AuthGuard] User not authenticated:', error.message);
        }
    }

    // Main authentication check method
    async requireAuth(actionName = 'perform this action') {
        console.log('[AuthGuard] requireAuth called for:', actionName);
        
        // If Amplify is not configured, always require authentication
        if (!this.amplifyConfigured) {
            console.log('[AuthGuard] Amplify not configured, showing auth modal');
            this.showAuthRequiredModal(actionName);
            return false;
        }

        // Recheck auth status
        try {
            await this.checkAuthStatus();
        } catch (error) {
            console.log('[AuthGuard] Error checking auth status:', error);
            this.isAuthenticated = false;
        }

        if (!this.isAuthenticated) {
            console.log('[AuthGuard] User not authenticated, showing auth modal');
            this.showAuthRequiredModal(actionName);
            return false;
        }

        console.log('[AuthGuard] User authenticated, allowing action');
        return true;
    }

    // Show modal requiring authentication
    showAuthRequiredModal(actionName) {
        // Create and show modal
        const modal = document.createElement('div');
        modal.className = 'auth-required-modal';
        modal.innerHTML = `
            <div class="auth-modal-overlay">
                <div class="auth-modal-content">
                    <div class="auth-modal-header">
                        <h3>🔐 Authentication Required</h3>
                        <button class="auth-modal-close" onclick="this.closest('.auth-required-modal').remove()">×</button>
                    </div>
                    <div class="auth-modal-body">
                        <p>You need to be logged in to ${actionName}.</p>
                        <p>Create an account or sign in to continue.</p>
                    </div>
                    <div class="auth-modal-footer">
                        <button class="auth-btn auth-btn-primary" onclick="window.location.href='/auth-with-db.html'">
                            Sign In / Sign Up
                        </button>
                        <button class="auth-btn auth-btn-secondary" onclick="this.closest('.auth-required-modal').remove()">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add styles
        this.addModalStyles();
    }

    addModalStyles() {
        if (document.getElementById('auth-guard-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'auth-guard-styles';
        styles.textContent = `
            .auth-required-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .auth-modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(5px);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }

            .auth-modal-content {
                background: white;
                border-radius: 15px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                max-width: 450px;
                width: 100%;
                animation: authModalSlideIn 0.3s ease-out;
            }

            @keyframes authModalSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .auth-modal-header {
                padding: 25px 25px 15px;
                border-bottom: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .auth-modal-header h3 {
                margin: 0;
                color: #333;
                font-size: 20px;
            }

            .auth-modal-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #999;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .auth-modal-close:hover {
                color: #333;
            }

            .auth-modal-body {
                padding: 20px 25px;
            }

            .auth-modal-body p {
                margin: 0 0 15px 0;
                color: #666;
                line-height: 1.5;
            }

            .auth-modal-body p:last-child {
                margin-bottom: 0;
            }

            .auth-modal-footer {
                padding: 15px 25px 25px;
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }

            .auth-btn {
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }

            .auth-btn-primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }

            .auth-btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
            }

            .auth-btn-secondary {
                background: #f8f9fa;
                color: #666;
                border: 1px solid #ddd;
            }

            .auth-btn-secondary:hover {
                background: #e9ecef;
            }
        `;
        
        document.head.appendChild(styles);
    }

    // Protected trip creation
    async createAuthenticatedTrip(tripData) {
        if (!(await this.requireAuth('create a trip'))) {
            throw new Error('Authentication required');
        }

        try {
            // Create trip using GraphQL with proper authentication
            const result = await this.dataClient.models.Trip.create({
                name: tripData.name,
                shareCode: this.generateShareCode(),
                destinationCity: tripData.destinationCity,
                departureCity: tripData.departureCity || null,
                startDate: tripData.startDate,
                endDate: tripData.endDate,
                groupSize: tripData.groupSize || 2,
                description: tripData.description || null
            });

            console.log('[AuthGuard] Authenticated trip created:', result);
            return result.data;
            
        } catch (error) {
            console.error('[AuthGuard] Failed to create authenticated trip:', error);
            throw error;
        }
    }

    // Generate unique share code
    generateShareCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    // Get current user info
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if authenticated
    isUserAuthenticated() {
        console.log('[AuthGuard] isUserAuthenticated check:', {
            isAuthenticated: this.isAuthenticated,
            hasCurrentUser: !!this.currentUser,
            amplifyConfigured: this.amplifyConfigured
        });
        
        // If Amplify isn't configured, user is definitely not authenticated
        if (!this.amplifyConfigured) {
            return false;
        }
        
        // Check both the flag and user object
        return this.isAuthenticated && this.currentUser !== null;
    }
}

// Create global instance
window.authGuard = new AuthGuard();

// Export for use in other scripts
window.AuthGuard = AuthGuard;