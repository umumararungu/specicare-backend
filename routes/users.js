// routes/users.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { Op } = require('sequelize');
const router = express.Router();

const { sendPasswordReset } = require('../services/email');

const { authenticate } = require('../middleware/auth');
 

// Register new user
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      insuranceNumber,
      dateOfBirth,
      gender,
      district,
      sector,
      cell,
      village,
      role = "patient",
    } = req.body;

    // Basic input validation - prevent DB-level errors and give clear feedback
    const missing = [];
    if (!name || !name.toString().trim()) missing.push('name');
    if (!email || !email.toString().trim()) missing.push('email');
    if (!password || !password.toString().trim()) missing.push('password');
    if (!phone || !phone.toString().trim()) missing.push('phone');

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`,
      });
    }

      // Note: duplicates for email/phone are allowed by design in this configuration.


    // Create new user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone,
      password,
      insurance_number: insuranceNumber,
      date_of_birth: dateOfBirth,
      gender,
      district,
      sector,
      cell,
      village,
      role,
      is_active: true,
    });

    // Issue access token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const decoded = jwt.decode(token) || {};
    const expiresAt = decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      expiresAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        insurance_number: user.insurance_number,
        date_of_birth: user.date_of_birth,
        gender: user.gender,
        district: user.district,
        sector: user.sector,
        cell: user.cell,
        village: user.village,
      },
    });
  } catch (error) {
    // Log full error to help debugging (stack when available)
    console.error("Registration error:", error && error.stack ? error.stack : error);

    // Map common Sequelize errors to clear HTTP responses
    if (error && error.name === 'SequelizeUniqueConstraintError') {
      // Unique constraint (email or phone already exists)
      return res.status(409).json({
        success: false,
        message: 'A user with that email or phone already exists',
        errors: error.errors ? error.errors.map(e => e.message) : undefined,
      });
    }

    if (error && error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors ? error.errors.map(e => e.message) : undefined,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating user account",
      error: error.message,
    });
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and password are required" 
      });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    await user.update({ last_login: new Date() });

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const decoded = jwt.decode(token) || {};
    const expiresAt = decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null;

    // SEND USER + TOKEN (Frontend needs this!)
    return res.json({
      success: true,
      message: "Login successful",
      token,
      expiresAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        last_login: user.last_login
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Error during login", 
      error: error.message 
    });
  }
});

// Logout user
// Logout: simple stateless logout (client removes stored token)
router.post('/logout', (req, res) => {
  return res.json({ success: true, message: 'Logout successful' });
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      // Don't reveal whether the email exists
      return res.json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
    }

    // Create a short-lived JWT token (1h) containing user id
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Construct reset link - frontend will handle the token and post new password
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    // Send email with link
    try {
      await sendPasswordReset(user.email, resetLink, { name: user.name });
    } catch (e) {
      console.error('Failed to send password reset email:', e);
    }

    return res.json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Reset password using token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ success: false, message: 'Token and new password are required' });

    // Verify token
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await User.findByPk(payload.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Update password (User model hook will hash it)
    await user.update({ password });

    return res.json({ success: true, message: 'Password has been reset. You can now login with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get current user - FIXED VERSION
// Protected route — uses auth middleware which reads Bearer token from Authorization header
router.get("/me", authenticate, async (req, res) => {
  res.json({ success: true, user: req.user });
});


// Root info for the users route - helpful when someone GETs /api/users
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Users API - available endpoints',
    endpoints: {
      register: 'POST /api/users/register',
      login: 'POST /api/users/login',
      logout: 'POST /api/users/logout',
      forgotPassword: 'POST /api/users/forgot-password',
      resetPassword: 'POST /api/users/reset-password',
      me: 'GET /api/users/me (requires Authorization: Bearer <token>)'
    }
  });
});

module.exports = router;

