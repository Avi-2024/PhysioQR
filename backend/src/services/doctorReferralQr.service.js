const QRCode = require('qrcode');

// QR codes encode a permanent patient-facing registration URL, never the
// browser's current (possibly preview) origin or the backend's API address.
const resolvePatientSiteOrigin = () => {
  const configured = (process.env.APP_URL || process.env.FRONTEND_URL || '').trim();
  const isProduction = process.env.NODE_ENV === 'production';
  const candidate = configured || (isProduction ? '' : 'http://localhost:3000');
  if (!candidate) {
    throw Object.assign(new Error('Set APP_URL to the public patient website URL before generating doctor QR codes'), { status: 503 });
  }

  let url;
  try { url = new URL(candidate); }
  catch {
    throw Object.assign(new Error('APP_URL/FRONTEND_URL must be a valid absolute website URL'), { status: 503 });
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const isLocal = ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(hostname)
    || hostname.endsWith('.localhost') || hostname.endsWith('.local')
    || /^10\./.test(hostname) || /^192\.168\./.test(hostname)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname
      || url.username || url.password || url.search || url.hash
      || (url.pathname !== '/' && url.pathname !== '')) {
    throw Object.assign(new Error('Patient website URL must be an origin without a path, query, or credentials'), { status: 503 });
  }
  if (isProduction && (url.protocol !== 'https:' || isLocal)) {
    throw Object.assign(new Error('Production QR codes require APP_URL with a public HTTPS patient website (not localhost)'), { status: 503 });
  }
  return url.origin;
};

const buildReferralUrl = (doctor) => {
  if (!doctor?.doctorId) throw Object.assign(new Error('Doctor ID is required to generate referral QR'), { status: 400 });
  const url = new URL('/register', resolvePatientSiteOrigin());
  url.searchParams.set('doctor', String(doctor.doctorId));
  return url.toString();
};

const createReferralQr = async (doctor) => {
  const referralUrl = buildReferralUrl(doctor);
  return { referralUrl, qrCodeUrl: await QRCode.toDataURL(referralUrl) };
};

// Recreate display images from the current canonical URL rather than trusting
// old data:image/png records that may still encode localhost.
// This is a read-only projection: inactive QR codes never get reactivated.
const getActiveReferralQr = async (doctor) => {
  if (!doctor?.qrCodeActive || doctor.status !== 'approved') {
    return { referralUrl: null, qrCodeUrl: null };
  }
  return createReferralQr(doctor);
};

module.exports = { resolvePatientSiteOrigin, buildReferralUrl, createReferralQr, getActiveReferralQr };
