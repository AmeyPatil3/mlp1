import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Generate JWT Token (same as auth.js)
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
};

router.post('/', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ success: false, message: 'Google credential token is required' });
    }

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    let payload;
    try {
      // If GOOGLE_CLIENT_ID is properly configured, verify the ID token
      if (
        process.env.GOOGLE_CLIENT_ID && 
        process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id-here.apps.googleusercontent.com'
      ) {
        const ticket = await client.verifyIdToken({
          idToken: token,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
      } else {
        // Fallback for development/testing: decode payload locally
        console.warn('Google Client ID is not configured. Performing local decode for testing.');
        const parts = token.split('.');
        if (parts.length === 3) {
          payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
        } else {
          // Fallback mockup payload
          payload = {
            email: token.includes('@') ? token : 'mock-google-user@gmail.com',
            name: 'Mock Google User',
            picture: 'https://i.pravatar.cc/150',
            sub: 'mock-google-id-123456789'
          };
        }
      }
    } catch (verifyError) {
      console.error('Google ID token verification failed:', verifyError);
      return res.status(401).json({ success: false, message: 'Invalid Google credential token' });
    }

    if (!payload || !payload.email) {
      return res.status(400).json({ success: false, message: 'Failed to retrieve email from Google token' });
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || '';
    const picture = payload.picture || '';
    const sub = payload.sub || '';

    // Find user by googleId or email
    let user = await User.findOne({ $or: [{ googleId: sub }, { email }] });
    
    if (user) {
      // Link Google login if not already linked
      let updated = false;
      if (!user.googleId) {
        user.googleId = sub;
        updated = true;
      }
      if (user.authProvider !== 'google') {
        user.authProvider = 'google';
        updated = true;
      }
      if (updated) {
        await user.save();
      }

      const jwtToken = generateToken(user._id);
      
      return res.json({
        success: true,
        isNewUser: false,
        token: jwtToken,
        ...user.toJSON()
      });
    }

    // User does not exist - signal frontend to redirect to onboarding registration
    return res.json({
      success: true,
      isNewUser: true,
      googleUser: {
        fullName: name,
        email,
        profileImage: picture,
        googleId: sub
      }
    });
  } catch (error) {
    console.error('Google login route error:', error);
    res.status(500).json({ success: false, message: 'Google authentication failed' });
  }
});

export default router;
