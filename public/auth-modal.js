'use strict';

(function() {
    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuthModal);
    } else {
        initAuthModal();
    }

    function initAuthModal() {
        console.log('[AuthModal] Initializing...');
        
        // Setup dropdown menu
        setupDropdownMenu();
        
        const elements = {
            modal: document.getElementById('login-modal'),
            backdrop: document.querySelector('.auth-backdrop'),
            closeBtn: document.querySelector('.auth-close'),
            authBtn: document.getElementById('nav-auth'),
            form: document.getElementById('auth-form'),
            phoneInput: document.getElementById('auth-phone'),
            emailInput: document.getElementById('auth-email'),
            countrySelect: document.getElementById('country-code'),
            socialBtns: document.querySelectorAll('.social-btn')
        };
        
        // Check if modal exists
        if (!elements.modal) {
            console.warn('[AuthModal] Modal element not found');
            return;
        }
        
        // Show modal function
        function showModal() {
            elements.modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Prevent background scroll
            
            // Focus first input after animation
            setTimeout(() => {
                elements.phoneInput?.focus();
            }, 300);
        }
        
        // Hide modal function
        function hideModal() {
            elements.modal.classList.add('hidden');
            document.body.style.overflow = ''; // Restore scroll
            
            // Clear form
            if (elements.form) {
                elements.form.reset();
            }
        }
        
        // Setup trigger for combined auth button
        if (elements.authBtn) {
            elements.authBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // Close dropdown first
                const dropdown = document.getElementById('nav-dropdown');
                if (dropdown) dropdown.classList.add('hidden');
                showModal();
            });
        }
        
        // Close button
        if (elements.closeBtn) {
            elements.closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                hideModal();
            });
        }
        
        // Backdrop click - fix for clicking backdrop
        if (elements.modal) {
            elements.modal.addEventListener('click', (e) => {
                // Check if click was on the modal background (not the card)
                if (e.target === elements.modal || e.target.classList.contains('auth-backdrop')) {
                    hideModal();
                }
            });
        }
        
        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !elements.modal.classList.contains('hidden')) {
                hideModal();
            }
        });
        
        // Form submission
        if (elements.form) {
            elements.form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const phone = elements.phoneInput?.value;
                const email = elements.emailInput?.value;
                const countryCode = elements.countrySelect?.value;
                
                if (!phone && !email) {
                    alert('Please enter a phone number or email address');
                    return;
                }
                
                // Here you would handle authentication
                console.log('[AuthModal] Auth attempt:', { phone, email, countryCode });
                
                // For demo: just close modal and show success
                hideModal();
                
                // Update UI to show logged in state
                updateAuthUI(true);
            });
        }
        
        // Social login buttons
        elements.socialBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const provider = btn.classList.contains('google-btn') ? 'Google' :
                               btn.classList.contains('facebook-btn') ? 'Facebook' :
                               btn.classList.contains('apple-btn') ? 'Apple' : 'Unknown';
                
                console.log(`[AuthModal] Social login with ${provider}`);
                
                // Here you would handle OAuth flow
                // For demo: just close modal
                hideModal();
                updateAuthUI(true);
            });
        });
        
        // Phone number formatting
        if (elements.phoneInput) {
            elements.phoneInput.addEventListener('input', (e) => {
                // Basic phone number formatting
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 0) {
                    if (value.length <= 3) {
                        value = value;
                    } else if (value.length <= 6) {
                        value = value.slice(0, 3) + ' ' + value.slice(3);
                    } else {
                        value = value.slice(0, 3) + ' ' + value.slice(3, 6) + ' ' + value.slice(6, 10);
                    }
                }
                e.target.value = value;
            });
        }
        
        // Update UI for auth state
        function updateAuthUI(isLoggedIn) {
            const loginBtn = document.getElementById('nav-login');
            const signupBtn = document.getElementById('nav-signup');
            
            if (isLoggedIn) {
                // Hide login/signup buttons
                if (loginBtn) loginBtn.style.display = 'none';
                if (signupBtn) signupBtn.style.display = 'none';
                
                // You could show a user menu here
                console.log('[AuthModal] User logged in');
            } else {
                // Show login/signup buttons
                if (loginBtn) loginBtn.style.display = 'block';
                if (signupBtn) signupBtn.style.display = 'block';
            }
        }
        
        // Remove login requirement for search button
        // The search button will now go directly to trip planning
        
        console.log('[AuthModal] Initialization complete');
    }
    
    function setupDropdownMenu() {
        const menuBtn = document.getElementById('menu-btn');
        const dropdown = document.getElementById('nav-dropdown');
        const globeBtn = document.getElementById('globe-btn');
        const langDropdown = document.getElementById('language-dropdown');
        
        if (!menuBtn || !dropdown) {
            console.warn('[AuthModal] Menu elements not found');
            return;
        }
        
        // Toggle dropdown on menu button click
        menuBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
            // Close language dropdown if open
            if (langDropdown) langDropdown.classList.add('hidden');
        });
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#menu-btn') && !e.target.closest('#nav-dropdown')) {
                dropdown.classList.add('hidden');
            }
            if (!e.target.closest('.language-selector')) {
                if (langDropdown) langDropdown.classList.add('hidden');
            }
        });
        
        // Close dropdown when selecting an item
        const dropdownItems = dropdown.querySelectorAll('.dropdown-item');
        dropdownItems.forEach(item => {
            // Don't close for auth button - it opens modal
            if (item.id !== 'nav-auth') {
                item.addEventListener('click', () => {
                    dropdown.classList.add('hidden');
                });
            }
        });
        
        // Globe button handler for language selection
        if (globeBtn && langDropdown) {
            globeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                langDropdown.classList.toggle('hidden');
                // Close nav dropdown if open
                dropdown.classList.add('hidden');
            });
            
            // Handle language selection
            const langItems = langDropdown.querySelectorAll('.language-item');
            langItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    
                    // Remove active class from all items
                    langItems.forEach(lang => lang.classList.remove('active'));
                    // Add active class to clicked item
                    item.classList.add('active');
                    
                    const selectedLang = item.dataset.lang;
                    const langName = item.querySelector('.lang-name').textContent;
                    
                    console.log(`[Language] Selected: ${langName} (${selectedLang})`);
                    
                    // Store language preference
                    localStorage.setItem('selectedLanguage', selectedLang);
                    
                    // Close dropdown after selection
                    setTimeout(() => {
                        langDropdown.classList.add('hidden');
                    }, 150);
                    
                    // Here you would typically trigger translation
                    // For now, just show a message
                    if (selectedLang !== 'en') {
                        console.log(`[Language] Translation to ${langName} would happen here`);
                    }
                });
            });
            
            // Set initial language from localStorage
            const savedLang = localStorage.getItem('selectedLanguage');
            if (savedLang) {
                langItems.forEach(item => {
                    if (item.dataset.lang === savedLang) {
                        langItems.forEach(lang => lang.classList.remove('active'));
                        item.classList.add('active');
                    }
                });
            }
        }
    }
})();