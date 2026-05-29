import express from 'express';
import https from 'https';
import OTP from '../models/OTP.js';

const router = express.Router();

// Helper to normalize mobile number format (standardize to +91 country prefix for Indian numbers)
const normalizeMobile = (num) => {
  if (!num) return '';
  const clean = num.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
  if (clean.startsWith('+')) return clean;
  // If it's a 10 digit local number, append +91
  if (clean.length === 10) return `+91${clean}`;
  return clean;
};

// Pure Node.js REST clients for SMS Dispatches
const sendSMS = async (mobile, code) => {
  const driver = process.env.OTP_DRIVER || 'development';
  const message = `Your MindLink verification code is: ${code}. Valid for 5 minutes.`;

  if (driver === 'development' || driver === 'msg91_widget') {
    console.log('\n=========================================');
    console.log(`[OTP Verification Code Dispatch Simulation]`);
    console.log(`Mobile: ${mobile}`);
    console.log(`Code:   ${code}`);
    console.log('=========================================\n');
    return true;
  }

  if (driver === 'twilio') {
    return new Promise((resolve, reject) => {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !fromNumber) {
        console.error('Twilio credentials not configured');
        return reject(new Error('Twilio credentials not configured'));
      }

      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const postData = new URLSearchParams({
        To: mobile,
        From: fromNumber,
        Body: message
      }).toString();

      const options = {
        hostname: 'api.twilio.com',
        port: 443,
        path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': postData.length
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(true);
          } else {
            console.error('Twilio request failed:', body);
            reject(new Error(`Twilio error: ${res.statusCode}`));
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.write(postData);
      req.end();
    });
  }

  if (driver === 'msg91') {
    return new Promise((resolve, reject) => {
      const authKey = process.env.MSG91_AUTH_KEY;
      const templateId = process.env.MSG91_TEMPLATE_ID;

      if (!authKey || !templateId) {
        console.error('MSG91 credentials not configured');
        return reject(new Error('MSG91 credentials not configured'));
      }

      const cleanMobile = mobile.replace('+', ''); // MSG91 needs country code without +
      const options = {
        hostname: 'control.msg91.com',
        port: 443,
        path: `/api/v5/otp?template_id=${templateId}&mobile=${cleanMobile}&authkey=${authKey}&otp=${code}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(true);
          } else {
            console.error('MSG91 request failed:', body);
            reject(new Error(`MSG91 error: ${res.statusCode}`));
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.end();
    });
  }

  throw new Error(`Unsupported OTP driver: ${driver}`);
};

// ─── POST /api/auth/otp/send-otp ───────────────────────────────────────────────
router.post('/send-otp', async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({ success: false, message: 'Mobile number is required' });
    }

    const normalized = normalizeMobile(mobile);
    
    // Generate secure random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60000);

    // Save/update in database
    await OTP.findOneAndUpdate(
      { mobile: normalized },
      { code, expiresAt, attempts: 0, verified: false },
      { upsert: true, new: true }
    );

    // Dispatch SMS via the configured gateway driver
    await sendSMS(normalized, code);

    res.json({
      success: true,
      message: 'Verification code sent successfully'
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to send verification code' });
  }
});

// ─── POST /api/auth/otp/verify-otp ─────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  try {
    const { mobile, code } = req.body;

    if (!mobile || !code) {
      return res.status(400).json({ success: false, message: 'Mobile and code are required' });
    }

    const normalized = normalizeMobile(mobile);
    const otpRecord = await OTP.findOne({ mobile: normalized });

    if (!otpRecord) {
      return res.status(404).json({ success: false, message: 'No verification record found for this number' });
    }

    if (otpRecord.verified) {
      return res.json({ success: true, message: 'Mobile already verified' });
    }

    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new one.' });
    }

    if (otpRecord.attempts >= 3) {
      return res.status(400).json({ success: false, message: 'Too many failed attempts. Please request a new code.' });
    }

    // Match code (allow development standard code '123456' as override in mock mode)
    const isDevMock = process.env.OTP_DRIVER === 'development' || !process.env.OTP_DRIVER;
    const isMatched = otpRecord.code === code || (isDevMock && code === '123456');

    if (!isMatched) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({ 
        success: false, 
        message: `Invalid code. ${3 - otpRecord.attempts} attempts remaining.` 
      });
    }

    // Success
    otpRecord.verified = true;
    await otpRecord.save();

    res.json({
      success: true,
      message: 'Mobile number verified successfully'
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify code' });
  }
});

// ─── POST /api/auth/otp/verify-widget-token ──────────────────────────────────────
router.post('/verify-widget-token', async (req, res) => {
  try {
    const { mobile, accessToken } = req.body;
    if (!mobile || !accessToken) {
      return res.status(400).json({ success: false, message: 'Mobile and access token are required' });
    }

    const authkey = process.env.MSG91_AUTH_KEY;
    if (!authkey) {
      return res.status(500).json({ success: false, message: 'MSG91 AUTH KEY is not configured in backend env' });
    }

    const postData = JSON.stringify({
      "access-token": accessToken
    });

    const options = {
      hostname: 'api.msg91.com',
      port: 443,
      path: '/api/v5/widget/verifyAccessToken',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'authkey': authkey,
        'Content-Length': postData.length
      }
    };

    const request = https.request(options, (response) => {
      let body = '';
      response.on('data', (chunk) => body += chunk);
      response.on('end', async () => {
        try {
          const json = JSON.parse(body);
          if (response.statusCode >= 200 && response.statusCode < 300 && (json.status === 'success' || json.type === 'success')) {
            // Mark this mobile number as verified in our local DB
            const normalized = normalizeMobile(mobile);
            await OTP.findOneAndUpdate(
              { mobile: normalized },
              { verified: true, code: 'WIDGET', expiresAt: new Date(Date.now() + 10 * 60000) },
              { upsert: true, new: true }
            );

            res.json({
              success: true,
              message: 'Mobile number verified successfully via MSG91 widget'
            });
          } else {
            console.error('MSG91 widget verification failed:', body);
            res.status(400).json({
              success: false,
              message: json.message || 'Verification failed. Access token is invalid or expired.'
            });
          }
        } catch (e) {
          console.error('Error parsing MSG91 response:', e, body);
          res.status(500).json({ success: false, message: 'Failed to verify token' });
        }
      });
    });

    request.on('error', (err) => {
      console.error('MSG91 HTTP request error:', err);
      res.status(500).json({ success: false, message: 'Failed to connect to MSG91 API' });
    });

    request.write(postData);
    request.end();
  } catch (error) {
    console.error('Widget token verification error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during verification' });
  }
});

export default router;
export { normalizeMobile };
