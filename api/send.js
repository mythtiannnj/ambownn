const nodemailer = require('nodemailer');

// In-memory rate limit (per IP) — resets on cold start, good enough for basic spam protection
const hits = new Map();
const WINDOW_MS = 60 * 1000;      // 1 minute
const MAX_REQ = 3;                // 3 submissions per minute per IP

function rateLimit(ip) {
  const now = Date.now();
  const entry = hits.get(ip) || { count: 0, start: now };
  if (now - entry.start > WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count++;
  hits.set(ip, entry);
  return entry.count <= MAX_REQ;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  if (!rateLimit(ip)) {
    return res
      .status(429)
      .json({ error: 'Too many requests. Please wait a minute and try again.' });
  }

  const { name, gcashNumber, initial } = req.body || {};

  if (!name || !gcashNumber || !initial) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const digits = String(gcashNumber).replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13) {
    return res.status(400).json({ error: 'Invalid GCash number.' });
  }

  const initialClean = String(initial).trim().toUpperCase();
  if (!/^[A-Z. ]{1,6}$/.test(initialClean)) {
    return res
      .status(400)
      .json({ error: 'Initial must be letters and dots only (e.g. J.D).' });
  }

  const clean = (s) => String(s).slice(0, 120).replace(/[<>]/g, '').trim();

  const submitted = new Date().toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Random Ambon" <${process.env.EMAIL_USER}>`,
      to: 'nolannakagdspeed@gmail.com',
      subject: `🎲 New Random Ambon Entry — ${clean(name)}`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;padding:24px;background:#f5f5f7;border-radius:12px;max-width:560px">
          <h2 style="color:#111;margin:0 0 16px">New Entry Received</h2>
          <p style="margin:6px 0"><strong>Name:</strong> ${clean(name)}</p>
          <p style="margin:6px 0"><strong>GCash Number:</strong> ${clean(gcashNumber)}</p>
          <p style="margin:6px 0"><strong>Initial:</strong> ${initialClean}</p>
          <p style="margin:6px 0;color:#666;font-size:13px"><strong>Submitted:</strong> ${submitted} (PH time)</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">
          <p style="color:#888;font-size:12px">
            Sent via Random Ambon — operated by Nolan Nakagdspeed
          </p>
        </div>
      `,
    });

    return res.status(200).json({ ok: true, message: 'Sent successfully.' });
  } catch (err) {
    console.error('[send error]', err);
    return res.status(500).json({ error: 'Failed to send. Try again later.' });
  }
};