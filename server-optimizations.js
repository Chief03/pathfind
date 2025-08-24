// Server Performance Optimizations
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

// Cache configuration
const cacheConfig = {
    static: 86400000, // 1 day for static assets
    api: 300000, // 5 minutes for API responses
    events: 1800000 // 30 minutes for event data
};

// Rate limiting configuration
const createRateLimiter = (windowMs, max, message) => {
    return rateLimit({
        windowMs,
        max,
        message,
        standardHeaders: true,
        legacyHeaders: false
    });
};

// API rate limiters
const rateLimiters = {
    general: createRateLimiter(15 * 60 * 1000, 100, 'Too many requests, please try again later.'),
    auth: createRateLimiter(15 * 60 * 1000, 5, 'Too many authentication attempts, please try again later.'),
    search: createRateLimiter(1 * 60 * 1000, 30, 'Too many search requests, please slow down.'),
    create: createRateLimiter(15 * 60 * 1000, 10, 'Too many creation requests, please try again later.')
};

// Response cache middleware
const cacheMiddleware = (duration) => {
    return (req, res, next) => {
        if (req.method === 'GET') {
            res.setHeader('Cache-Control', `public, max-age=${duration / 1000}`);
            res.setHeader('Expires', new Date(Date.now() + duration).toUTCString());
        }
        next();
    };
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
    console.error('Server error:', err);
    
    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(err.status || 500).json({
        error: isDevelopment ? err.message : 'Internal server error',
        stack: isDevelopment ? err.stack : undefined,
        timestamp: new Date().toISOString()
    });
};

// Request logging middleware
const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('user-agent')
        };
        
        // Log slow requests
        if (duration > 1000) {
            console.warn('Slow request:', logData);
        } else if (process.env.NODE_ENV === 'development') {
            console.log('Request:', logData);
        }
    });
    
    next();
};

// Security headers configuration
const securityConfig = {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
            imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
            connectSrc: ["'self'", 'https://nominatim.openstreetmap.org', 'wss:', 'ws:'],
            fontSrc: ["'self'", 'data:'],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
};

// CORS configuration
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Database connection pooling (when database is added)
const dbConfig = {
    connectionLimit: 10,
    queueLimit: 0,
    waitForConnections: true,
    connectionTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000
};

// Memory cache implementation
class MemoryCache {
    constructor() {
        this.cache = new Map();
        this.timers = new Map();
    }
    
    set(key, value, ttl = 300000) {
        // Clear existing timer if any
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
        }
        
        // Set new value
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
        
        // Set expiration timer
        const timer = setTimeout(() => {
            this.cache.delete(key);
            this.timers.delete(key);
        }, ttl);
        
        this.timers.set(key, timer);
    }
    
    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        return item.value;
    }
    
    has(key) {
        return this.cache.has(key);
    }
    
    delete(key) {
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
            this.timers.delete(key);
        }
        return this.cache.delete(key);
    }
    
    clear() {
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers.clear();
        this.cache.clear();
    }
    
    size() {
        return this.cache.size;
    }
    
    // Clean up expired entries
    cleanup() {
        const now = Date.now();
        let cleaned = 0;
        
        this.cache.forEach((item, key) => {
            if (now - item.timestamp > 3600000) { // 1 hour max
                this.delete(key);
                cleaned++;
            }
        });
        
        return cleaned;
    }
}

// Socket.io optimization
const socketConfig = {
    cors: corsOptions,
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    maxHttpBufferSize: 1e6, // 1MB
    perMessageDeflate: {
        threshold: 1024
    }
};

// Apply optimizations to Express app
function applyOptimizations(app) {
    // Security
    app.use(helmet(securityConfig));
    
    // CORS
    app.use(cors(corsOptions));
    
    // Compression
    app.use(compression({
        level: 6,
        threshold: 1024,
        filter: (req, res) => {
            if (req.headers['x-no-compression']) {
                return false;
            }
            return compression.filter(req, res);
        }
    }));
    
    // Request logging (only in development)
    if (process.env.NODE_ENV === 'development') {
        app.use(requestLogger);
    }
    
    // Rate limiting
    app.use('/api/', rateLimiters.general);
    app.use('/api/auth/', rateLimiters.auth);
    app.use('/api/places/', rateLimiters.search);
    app.use('/api/trips', rateLimiters.create);
    
    // Static file caching
    app.use('/public', cacheMiddleware(cacheConfig.static));
    
    // API response caching for specific routes
    app.use('/api/events', cacheMiddleware(cacheConfig.events));
    app.use('/api/activities', cacheMiddleware(cacheConfig.api));
    app.use('/api/airlines', cacheMiddleware(cacheConfig.static));
    app.use('/api/airports', cacheMiddleware(cacheConfig.api));
    
    // Body parser limits
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Trust proxy (for correct IP addresses behind reverse proxy)
    app.set('trust proxy', 1);
    
    // Disable X-Powered-By header
    app.disable('x-powered-by');
    
    // Error handler (should be last)
    app.use(errorHandler);
}

// Health check endpoint
function addHealthCheck(app) {
    app.get('/health', (req, res) => {
        const health = {
            status: 'UP',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            environment: process.env.NODE_ENV || 'development'
        };
        res.json(health);
    });
}

// Graceful shutdown
function setupGracefulShutdown(server, io) {
    const shutdown = () => {
        console.log('Shutting down gracefully...');
        
        // Close socket connections
        io.close(() => {
            console.log('Socket.io connections closed');
        });
        
        // Close HTTP server
        server.close(() => {
            console.log('HTTP server closed');
            process.exit(0);
        });
        
        // Force shutdown after 10 seconds
        setTimeout(() => {
            console.error('Forced shutdown');
            process.exit(1);
        }, 10000);
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

module.exports = {
    applyOptimizations,
    addHealthCheck,
    setupGracefulShutdown,
    MemoryCache,
    rateLimiters,
    cacheMiddleware,
    errorHandler,
    requestLogger,
    socketConfig,
    corsOptions,
    cacheConfig
};