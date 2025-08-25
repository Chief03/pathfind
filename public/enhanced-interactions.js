// Additional Enhanced Interactions
document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    // Add interactivity to the search page
    enhanceSearchPage();
    
    // Add interactivity to the dashboard
    enhanceDashboard();
    
    // Add form enhancements
    enhanceForms();
    
    // Add animation triggers
    addAnimationTriggers();
    
    // Add interactive feedback
    addInteractiveFeedback();
    
    function enhanceSearchPage() {
        // Animate the search form on load
        const searchContainer = document.querySelector('.search-container');
        if (searchContainer) {
            searchContainer.style.opacity = '0';
            searchContainer.style.transform = 'translateY(20px)';
            setTimeout(() => {
                searchContainer.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                searchContainer.style.opacity = '1';
                searchContainer.style.transform = 'translateY(0)';
            }, 100);
        }
        
        // Add interactive hover effects to input fields
        const inputFields = document.querySelectorAll('input, textarea, select');
        inputFields.forEach(field => {
            field.addEventListener('focus', function() {
                this.parentElement?.classList.add('focused');
                // Add subtle scale animation
                this.style.transform = 'scale(1.01)';
            });
            
            field.addEventListener('blur', function() {
                this.parentElement?.classList.remove('focused');
                this.style.transform = 'scale(1)';
            });
        });
        
        // Enhance the search button
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            searchBtn.classList.add('btn-interactive');
            searchBtn.addEventListener('click', function() {
                // Add loading state
                const originalText = this.textContent;
                this.innerHTML = '<span class="loading-dots"><span></span><span></span><span></span></span>';
                this.disabled = true;
                
                // Restore after animation
                setTimeout(() => {
                    this.textContent = originalText;
                    this.disabled = false;
                }, 1000);
            });
        }
    }
    
    function enhanceDashboard() {
        // Add interactive cards
        const overviewCards = document.querySelectorAll('.overview-card');
        overviewCards.forEach((card, index) => {
            card.classList.add('card-interactive');
            card.style.animationDelay = `${index * 0.1}s`;
            
            // Add click feedback
            card.addEventListener('click', function(e) {
                if (!e.target.closest('button') && !e.target.closest('input')) {
                    this.classList.add('bounce');
                    setTimeout(() => this.classList.remove('bounce'), 500);
                }
            });
        });
        
        // Enhance quick action buttons
        const quickActions = document.querySelectorAll('.quick-action-btn');
        quickActions.forEach(btn => {
            btn.classList.add('pulse');
            btn.addEventListener('mouseenter', () => {
                btn.classList.remove('pulse');
            });
        });
        
        // Animate progress bar changes
        const progressBar = document.querySelector('.progress-fill');
        if (progressBar) {
            const observer = new MutationObserver(() => {
                progressBar.classList.add('glow');
                setTimeout(() => progressBar.classList.remove('glow'), 1000);
            });
            observer.observe(progressBar, { attributes: true, attributeFilter: ['style'] });
        }
        
        // Make activity feed items interactive
        const activityItems = document.querySelectorAll('.activity-item');
        activityItems.forEach(item => {
            item.style.cursor = 'pointer';
            item.addEventListener('click', function() {
                this.style.background = 'var(--surface-hover)';
                setTimeout(() => {
                    this.style.background = '';
                }, 200);
            });
        });
        
        // Add typewriter effect to trip name
        const tripName = document.querySelector('.trip-name');
        if (tripName && !tripName.hasAttribute('data-typewriter')) {
            tripName.setAttribute('data-typewriter', 'true');
        }
    }
    
    function enhanceForms() {
        // Add floating labels
        const formGroups = document.querySelectorAll('.form-group');
        formGroups.forEach(group => {
            const input = group.querySelector('input, textarea, select');
            const label = group.querySelector('label');
            
            if (input && label) {
                // Check if input has value on load
                if (input.value) {
                    group.classList.add('has-value');
                }
                
                input.addEventListener('input', function() {
                    if (this.value) {
                        group.classList.add('has-value');
                    } else {
                        group.classList.remove('has-value');
                    }
                });
            }
        });
        
        // Add character counter for textareas
        const textareas = document.querySelectorAll('textarea[maxlength]');
        textareas.forEach(textarea => {
            const maxLength = textarea.getAttribute('maxlength');
            const counter = document.createElement('div');
            counter.className = 'char-counter';
            counter.textContent = `0 / ${maxLength}`;
            textarea.parentElement?.appendChild(counter);
            
            textarea.addEventListener('input', function() {
                counter.textContent = `${this.value.length} / ${maxLength}`;
                if (this.value.length > maxLength * 0.9) {
                    counter.style.color = '#EF4444';
                } else {
                    counter.style.color = 'var(--text-secondary)';
                }
            });
        });
    }
    
    function addAnimationTriggers() {
        // Add scroll-triggered animations
        const animateOnScroll = document.querySelectorAll('[data-animate]');
        const scrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const animationType = entry.target.dataset.animate;
                    entry.target.classList.add(animationType);
                    scrollObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        
        animateOnScroll.forEach(el => scrollObserver.observe(el));
        
        // Add hover animations to buttons
        const allButtons = document.querySelectorAll('button:not(.no-animate)');
        allButtons.forEach(btn => {
            if (!btn.classList.contains('btn-interactive')) {
                btn.classList.add('btn-interactive');
            }
        });
    }
    
    function addInteractiveFeedback() {
        // Add haptic feedback simulation (visual feedback)
        const clickableElements = document.querySelectorAll('button, .clickable, input[type="checkbox"], input[type="radio"]');
        clickableElements.forEach(el => {
            el.addEventListener('click', function() {
                // Add micro animation
                this.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 100);
                
                // Try to use vibration API if available
                if ('vibrate' in navigator) {
                    navigator.vibrate(10);
                }
            });
        });
        
        // Add success feedback for checkbox interactions
        const checkboxes = document.querySelectorAll('.progress-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                if (this.checked) {
                    // Create success animation
                    const successIcon = document.createElement('span');
                    successIcon.innerHTML = '✓';
                    successIcon.style.position = 'absolute';
                    successIcon.style.color = '#10B981';
                    successIcon.style.fontSize = '24px';
                    successIcon.style.fontWeight = 'bold';
                    successIcon.style.animation = 'fadeInScale 0.5s ease';
                    
                    const rect = this.getBoundingClientRect();
                    successIcon.style.left = rect.left + 'px';
                    successIcon.style.top = rect.top + 'px';
                    document.body.appendChild(successIcon);
                    
                    setTimeout(() => successIcon.remove(), 500);
                    
                    // Check if all checkboxes are checked
                    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
                    if (allChecked && window.createConfetti) {
                        window.createConfetti();
                        if (window.showNotification) {
                            window.showNotification('🎉 Amazing!', 'You\'ve completed all planning steps!');
                        }
                    }
                }
            });
        });
        
        // Add copy feedback
        const copyButtons = document.querySelectorAll('.copy-code-btn');
        copyButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const originalText = this.innerHTML;
                this.innerHTML = '✓';
                this.style.color = '#10B981';
                setTimeout(() => {
                    this.innerHTML = originalText;
                    this.style.color = '';
                }, 1000);
            });
        });
    }
    
    // Add floating action button for quick actions
    const fab = document.createElement('button');
    fab.className = 'fab';
    fab.innerHTML = '+';
    fab.title = 'Quick Actions';
    document.body.appendChild(fab);
    
    let fabExpanded = false;
    fab.addEventListener('click', function() {
        if (!fabExpanded) {
            // Show quick action menu
            const menu = document.createElement('div');
            menu.className = 'fab-menu';
            menu.innerHTML = `
                <button class="fab-action" data-action="add-event">📅 Add Event</button>
                <button class="fab-action" data-action="add-flight">✈️ Add Flight</button>
                <button class="fab-action" data-action="add-stay">🏨 Add Stay</button>
                <button class="fab-action" data-action="budget">💰 Set Budget</button>
                <button class="fab-action" data-action="invite">👥 Invite Friend</button>
            `;
            menu.style.position = 'fixed';
            menu.style.bottom = '150px';
            menu.style.right = '20px';
            menu.style.display = 'flex';
            menu.style.flexDirection = 'column';
            menu.style.gap = '10px';
            menu.style.animation = 'fadeIn 0.3s ease';
            
            document.body.appendChild(menu);
            this.style.transform = 'rotate(45deg)';
            fabExpanded = true;
            
            // Handle menu actions
            menu.querySelectorAll('.fab-action').forEach(action => {
                action.addEventListener('click', function() {
                    const actionType = this.dataset.action;
                    // Trigger corresponding action
                    if (actionType === 'add-event') {
                        // Switch to itinerary tab and open add event modal
                        if (window.switchTab) window.switchTab('itinerary');
                        setTimeout(() => {
                            document.getElementById('add-card-btn')?.click();
                        }, 300);
                    } else if (actionType === 'add-flight') {
                        // Switch to flights tab and open add flight modal
                        if (window.switchTab) window.switchTab('flights');
                        setTimeout(() => {
                            document.getElementById('add-flight-btn')?.click();
                        }, 300);
                    } else if (actionType === 'add-stay') {
                        // Switch to stay tab and open add stay modal
                        if (window.switchTab) window.switchTab('stay');
                        setTimeout(() => {
                            document.getElementById('add-stay-btn')?.click();
                        }, 300);
                    } else if (actionType === 'budget') {
                        // Switch to budget tab
                        if (window.switchTab) window.switchTab('budget');
                    } else if (actionType === 'invite') {
                        // Open invite modal
                        if (window.openInviteModal) {
                            window.openInviteModal();
                        } else {
                            // Fallback to simple modal
                            const inviteModal = document.getElementById('invite-modal');
                            if (inviteModal) {
                                inviteModal.classList.remove('hidden');
                                // Set the trip code
                                const tripData = JSON.parse(localStorage.getItem('currentTrip') || '{}');
                                const inviteCodeEl = document.getElementById('invite-code');
                                if (inviteCodeEl && tripData.id) {
                                    inviteCodeEl.textContent = tripData.id;
                                }
                            }
                        }
                    }
                    // Close menu
                    menu.remove();
                    fab.style.transform = '';
                    fabExpanded = false;
                });
            });
            
            // Close menu on outside click
            setTimeout(() => {
                document.addEventListener('click', function closeMenu(e) {
                    if (!fab.contains(e.target) && !menu.contains(e.target)) {
                        menu.remove();
                        fab.style.transform = '';
                        fabExpanded = false;
                        document.removeEventListener('click', closeMenu);
                    }
                });
            }, 100);
        }
    });
    
    // Add scroll to top button
    const scrollIndicator = document.createElement('button');
    scrollIndicator.className = 'scroll-indicator';
    scrollIndicator.innerHTML = '↑';
    scrollIndicator.title = 'Back to top';
    document.body.appendChild(scrollIndicator);
    
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            scrollIndicator.classList.add('show');
        } else {
            scrollIndicator.classList.remove('show');
        }
    });
    
    scrollIndicator.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    // Add CSS for new elements
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInScale {
            from {
                opacity: 0;
                transform: scale(0);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }
        
        .char-counter {
            text-align: right;
            font-size: 12px;
            color: var(--text-secondary);
            margin-top: 4px;
        }
        
        .fab-action {
            background: white;
            border: 1px solid var(--border);
            padding: 10px 16px;
            border-radius: 8px;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.2s ease;
        }
        
        .fab-action:hover {
            background: var(--primary);
            color: white;
            transform: translateX(-5px);
        }
        
        .form-group.focused label {
            color: var(--primary);
        }
        
        .form-group.has-value label {
            font-size: 12px;
            transform: translateY(-20px);
        }
    `;
    document.head.appendChild(style);
});