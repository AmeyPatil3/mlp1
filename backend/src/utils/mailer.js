import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

let transporter;

export function getTransporter() {
  if (!transporter) {
    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASS
    } = process.env;
    transporter = nodemailer.createTransport({
      host: SMTP_HOST || 'smtp.ethereal.email',
      port: SMTP_PORT ? Number(SMTP_PORT) : 587,
      secure: SMTP_PORT === '465',
      auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
    });
  }
  return transporter;
}

export async function sendMail({ to, subject, html, ics }) {
  try {
    const tx = getTransporter();
    const info = await tx.sendMail({
      from: (process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@localhost'),
      to,
      subject,
      html,
      attachments: ics
        ? [{ filename: 'invite.ics', content: ics, contentType: 'text/calendar' }]
        : []
    });
    // Helpful logs for testing (Ethereal provides a preview URL)
    try {
      console.log(`[mail] Sent message to ${to} with id ${info.messageId}`);
      const preview = nodemailer.getTestMessageUrl(info);
      if (preview) {
        console.log(`[mail] Preview URL: ${preview}`);
      }
    } catch {}
    return info;
  } catch (err) {
    console.error('Email send failed:', err);
    throw err;
  }
}

export function buildIcs({ title, description, start, end, url }) {
  const dt = (d) => new Date(d).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const uid = `${Date.now()}@mindlink`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MindLink//Appointments//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dt(new Date())}`,
    `DTSTART:${dt(start)}`,
    `DTEND:${dt(end)}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(description || '')}`,
    url ? `URL:${url}` : '',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');
}

function escapeIcs(text) {
  return String(text).replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');
}


