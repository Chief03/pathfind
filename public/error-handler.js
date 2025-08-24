// Global Error Handler and Performance Optimization
(function() {
    'use strict';
    
    // Global error handler
    window.addEventListener('error', function(event) {
        console.error('Global error caught:', event.error);
        
        // Log error details
        const errorInfo = {
            message: event.message,
            source: event.filename,
            line: event.lineno,
            column: event.colno,
            error: event.error ? event.error.stack : 'No stack trace',
            timestamp: new Date().toISOString()
        };
        
        // Store errors for debugging
        if (!window.errorLog) {
            window.errorLog = [];
        }
        window.errorLog.push(errorInfo);
        
        // Prevent default error handling in production
        if (window.location.hostname !== 'localhost') {
            event.preventDefault();
        }
    });
    
    // Promise rejection handler
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        
        // Log rejection details
        const rejectionInfo = {
            reason: event.reason,
            promise: event.promise,
            timestamp: new Date().toISOString()
        };
        
        if (!window.rejectionLog) {
            window.rejectionLog = [];
        }
        window.rejectionLog.push(rejectionInfo);
    });
    
    // Safe localStorage wrapper
    window.safeStorage = {
        getItem: function(key) {
            try {
                return localStorage.getItem(key);
            } catch (e) {
                console.warn('localStorage not available:', e);
                return null;
            }
        },
        setItem: function(key, value) {
            try {
                localStorage.setItem(key, value);
                return true;
            } catch (e) {
                console.warn('localStorage write failed:', e);
                // Fallback to memory storage
                if (!window.memoryStorage) {
                    window.memoryStorage = {};
                }
                window.memoryStorage[key] = value;
                return false;
            }
        },
        removeItem: function(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.warn('localStorage remove failed:', e);
                if (window.memoryStorage && window.memoryStorage[key]) {
                    delete window.memoryStorage[key];
                }
                return false;
            }
        },
        clear: function() {
            try {
                localStorage.clear();
                return true;
            } catch (e) {
                console.warn('localStorage clear failed:', e);
                window.memoryStorage = {};
                return false;
            }
        }
    };
    
    // Performance monitoring
    window.performanceMonitor = {
        marks: {},
        measures: {},
        
        start: function(name) {
            if (window.performance && window.performance.mark) {
                try {
                    performance.mark(name + '_start');
                    this.marks[name] = performance.now();
                } catch (e) {
                    console.warn('Performance mark failed:', e);
                }
            }
        },
        
        end: function(name) {
            if (window.performance && window.performance.mark && this.marks[name]) {
                try {
                    performance.mark(name + '_end');
                    performance.measure(name, name + '_start', name + '_end');
                    const duration = performance.now() - this.marks[name];
                    this.measures[name] = duration;
                    
                    // Log slow operations
                    if (duration > 1000) {
                        console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
                    }
                    
                    return duration;
                } catch (e) {
                    console.warn('Performance measure failed:', e);
                }
            }
            return 0;
        },
        
        getMetrics: function() {
            return {
                marks: this.marks,
                measures: this.measures,
                memory: window.performance && window.performance.memory ? {
                    used: window.performance.memory.usedJSHeapSize,
                    total: window.performance.memory.totalJSHeapSize,
                    limit: window.performance.memory.jsHeapSizeLimit
                } : null
            };
        }
    };
    
    // Input validation helpers
    window.validators = {
        email: function(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        },
        
        phone: function(phone) {
            const cleaned = phone.replace(/\D/g, '');
            return cleaned.length >= 10 && cleaned.length <= 15;
        },
        
        date: function(date) {
            const d = new Date(date);
            return d instanceof Date && !isNaN(d);
        },
        
        tripCode: function(code) {
            return /^[A-Z0-9]{8}$/.test(code);
        },
        
        sanitizeHTML: function(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        },
        
        sanitizeInput: function(input) {
            if (typeof input !== 'string') return input;
            return input.trim().replace(/[<>]/g, '');
        }
    };
    
    // Debounce utility for performance
    window.debounce = function(func, wait, immediate) {
        let timeout;
        return function() {
            const context = this, args = arguments;
            const later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    };
    
    // Throttle utility for performance
    window.throttle = function(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    };
    
    // Lazy loading for images
    window.lazyLoadImages = function() {
        const images = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    };
    
    // Network status monitor
    window.networkMonitor = {
        isOnline: navigator.onLine,
        
        init: function() {
            window.addEventListener('online', () => {
                this.isOnline = true;
                console.log('Network: Online');
                if (window.showNotification) {
                    window.showNotification('✅ Back Online', 'Connection restored');
                }
            });
            
            window.addEventListener('offline', () => {
                this.isOnline = false;
                console.log('Network: Offline');
                if (window.showNotification) {
                    window.showNotification('⚠️ Offline', 'No internet connection');
                }
            });
        },
        
        checkConnection: function() {
            return navigator.onLine;
        }
    };
    
    // Initialize network monitor
    networkMonitor.init();
    
    // Memory leak prevention
    window.cleanupHandlers = [];
    
    window.registerCleanup = function(handler) {
        window.cleanupHandlers.push(handler);
    };
    
    window.addEventListener('beforeunload', function() {
        window.cleanupHandlers.forEach(handler => {
            try {
                handler();
            } catch (e) {
                console.error('Cleanup handler failed:', e);
            }
        });
    });
    
    // Request animation frame polyfill
    window.requestAnimationFrame = window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        function(callback) {
            return window.setTimeout(callback, 1000 / 60);
        };
    
    // Cancel animation frame polyfill
    window.cancelAnimationFrame = window.cancelAnimationFrame ||
        window.webkitCancelAnimationFrame ||
        window.mozCancelAnimationFrame ||
        function(id) {
            clearTimeout(id);
        };
    
    // Smooth scroll polyfill
    if (!window.CSS || !CSS.supports('scroll-behavior', 'smooth')) {
        window.smoothScrollTo = function(target, duration = 500) {
            const targetPosition = target.getBoundingClientRect().top + window.pageYOffset;
            const startPosition = window.pageYOffset;
            const distance = targetPosition - startPosition;
            let startTime = null;
            
            function animation(currentTime) {
                if (startTime === null) startTime = currentTime;
                const timeElapsed = currentTime - startTime;
                const run = ease(timeElapsed, startPosition, distance, duration);
                window.scrollTo(0, run);
                if (timeElapsed < duration) requestAnimationFrame(animation);
            }
            
            function ease(t, b, c, d) {
                t /= d / 2;
                if (t < 1) return c / 2 * t * t + b;
                t--;
                return -c / 2 * (t * (t - 2) - 1) + b;
            }
            
            requestAnimationFrame(animation);
        };
    }
    
    // Console safety for production
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        ['log', 'debug', 'info', 'warn', 'error'].forEach(function(method) {
            const original = console[method];
            console[method] = function() {
                if (window.debugMode) {
                    original.apply(console, arguments);
                }
            };
        });
    }
    
    // Export for use in other modules
    window.errorHandler = {
        safeStorage,
        validators,
        performanceMonitor,
        networkMonitor,
        debounce,
        throttle,
        lazyLoadImages,
        registerCleanup
    };
    
    console.log('[ErrorHandler] Global error handling and optimization initialized');
})();