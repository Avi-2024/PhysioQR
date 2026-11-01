const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

let mobilePatient = null;
let emailPatient = null;
let createdPatient = null;
let otpSendCount = 0;
let otpVerifyCount = 0;
let sessionCount = 0;

const patientModel = {
  findOne: (filter) => {
    const match = filter.mobile ? mobilePatient : emailPatient;
    return {
      select: async () => match,
      collation: () => ({select:async()=>match}),
    };
  },
  findOneAndUpdate: async () => mobilePatient,
  create: async (data) => {
    createdPatient = data;
    return { _id: '507f1f77bcf86cd799439011', ...data };
  },
};
const stubs = {
  '../models/Patient.model': patientModel,
  '../models/Doctor.model': {findOne:async()=>null},
  '../models/QrScan.model': {create:async()=>null},
  '../services/otp.service': {
    sendOtp: async () => {otpSendCount++;return {delivery:'test'};},
    verifyOtp: async ({mobile}) => {otpVerifyCount++;return {mobile};},
  },
  '../services/authSession.service': {
    ACCESS_COOKIE_NAME: 'access',REFRESH_COOKIE_NAME:'refresh',
    createAuthSession:async()=>{sessionCount++;return {accessToken:'token',refreshToken:'refresh',session:{_id:'session'}};},
  },
  '../utils/asyncHandler': (handler)=>handler,
  '../utils/auditLogger': {writeAuditLog:async()=>null},
  '../services/patientAssessmentClearance.service': {requiresClinicalProgrammeSelection:()=>false},
};

const load = Module._load;
let registerPatient,sendOtp,verifyOtp;
try {
  Module._load = function(request,parent,isMain) {
    if (Object.prototype.hasOwnProperty.call(stubs,request)) return stubs[request];
    return load.apply(this,arguments);
  };
  ({registerPatient}=require('../src/controllers/patient.controller'));
  ({sendOtp,verifyOtp}=require('../src/controllers/auth.controller'));
} finally { Module._load=load; }

const makeCall=(body)=>{
  let status=200,reply;
  const req={body};
  const res={
    status(value){status=value;return res;},
    json(value){reply=value;return res;},
    cookie(){return res;},
  };
  return {req,res,outcome:()=>({status,reply})};
};

test.beforeEach(()=>{
  mobilePatient=null;emailPatient=null;createdPatient=null;otpSendCount=0;otpVerifyCount=0;sessionCount=0;
});

test('existing verified mobile cannot be registered again or acquire a registration OTP',async()=>{
  mobilePatient={_id:'existing-patient',mobileVerified:true};
  let c=makeCall({fullName:'New Name',mobile:'9876543210'});
  await registerPatient(c.req,c.res);
  assert.equal(c.outcome().status,409);
  assert.equal(c.outcome().reply.code,'PATIENT_ALREADY_REGISTERED');
  assert.equal(createdPatient,null);
  c=makeCall({mobile:'9876543210',purpose:'registration'});
  await sendOtp(c.req,c.res);
  assert.equal(c.outcome().status,409);
  assert.equal(otpSendCount,0);
  assert.equal(sessionCount,0);
});

test('registration-purpose OTP cannot authenticate a previously verified account',async()=>{
  mobilePatient={_id:'existing-patient',mobileVerified:true};
  const c=makeCall({mobile:'9876543210',otp:'123456',purpose:'registration'});
  await verifyOtp(c.req,c.res);
  assert.equal(c.outcome().status,409);
  assert.equal(c.outcome().reply.code,'PATIENT_ALREADY_REGISTERED');
  assert.equal(otpVerifyCount,0);
  assert.equal(sessionCount,0);
});

test('verified existing patients can still explicitly sign in using login-purpose OTP',async()=>{
  mobilePatient={_id:'existing-patient',mobileVerified:true,
    fullName:'Existing Patient',mobile:'9876543210',status:'active'};
  let c=makeCall({mobile:'9876543210',purpose:'login'});
  await sendOtp(c.req,c.res);
  assert.equal(c.outcome().status,200);
  assert.equal(otpSendCount,1);
  c=makeCall({mobile:'9876543210',otp:'123456',purpose:'login'});
  await verifyOtp(c.req,c.res);
  assert.equal(c.outcome().status,200);
  assert.equal(c.outcome().reply.registered,true);
  assert.equal(sessionCount,1);
});

test('existing email with a different mobile also cannot create a duplicate patient',async()=>{
  emailPatient={_id:'other-patient'};
  const c=makeCall({fullName:'Duplicate Email',mobile:'9876543210',email:'EXAMPLE@PhysioQR.com'});
  await registerPatient(c.req,c.res);
  assert.equal(c.outcome().status,409);
  assert.equal(c.outcome().reply.code,'PATIENT_EMAIL_ALREADY_REGISTERED');
  assert.equal(createdPatient,null);
});

test('pending onboarding can verify the existing mobile and resume instead of receiving a duplicate account',async()=>{
  mobilePatient={_id:'pending-patient',mobileVerified:false,mobile:'9876543210',status:'active'};
  let c=makeCall({fullName:'Pending Patient',mobile:'9876543210'});
  await registerPatient(c.req,c.res);
  assert.equal(c.outcome().status,409);
  assert.equal(c.outcome().reply.code,'PATIENT_REGISTRATION_PENDING');
  c=makeCall({mobile:'9876543210',purpose:'registration'});
  await sendOtp(c.req,c.res);
  assert.equal(c.outcome().status,200);
  c=makeCall({mobile:'9876543210',otp:'123456',purpose:'registration'});
  await verifyOtp(c.req,c.res);
  assert.equal(c.outcome().status,200);
  assert.equal(c.outcome().reply.registered,true);
  assert.equal(sessionCount,1);
});

test('brand-new patient still registers normally without authenticating before OTP verification',async()=>{
  const c=makeCall({fullName:'New Patient',mobile:'9876543210',email:'NEW@EXAMPLE.COM',age:22,gender:'female'});
  await registerPatient(c.req,c.res);
  assert.equal(c.outcome().status,201);
  assert.equal(createdPatient.email,'new@example.com');
  assert.equal(sessionCount,0);
});
