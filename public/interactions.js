// Enhanced Interactivity for Pathfind
(function() {
    'use strict';
    
    // Confetti celebration library
    function createConfetti() {
        const canvas = document.createElement('canvas');
        canvas.id = 'confetti-canvas';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '9999';
        document.body.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const particles = [];
        const colors = ['#8B5CF6', '#EC4899', '#A78BFA', '#7C3AED', '#9333EA'];
        
        for (let i = 0; i < 150; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                vx: Math.random() * 6 - 3,
                vy: Math.random() * 3 + 2,
                size: Math.random() * 3 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                angle: Math.random() * 360,
                spin: Math.random() * 10 - 5
            });
        }
        
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            particles.forEach((p, index) => {
                p.y += p.vy;
                p.x += p.vx;
                p.angle += p.spin;
                p.vy += 0.1;
                
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.angle * Math.PI / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
                ctx.restore();
                
                if (p.y > canvas.height) {
                    particles.splice(index, 1);
                }
            });
            
            if (particles.length > 0) {
                requestAnimationFrame(animate);
            } else {
                document.body.removeChild(canvas);
            }
        }
        
        animate();
    }
    
    // Sound effects removed for better user experience
    
    // Initialize all enhancements
    function init() {
        addLoadingAnimations();
        // addTooltips(); // Disabled - user doesn't like glass hover effects
        addKeyboardShortcuts();
        addSmoothScrolling();
        addButtonEnhancements();
        addCardAnimations();
        addProgressAnimations();
        addNotifications();
        addDragAndDrop();
        addTabAnimations();
        addParallaxEffects();
        addTypewriterEffect();
    }
    
    // Loading animations
    function addLoadingAnimations() {
        // Add skeleton loading for data fetches
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            const loader = showLoader();
            return originalFetch.apply(this, args).finally(() => {
                hideLoader(loader);
            });
        };
        
        function showLoader() {
            // DISABLED - No loader to prevent cursor-following overlay appearance
            return null;
        }
        
        function hideLoader(loader) {
            if (loader && loader.parentNode) {
                loader.classList.add('fade-out');
                setTimeout(() => loader.remove(), 300);
            }
        }
    }
    
    // Interactive tooltips
    function addTooltips() {
        const tooltipElements = [
            { selector: '.quick-action-btn', text: 'Click to quickly access this feature' },
            { selector: '.progress-checkbox', text: 'Mark as complete' },
            { selector: '.copy-code-btn', text: 'Copy to clipboard' },
            { selector: '.add-card-btn', text: 'Add a new event to your itinerary' }
        ];
        
        tooltipElements.forEach(({ selector, text }) => {
            document.querySelectorAll(selector).forEach(el => {
                el.setAttribute('data-tooltip', text);
                el.classList.add('has-tooltip');
            });
        });
        
        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        document.body.appendChild(tooltip);
        
        document.addEventListener('mouseover', (e) => {
            if (e.target.classList.contains('has-tooltip')) {
                const text = e.target.getAttribute('data-tooltip');
                tooltip.textContent = text;
                tooltip.style.display = 'block';
                
                const rect = e.target.getBoundingClientRect();
                tooltip.style.left = rect.left + rect.width / 2 + 'px';
                tooltip.style.top = rect.top - 40 + 'px';
            }
        });
        
        document.addEventListener('mouseout', (e) => {
            if (e.target.classList.contains('has-tooltip')) {
                tooltip.style.display = 'none';
            }
        });
    }
    
    // Keyboard shortcuts
    function addKeyboardShortcuts() {
        const shortcuts = {
            'ctrl+n': () => document.getElementById('add-card-btn')?.click(),
            'ctrl+f': () => document.getElementById('add-flight-btn')?.click(),
            'ctrl+s': () => document.getElementById('add-stay-btn')?.click(),
            'ctrl+/': () => showShortcutsHelp(),
            'escape': () => closeAllModals()
        };
        
        document.addEventListener('keydown', (e) => {
            const key = (e.ctrlKey ? 'ctrl+' : '') + (e.key ? e.key.toLowerCase() : '');
            if (shortcuts[key]) {
                e.preventDefault();
                shortcuts[key]();
            }
        });
        
        function showShortcutsHelp() {
            showNotification('⌨️ Keyboard Shortcuts', 
                'Ctrl+N: New Event | Ctrl+F: Add Flight | Ctrl+S: Add Stay | ESC: Close modals');
        }
        
        function closeAllModals() {
            document.querySelectorAll('.modal, [class*="modal"]').forEach(modal => {
                if (!modal.classList.contains('hidden')) {
                    modal.classList.add('hidden');
                }
            });
        }
    }
    
    // Smooth scrolling
    function addSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }
    
    // Button enhancements
    function addButtonEnhancements() {
        document.querySelectorAll('button').forEach(button => {
            // Ripple effect
            button.addEventListener('click', function(e) {
                const ripple = document.createElement('span');
                ripple.className = 'ripple';
                this.appendChild(ripple);
                
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                
                ripple.style.width = ripple.style.height = size + 'px';
                ripple.style.left = x + 'px';
                ripple.style.top = y + 'px';
                
                setTimeout(() => ripple.remove(), 600);
            });
        });
    }
    
    // Card animations
    function addCardAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, { threshold: 0.1 });
        
        document.querySelectorAll('.overview-card, .stay-item, .flight-item, .card').forEach(card => {
            card.classList.add('animate-card');
            observer.observe(card);
        });
    }
    
    // Progress animations
    function addProgressAnimations() {
        // Celebrate when progress reaches milestones
        let lastProgress = 0;
        const progressObserver = new MutationObserver(() => {
            const progressText = document.querySelector('.progress-percentage')?.textContent;
            if (progressText) {
                const progress = parseInt(progressText);
                if (progress > lastProgress) {
                    if (progress === 100) {
                        createConfetti();
                        showNotification('🎉 Congratulations!', 'Your trip planning is complete!');
                    } else if (progress === 50) {
                        showNotification('🎯 Halfway there!', 'You\'re making great progress!');
                    }
                    lastProgress = progress;
                }
            }
        });
        
        const progressElement = document.querySelector('.progress-percentage');
        if (progressElement) {
            progressObserver.observe(progressElement, { childList: true });
        }
    }
    
    // Add notifications enhancement
    function addNotifications() {
        // Setup notification system
        console.log('[Interactions] Notifications system initialized');
    }
    
    // Notification system
    function showNotification(title, message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    // Drag and drop for itinerary cards
    function addDragAndDrop() {
        const cardsContainer = document.getElementById('cards-container');
        if (!cardsContainer) return;
        
        // Make all cards draggable
        const cards = cardsContainer.querySelectorAll('.card');
        cards.forEach(card => {
            card.setAttribute('draggable', 'true');
            // Add drag indicator
            const dragIndicator = document.createElement('span');
            dragIndicator.className = 'drag-indicator';
            dragIndicator.innerHTML = '⋮⋮';
            card.appendChild(dragIndicator);
        });
        
        let draggedElement = null;
        
        cardsContainer.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('card')) {
                draggedElement = e.target;
                e.target.classList.add('dragging');
            }
        });
        
        cardsContainer.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('card')) {
                e.target.classList.remove('dragging');
            }
        });
        
        cardsContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = getDragAfterElement(cardsContainer, e.clientY);
            if (afterElement == null) {
                cardsContainer.appendChild(draggedElement);
            } else {
                cardsContainer.insertBefore(draggedElement, afterElement);
            }
        });
        
        function getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll('.card:not(.dragging)')];
            
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }
    }
    
    // Tab animations
    function addTabAnimations() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const tabName = this.dataset.tab;
                console.log('[Interactions] Tab clicked:', tabName);
                
                // Call the global switchTab function which handles flight system initialization
                if (typeof window.switchTab === 'function') {
                    window.switchTab(tabName);
                } else {
                    // Fallback to original animation logic
                    const oldContent = document.querySelector('.tab-content.active');
                    const newContent = document.getElementById(tabName + '-tab');
                    
                    if (oldContent && newContent && oldContent !== newContent) {
                        oldContent.classList.add('slide-out');
                        newContent.classList.add('slide-in');
                        
                        setTimeout(() => {
                            oldContent.classList.remove('active', 'slide-out');
                            newContent.classList.add('active');
                            newContent.classList.remove('hidden', 'slide-in');
                        }, 300);
                    }
                }
            });
        });
    }
    
    // Parallax effects
    function addParallaxEffects() {
        const heroSection = document.querySelector('.overview-hero');
        if (heroSection) {
            window.addEventListener('scroll', () => {
                const scrolled = window.pageYOffset;
                const parallax = heroSection.querySelector('.hero-background');
                if (parallax) {
                    parallax.style.transform = `translateY(${scrolled * 0.5}px)`;
                }
            });
        }
    }
    
    // Typewriter effect for welcome messages
    function addTypewriterEffect() {
        const elements = document.querySelectorAll('[data-typewriter]');
        elements.forEach(el => {
            const text = el.textContent;
            el.textContent = '';
            let i = 0;
            
            function type() {
                if (i < text.length) {
                    el.textContent += text.charAt(i);
                    i++;
                    setTimeout(type, 50);
                }
            }
            
            type();
        });
    }
    
    // Make window functions available globally
    window.showNotification = showNotification;
    window.createConfetti = createConfetti;
    
    // Add global cursor overlay disabler
    function disableCursorOverlays() {
        // Remove any existing cursor-following elements
        const overlaySelectors = [
            '.loader-spinner',
            '.global-loader',
            '.custom-tooltip',
            '[class*="cursor"]',
            '[class*="pointer"]',
            '[class*="follow"]',
            '[class*="glass"]',
            '[class*="frosted"]'
        ];
        
        overlaySelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (el) {
                        el.style.display = 'none';
                        el.remove();
                    }
                });
            } catch (e) {
                // Ignore selector errors
            }
        });
        
        console.log('[Interactions] Cursor overlays disabled');
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            disableCursorOverlays();
            init();
        });
    } else {
        disableCursorOverlays();
        init();
    }
})();