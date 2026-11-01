const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const ID = '507f1f77bcf86cd799439011';
let created, provisioned, existingAccount, duplicateDoctor, recorded;
const stubs = {
  '../models/Doctor.model': {
    findOne: () => ({ select: () => ({ lean: async () => duplicateDoctor ? {_id:ID} : null }) }),
    create: async (payload) => {created={...payload};return { ...payload, _id:ID, toObject(){return {...payload,_id:ID};} };},
    deleteOne: async () => ({}),
  },
  '../models/Agent.model': {
    findOne: () => ({select:async()=>({ _id:ID, status:'active' })}),
    findById: () => ({select:async()=>({ _id:ID,status:'active' })}),
  },
  '../models/User.model': {exists:async()=>existingAccount},
  '../models/Program.model': {findOne: () => ({select: () => ({lean:async()=>({_id:ID})})})},
  '../services/doctorApproval.service': {provisionApprovedDoctor:async()=>{provisioned++;return {temporaryPassword:'test-only'};}},
  '../utils/auditLogger': {writeAuditLog:async({newValue})=>{recorded=newValue;}},
  '../utils/asyncHandler': (fn)=>fn,
};
const orig=Module._load;
let register;
try {
  Module._load=function(request,parent,isMain) {
    if(Object.prototype.hasOwnProperty.call(stubs,request)) return stubs[request];
    return orig.apply(this,arguments);
  };
  ({registerDoctorSecure:register}=require('../src/controllers/doctorRegistration.controller'));
} finally {Module._load=orig;}
function call(body={},role) {
  let status=200,result;
  const req={body,user:role?{role,_id:ID}:undefined};
  const res={status(code){status=code;return res;},json(data){result=data;return res;}};
  return {req,res,outcome:()=>({status,result})};
}
const profile={
  fullName:'Doctor Example', mobile:'9999999999', email:'doctor@example.com',
  qualification:'MBBS',specialization:'Orthopedics',medicalRegNumber:'MED-123',
  clinicName:'Clinic Example',city:'Bhopal',
};
test.beforeEach(()=>{created=null;provisioned=0;existingAccount=false;duplicateDoctor=false;recorded=null;});

test('untrusted public application is agentless, pending approval and fixed at 50:50',async()=>{
  const x=call({...profile,agent:ID,revenueModel:'platform_fee',requestedPatientFee:1000,
    requestedFeeShareType:'fixed',requestedFixedFeeShareAmount:900,
    feeSharePercentage:90,feeShareSlabs:[{percentage:90}],status:'approved',
    qrCodeActive:true,registrationSource:'agent'});
  await register(x.req,x.res);
  assert.equal(x.outcome().status,201);
  assert.equal(created.registrationSource,'website_direct');
  assert.equal(created.agent,undefined);
  assert.equal(created.status,'submitted');
  assert.equal(created.revenueModel,'split');
  assert.equal(created.feeShareType,'percentage');
  assert.equal(created.feeSharePercentage,50);
  assert.equal(created.requestedFeeSharePercentage,50);
  assert.equal(created.requestedPatientFee,undefined);
  assert.equal(created.approvedPatientFee,undefined);
  assert.equal(provisioned,0,'website self-registration must not provision login or active QR');
  assert.equal(recorded.registrationSource,'website_direct');
});

test('public doctor signup rejects missing qualifications and invalid mobile number',async()=>{
  let x=call({fullName:'Doctor',mobile:'9999999999'});
  await register(x.req,x.res);
  assert.equal(x.outcome().status,400);assert.equal(created,null);
  x=call({...profile,mobile:'1234'});
  await register(x.req,x.res);
  assert.equal(x.outcome().status,400);assert.equal(created,null);
});

test('public signup refuses duplicate portal identities without overriding them',async()=>{
  existingAccount=true;
  const x=call(profile);await register(x.req,x.res);
  assert.equal(x.outcome().status,409);assert.equal(created,null);
});

test('authenticated Agent retains variable percentage commissions and auto-approval',async()=>{
  const x=call({...profile,preferredProgram:ID,revenueModel:'split',
    requestedPatientFee:1200,requestedFeeShareType:'percentage',
    requestedFeeSharePercentage:65},'agent');
  await register(x.req,x.res);
  assert.equal(x.outcome().status,201);
  assert.equal(created.registrationSource,'agent');
  assert.equal(created.revenueModel,'split');
  assert.equal(created.feeSharePercentage,65);
  assert.equal(created.agent,ID);
  assert.equal(provisioned,1);
});

test('Agent fixed commission remains supported; Admin can submit variable terms',async()=>{
  let x=call({...profile,preferredProgram:ID,revenueModel:'split',requestedPatientFee:1000,
    requestedFeeShareType:'fixed',requestedFixedFeeShareAmount:250},'agent');
  await register(x.req,x.res);
  assert.equal(x.outcome().status,201);
  assert.equal(created.feeShareType,'fixed');assert.equal(created.fixedFeeShareAmount,250);
  created=null;
  x=call({...profile,revenueModel:'split',requestedPatientFee:1000,
    requestedFeeShareType:'percentage',requestedFeeSharePercentage:70},'admin');
  await register(x.req,x.res);
  assert.equal(x.outcome().status,201);
  assert.equal(created.registrationSource,'admin');
  assert.equal(created.feeSharePercentage,70);
  assert.equal(provisioned,1,'Admin-submitted doctor remains unapproved');
});
