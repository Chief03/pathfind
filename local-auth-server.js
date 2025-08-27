const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = 3002;
const JWT_SECRET = 'local-test-secret-key';

// Middleware
app.use(express.json());
app.use(express.static('public'));

// CORS for local development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Initialize SQLite database
const db = new sqlite3.Database('local-auth.db');

// Create users table
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      given_name TEXT NOT NULL,
      family_name TEXT NOT NULL,
      phone_number TEXT,
      email_verified INTEGER DEFAULT 0,
      verification_code TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// Helper functions
const generateId = () => crypto.randomBytes(16).toString('hex');
const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// Mock Amplify Auth endpoints
app.post('/api/amplify-auth/signup', async (req, res) => {
  try {
    const { username, password, options } = req.body;
    const { userAttributes } = options || {};
    
    console.log('[LocalAuth] Sign up request:', { username, userAttributes });
    
    // Validate required fields
    if (!username || !password || !userAttributes?.given_name || !userAttributes?.family_name) {
      return res.status(400).json({
        __type: 'InvalidParameterException',
        message: 'Missing required attributes'
      });
    }
    
    // Check if user exists
    db.get('SELECT email FROM users WHERE email = ?', [username], async (err, existingUser) => {
      if (err) {
        console.error('[LocalAuth] Database error:', err);
        return res.status(500).json({
          __type: 'InternalErrorException',
          message: 'Database error'
        });
      }
      
      if (existingUser) {
        return res.status(400).json({
          __type: 'UsernameExistsException',
          message: 'User already exists'
        });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      const userId = generateId();
      const verificationCode = generateVerificationCode();
      
      // Insert user
      db.run(`
        INSERT INTO users (id, email, password_hash, given_name, family_name, phone_number, verification_code)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        username,
        passwordHash,
        userAttributes.given_name,
        userAttributes.family_name,
        userAttributes.phone_number || null,
        verificationCode
      ], function(err) {
        if (err) {
          console.error('[LocalAuth] Insert error:', err);
          return res.status(500).json({
            __type: 'InternalErrorException',
            message: 'Failed to create user'
          });
        }
        
        console.log('[LocalAuth] User created:', { userId, username });
        console.log('[LocalAuth] Verification code:', verificationCode);
        
        res.json({
          isSignUpComplete: false,
          userId: userId,
          nextStep: {
            signUpStep: 'CONFIRM_SIGN_UP',
            codeDeliveryDetails: {
              destination: username,
              deliveryMedium: 'EMAIL'
            }
          }
        });
      });
    });
  } catch (error) {
    console.error('[LocalAuth] Sign up error:', error);
    res.status(500).json({
      __type: 'InternalErrorException',
      message: 'Sign up failed'
    });
  }
});

app.post('/api/amplify-auth/confirm-signup', (req, res) => {
  try {
    const { username, confirmationCode } = req.body;
    
    console.log('[LocalAuth] Confirm sign up:', { username, confirmationCode });
    
    db.get('SELECT * FROM users WHERE email = ? AND verification_code = ?', [username, confirmationCode], (err, user) => {
      if (err) {
        console.error('[LocalAuth] Database error:', err);
        return res.status(500).json({
          __type: 'InternalErrorException',
          message: 'Database error'
        });
      }
      
      if (!user) {
        return res.status(400).json({
          __type: 'CodeMismatchException',
          message: 'Invalid verification code'
        });
      }
      
      // Update user as verified
      db.run('UPDATE users SET email_verified = 1, verification_code = NULL WHERE id = ?', [user.id], (err) => {
        if (err) {
          console.error('[LocalAuth] Update error:', err);
          return res.status(500).json({
            __type: 'InternalErrorException',
            message: 'Verification failed'
          });
        }
        
        console.log('[LocalAuth] User verified:', username);
        
        res.json({
          isSignUpComplete: true,
          nextStep: {
            signUpStep: 'DONE'
          }
        });
      });
    });
  } catch (error) {
    console.error('[LocalAuth] Confirm signup error:', error);
    res.status(500).json({
      __type: 'InternalErrorException',
      message: 'Confirmation failed'
    });
  }
});

app.post('/api/amplify-auth/signin', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('[LocalAuth] Sign in request:', { username });
    
    db.get('SELECT * FROM users WHERE email = ?', [username], async (err, user) => {
      if (err) {
        console.error('[LocalAuth] Database error:', err);
        return res.status(500).json({
          __type: 'InternalErrorException',
          message: 'Database error'
        });
      }
      
      if (!user || !await bcrypt.compare(password, user.password_hash)) {
        return res.status(400).json({
          __type: 'NotAuthorizedException',
          message: 'Incorrect username or password'
        });
      }
      
      // DISABLED for testing - skip email verification check
      // if (!user.email_verified) {
      //   return res.status(400).json({
      //     __type: 'UserNotConfirmedException',
      //     message: 'User is not confirmed'
      //   });
      // }
      
      // Generate JWT tokens
      const accessToken = jwt.sign(
        { 
          sub: user.id,
          email: user.email,
          given_name: user.given_name,
          family_name: user.family_name 
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      const idToken = jwt.sign(
        {
          sub: user.id,
          email: user.email,
          given_name: user.given_name,
          family_name: user.family_name,
          aud: 'local-test-client',
          token_use: 'id'
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      const refreshToken = jwt.sign(
        { sub: user.id, token_use: 'refresh' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      console.log('[LocalAuth] Sign in successful:', username);
      
      res.json({
        isSignedIn: true,
        nextStep: {
          signInStep: 'DONE'
        },
        tokens: {
          accessToken: {
            value: accessToken,
            payload: jwt.decode(accessToken)
          },
          idToken: {
            value: idToken,
            payload: jwt.decode(idToken)
          },
          refreshToken: {
            value: refreshToken
          }
        }
      });
    });
  } catch (error) {
    console.error('[LocalAuth] Sign in error:', error);
    res.status(500).json({
      __type: 'InternalErrorException',
      message: 'Sign in failed'
    });
  }
});

app.post('/api/amplify-auth/signout', (req, res) => {
  console.log('[LocalAuth] Sign out request');
  
  res.json({
    signOutStep: 'DONE'
  });
});

app.get('/api/amplify-auth/current-user', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        __type: 'NotAuthorizedException',
        message: 'Access Token has been revoked'
      });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    console.log('[LocalAuth] Current user request:', decoded.email);
    
    res.json({
      username: decoded.sub,
      userId: decoded.sub,
      signInDetails: {
        loginId: decoded.email,
        authFlowType: 'USER_SRP_AUTH'
      }
    });
  } catch (error) {
    console.error('[LocalAuth] Current user error:', error);
    res.status(401).json({
      __type: 'NotAuthorizedException',
      message: 'Access Token has been revoked'
    });
  }
});

app.get('/api/amplify-auth/user-attributes', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        __type: 'NotAuthorizedException',
        message: 'Access Token has been revoked'
      });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    db.get('SELECT * FROM users WHERE id = ?', [decoded.sub], (err, user) => {
      if (err || !user) {
        return res.status(404).json({
          __type: 'UserNotFoundException',
          message: 'User not found'
        });
      }
      
      console.log('[LocalAuth] User attributes request:', user.email);
      
      res.json({
        email: user.email,
        given_name: user.given_name,
        family_name: user.family_name,
        phone_number: user.phone_number,
        email_verified: user.email_verified === 1
      });
    });
  } catch (error) {
    console.error('[LocalAuth] User attributes error:', error);
    res.status(401).json({
      __type: 'NotAuthorizedException',
      message: 'Access Token has been revoked'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`[LocalAuth] Server running on http://localhost:${PORT}`);
  console.log('[LocalAuth] Database initialized: local-auth.db');
  console.log('[LocalAuth] API endpoints:');
  console.log('  POST /api/amplify-auth/signup');
  console.log('  POST /api/amplify-auth/confirm-signup'); 
  console.log('  POST /api/amplify-auth/signin');
  console.log('  POST /api/amplify-auth/signout');
  console.log('  GET  /api/amplify-auth/current-user');
  console.log('  GET  /api/amplify-auth/user-attributes');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[LocalAuth] Shutting down...');
  db.close((err) => {
    if (err) {
      console.error('[LocalAuth] Database close error:', err);
    } else {
      console.log('[LocalAuth] Database closed');
    }
    process.exit(0);
  });
});