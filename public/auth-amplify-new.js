// Amplify Auth Implementation
import { Amplify } from 'https://cdn.jsdelivr.net/npm/aws-amplify@6.15.5/+esm';
import { signUp, confirmSignUp, signIn, signOut, getCurrentUser } from 'https://cdn.jsdelivr.net/npm/aws-amplify@6.15.5/auth/+esm';

// Initialize Amplify - CRITICAL: This must be done before any auth operations
async function initializeAmplify() {
    try {
        const response = await fetch('/amplify_outputs.json');
        const outputs = await response.json();
        Amplify.configure(outputs);
        console.log('Amplify configured successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize Amplify:', error);
        return false;
    }
}

// Check if user is authenticated
async function checkAuthStatus() {
    try {
        const user = await getCurrentUser();
        console.log('Current user:', user);
        return user;
    } catch (error) {
        console.log('No authenticated user');
        return null;
    }
}

// Sign up new user
async function handleAmplifySignUp(email, password, firstName, lastName) {
    try {
        const { isSignUpComplete, userId, nextStep } = await signUp({
            username: email,
            password: password,
            options: {
                userAttributes: {
                    email: email,
                    given_name: firstName,
                    family_name: lastName
                }
            }
        });
        
        console.log('Sign up result:', { isSignUpComplete, userId, nextStep });
        
        if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
            return {
                success: true,
                needsConfirmation: true,
                userId: userId
            };
        }
        
        return {
            success: true,
            isSignUpComplete: isSignUpComplete
        };
    } catch (error) {
        console.error('Sign up error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Confirm sign up with verification code
async function handleAmplifyConfirmSignUp(email, code) {
    try {
        const { isSignUpComplete, nextStep } = await confirmSignUp({
            username: email,
            confirmationCode: code
        });
        
        console.log('Confirm sign up result:', { isSignUpComplete, nextStep });
        
        return {
            success: true,
            isSignUpComplete: isSignUpComplete
        };
    } catch (error) {
        console.error('Confirm sign up error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Sign in existing user
async function handleAmplifySignIn(email, password) {
    try {
        const { isSignedIn, nextStep } = await signIn({
            username: email,
            password: password
        });
        
        console.log('Sign in result:', { isSignedIn, nextStep });
        
        if (isSignedIn) {
            // Get user details
            const user = await getCurrentUser();
            return {
                success: true,
                user: user
            };
        }
        
        return {
            success: true,
            nextStep: nextStep
        };
    } catch (error) {
        console.error('Sign in error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Sign out current user
async function handleAmplifySignOut() {
    try {
        await signOut();
        console.log('User signed out successfully');
        return {
            success: true
        };
    } catch (error) {
        console.error('Sign out error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Export functions to window for use in other scripts
window.AmplifyAuth = {
    initialize: initializeAmplify,
    checkAuthStatus: checkAuthStatus,
    signUp: handleAmplifySignUp,
    confirmSignUp: handleAmplifyConfirmSignUp,
    signIn: handleAmplifySignIn,
    signOut: handleAmplifySignOut
};

// Initialize Amplify on page load
document.addEventListener('DOMContentLoaded', async () => {
    const initialized = await initializeAmplify();
    if (initialized) {
        const user = await checkAuthStatus();
        if (user) {
            console.log('User is authenticated:', user);
            // Update UI for authenticated state
            window.dispatchEvent(new CustomEvent('amplify-auth-ready', { detail: { user } }));
        } else {
            console.log('User is not authenticated');
            window.dispatchEvent(new CustomEvent('amplify-auth-ready', { detail: { user: null } }));
        }
    }
});