const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const ID = '507f1f77bcf86cd799439011';
const CASE = '507f1f77bcf86cd799439012';
const REGION = '507f1f77bcf86cd799439013';
const QUESTION = '507f1f77bcf86cd799439014';
let saved, uploads, deletions, failUpload;
const mocks = {
  '../models/PainCategory.model': { findOne: () => ({ select: () => ({ lean: async () => ({ _id: REGION, name: 'Knee' }) }) }) },
  '../models/CaseType.model': { findOne: () => ({ lean: async () => ({ _id: CASE, requiresPhysioReview: false, requiresSurgeryDetails: false }) }) },
  '../models/SurgeryType.model': {},
  '../models/AssessmentQuestion.model': { find: () => ({ sort: async () => [{ _id: QUESTION, isRedFlag: false, conditionalLogic: {} }] }) },
  '../models/PatientAssessment.model': {
    create: async (data) => {
      saved = data;
      return { _id: ID, ...data, toObject() { return { _id: ID, ...data }; } };
    },
  },
  '../services/notification.service': { createNotification: async () => {} },
  '../utils/auditLogger': { writeAuditLog: async () => {} },
  '../utils/asyncHandler': (fn) => fn,
  '../services/assessmentVisibility.service': { isRegionVisibleForCase: () => true, isSurgeryVisible: () => true },
  '../services/patientAssessmentQuestions.service': { patientQuestionTypeFilter: () => ({}) },
  '../services/patientAssessmentClearance.service': { decidePatientAssessmentClearance: () => ({
    hasRedFlag: false, reviewRequired: false, requiresPhysioReview: false, autoCleared: true,
    status: 'cleared', clinicalSelectionRequired: false, criticalFlagCount: 0, routineFlagCount: 0,
  }) },
  '../services/assessmentFlagSeverity.service': { effectiveRedFlagSeverity: () => 'critical' },
  '../services/assessmentDocuments.service': {
    validateAssessmentDocument: (file) => { if (!file?.buffer?.length) throw Object.assign(new Error('invalid file'), { status: 400 }); },
    uploadAssessmentDocument: async ({ documentType, file }) => {
      if (failUpload) throw Object.assign(new Error('storage unavailable'), { status: 503 });
      uploads.push(documentType);
      return { _id: String(uploads.length), documentType, key: 'private-key', bucket: 'secret-bucket',
        storageProvider: 's3', originalName: file.originalname, mimeType: 'application/pdf', size: file.size };
    },
    deleteAssessmentDocument: async (doc) => { deletions.push(doc.documentType); },
    publicAssessmentDocuments: (docs) => docs.map(d => ({ id: d._id, documentType: d.documentType, originalName: d.originalName })),
  },
};
let submit;
const originalLoad = Module._load;
try {
  Module._load = function (request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
    return originalLoad.apply(this, arguments);
  };
  ({ submitCommonAssessment: submit } = require('../src/controllers/common-assessment.controller'));
} finally { Module._load = originalLoad; }

const makeCall = (files, answers = [{ question: QUESTION, answer: 'mild' }], role = 'patient') => {
  let status = 200; let result;
  const req = { user: { role, _id: { toString: () => ID } },
    body: { patientId: ID, caseTypeId: CASE, painCategoryId: REGION, answers }, files };
  const res = { status: (v) => { status = v; return res; }, json: (v) => { result = v; return res; } };
  return { req, res, outcome: () => ({ status, result }) };
};

const pdf = { originalname: 'prescription.pdf', mimetype: 'application/pdf', size: 12, buffer: Buffer.from('%PDF-1234567') };
test.beforeEach(() => { saved = null; uploads = []; deletions = []; failUpload = false; });

test('existing JSON assessment without documents still completes and persists unchanged', async () => {
  const call = makeCall(undefined);
  await submit(call.req, call.res);
  assert.equal(call.outcome().status, 201);
  assert.equal(saved.status, 'cleared');
  assert.equal(saved.assessmentDocuments, undefined);
  assert.deepEqual(call.outcome().result.assessment.documents, []);
  assert.deepEqual(uploads, []);
});

test('multipart answers JSON and optional prescription save safely without revealing S3 keys', async () => {
  const call = makeCall({ doctorPrescription: [pdf] }, JSON.stringify([{ question: QUESTION, answer: 'mild' }]));
  await submit(call.req, call.res);
  assert.equal(call.outcome().status, 201);
  assert.deepEqual(uploads, ['doctor_prescription']);
  assert.equal(saved.assessmentDocuments[0].key, 'private-key');
  assert.equal(call.outcome().result.assessment.documents[0].documentType, 'doctor_prescription');
  assert.ok(!JSON.stringify(call.outcome().result).includes('private-key'));
  assert.ok(!JSON.stringify(call.outcome().result).includes('secret-bucket'));
});

test('both optional documents may be attached to a single assessment', async () => {
  const call = makeCall({ doctorPrescription: [pdf], investigationReport: [{ ...pdf, originalname: 'mri.pdf' }] });
  await submit(call.req, call.res);
  assert.equal(call.outcome().status, 201);
  assert.deepEqual(uploads, ['doctor_prescription', 'investigation_report']);
  assert.equal(call.outcome().result.assessment.documents.length, 2);
});

test('file upload failure leaves assessment uncreated; no-document retry remains possible', async () => {
  failUpload = true;
  const call = makeCall({ investigationReport: [pdf] });
  await assert.rejects(() => submit(call.req, call.res), { status: 503 });
  assert.equal(saved, null);
  failUpload = false;
  const retry = makeCall(undefined);
  await submit(retry.req, retry.res);
  assert.equal(retry.outcome().status, 201);
});

test('invalid multipart answers cannot cause an assessment to be saved', async () => {
  const call = makeCall({}, '{bad json');
  await submit(call.req, call.res);
  assert.equal(call.outcome().status, 400);
  assert.equal(saved, null);
});

test('non-patient cannot attach documents through existing privileged JSON assessment path', async () => {
  const call = makeCall({ doctorPrescription: [pdf] }, [{ question: QUESTION, answer: 'mild' }], 'admin');
  await submit(call.req, call.res);
  assert.equal(call.outcome().status, 403);
  assert.equal(saved, null);
});
