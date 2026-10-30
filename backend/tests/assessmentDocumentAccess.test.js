const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const PATIENT_ID = '507f1f77bcf86cd799439011';
const OTHER_ID = '507f1f77bcf86cd799439012';
const ASSESSMENT_ID = '507f1f77bcf86cd799439013';
const DOCUMENT_ID = '507f1f77bcf86cd799439014';
let signed, audit, record;
const document = { _id: DOCUMENT_ID, documentType: 'doctor_prescription', key:'s3-private-key',bucket:'private-bucket',storageProvider:'s3' };
const mocks = {
  '../models/PatientAssessment.model': {
    findById: () => ({ select: async () => record }),
  },
  '../services/storage.service': { createSignedDocumentUrl: async () => {
    signed++;
    return {url:'https://example.invalid/temporary-signature',expiresInSeconds:300};
  }},
  '../utils/auditLogger': { writeAuditLog: async () => { audit++; } },
  '../utils/asyncHandler': (fn) => fn,
};
const originalLoad = Module._load;
let access;
try {
  Module._load=function(request,parent,isMain){
    if(Object.prototype.hasOwnProperty.call(mocks,request))return mocks[request];
    return originalLoad.apply(this,arguments);
  };
  ({ getAssessmentDocumentAccess: access } = require('../src/controllers/assessment-documents.controller'));
} finally { Module._load=originalLoad; }

const call=(userId,role='patient',documentId=DOCUMENT_ID)=>{
 let status=200,body,headers={};
 const req={user:{_id:userId,role},params:{id:ASSESSMENT_ID,documentId}};
 const res={status(v){status=v;return res;},json(v){body=v;return res;},set(k,v){headers[k]=v;return res;}};
 return {req,res,result:()=>({status,body,headers})};
};
test.beforeEach(()=>{
 signed=0;audit=0;
 record={patient:PATIENT_ID,_id:ASSESSMENT_ID,assessmentDocuments:{id:(id)=>id===DOCUMENT_ID?document:null}};
});
test('patient can retrieve a short-lived signed URL for own assessment document',async()=>{
 const c=call(PATIENT_ID);await access(c.req,c.res);
 assert.equal(c.result().status,200);
 assert.equal(c.result().body.expiresInSeconds,300);
 assert.equal(c.result().headers['Cache-Control'],'no-store');
 assert.equal(signed,1);assert.equal(audit,1);
 assert.ok(!JSON.stringify(c.result().body).includes('s3-private-key'));
});
test('another patient is denied access before URL signing',async()=>{
 const c=call(OTHER_ID);await access(c.req,c.res);
 assert.equal(c.result().status,403);assert.equal(signed,0);assert.equal(audit,0);
});
test('Admin may review patient documents securely',async()=>{
 const c=call(OTHER_ID,'admin');await access(c.req,c.res);
 assert.equal(c.result().status,200);assert.equal(signed,1);
});
test('unknown assessment or document yields no URL',async()=>{
 let c=call(PATIENT_ID,'patient',OTHER_ID);await access(c.req,c.res);
 assert.equal(c.result().status,404);assert.equal(signed,0);
 record=null;c=call(PATIENT_ID);await access(c.req,c.res);
 assert.equal(c.result().status,404);assert.equal(signed,0);
});
test('malformed document IDs rejected',async()=>{
 const c=call(PATIENT_ID,'patient','not-an-id');await access(c.req,c.res);
 assert.equal(c.result().status,400);assert.equal(signed,0);
});
