const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  resolvePatientSiteOrigin, buildReferralUrl, createReferralQr, getActiveReferralQr,
} = require('../src/services/doctorReferralQr.service');

const before = {
  NODE_ENV: process.env.NODE_ENV,
  APP_URL: process.env.APP_URL,
  FRONTEND_URL: process.env.FRONTEND_URL,
};
const reset = () => {
  for (const [key,value] of Object.entries(before)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
};
test.afterEach(reset);
const production = () => {
  process.env.NODE_ENV = 'production';
  delete process.env.APP_URL;
  delete process.env.FRONTEND_URL;
};
const doctor = { doctorId: 'DR00001', status: 'approved', qrCodeActive: true, qrCodeUrl: 'data:image/png;base64,OLD_LOCALHOST_QR' };

test('production QR links use public HTTPS origin from APP_URL', () => {
  production();
  process.env.APP_URL = 'https://physio-qr-teal.vercel.app/';
  const url = buildReferralUrl(doctor);
  assert.equal(url, 'https://physio-qr-teal.vercel.app/register?doctor=DR00001');
  assert.equal(resolvePatientSiteOrigin(), 'https://physio-qr-teal.vercel.app');
});

test('production can use a configured public FRONTEND_URL if APP_URL is omitted', () => {
  production();
  process.env.FRONTEND_URL = 'https://patient-site.example';
  assert.equal(buildReferralUrl(doctor), 'https://patient-site.example/register?doctor=DR00001');
});

test('production cannot silently encode localhost or an unset website URL', () => {
  production();
  assert.throws(() => buildReferralUrl(doctor), {status:503});
  for (const site of ['http://localhost:3000', 'https://localhost:3000', 'http://127.0.0.1:3000',
    'http://192.168.1.5', 'http://10.0.0.5', 'http://patient-site.example']) {
    process.env.APP_URL = site;
    assert.throws(() => buildReferralUrl(doctor), {status:503}, site);
  }
});

test('configured website must not contain paths, query strings, fragments or credentials', () => {
  production();
  for (const site of ['https://patient-site.example/subpath',
    'https://patient-site.example?doctor=someone', 'https://patient-site.example/#anchor',
    'https://user:pass@patient-site.example', 'invalid-site']) {
    process.env.APP_URL = site;
    assert.throws(() => buildReferralUrl(doctor), {status:503}, site);
  }
});

test('missing doctor identity fails without producing a QR', () => {
  production();
  process.env.APP_URL = 'https://patient-site.example';
  assert.throws(() => buildReferralUrl({status:'approved', qrCodeActive:true}), {status:400});
});

test('doctor referral IDs are URL-encoded rather than interpolated into URL structure', () => {
  production();
  process.env.APP_URL = 'https://patient-site.example';
  const url = buildReferralUrl({...doctor, doctorId:'DR&001?'});
  assert.equal(new URL(url).searchParams.get('doctor'), 'DR&001?');
  assert.equal(new URL(url).origin, 'https://patient-site.example');
});

test('existing saved localhost QR is replaced in read-only API projection', async () => {
  production();
  process.env.APP_URL = 'https://patient-site.example';
  const data = await getActiveReferralQr(doctor);
  assert.equal(data.referralUrl, 'https://patient-site.example/register?doctor=DR00001');
  assert.ok(data.qrCodeUrl.startsWith('data:image/png;base64,'));
  assert.notEqual(data.qrCodeUrl, doctor.qrCodeUrl);
  assert.equal(doctor.qrCodeUrl, 'data:image/png;base64,OLD_LOCALHOST_QR', 'must not mutate stored data');
  const same = await createReferralQr(doctor);
  assert.equal(same.qrCodeUrl, data.qrCodeUrl);
});

test('disabled and unapproved doctors do not expose active QR codes', async () => {
  production();
  for (const data of [
    {...doctor, qrCodeActive:false},
    {...doctor, status:'suspended'},
    {...doctor, status:'submitted'},
  ]) {
    assert.deepEqual(await getActiveReferralQr(data), {referralUrl:null,qrCodeUrl:null});
  }
});

test('legacy QR paths use centralized URL service instead of local hardcoded links', () => {
  for (const relative of ['../src/controllers/doctor.controller.js',
    '../src/services/doctorApproval.service.js',
    '../src/controllers/agentDoctor.controller.js']) {
    const source = fs.readFileSync(path.join(__dirname,relative),'utf8');
    assert.ok(!source.includes('http://localhost:3000'), relative);
    assert.ok(!source.includes('${process.env.APP_URL}/register'), relative);
  }
});

test('local dev keeps original localhost behavior without production config', () => {
  process.env.NODE_ENV = 'development';
  delete process.env.APP_URL;
  delete process.env.FRONTEND_URL;
  assert.equal(buildReferralUrl(doctor), 'http://localhost:3000/register?doctor=DR00001');
});
