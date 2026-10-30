const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const AGENT_ID = '507f1f77bcf86cd799439011';
const DOCTOR_ID = '507f1f77bcf86cd799439012';
const AGENT_USER = '507f1f77bcf86cd799439013';
const rawDoctor = {
  _id: DOCTOR_ID, doctorId: 'DR001', fullName: 'Test Doctor', status: 'approved',
  clinicName: 'Clinic', qrCodeActive: true, qrCodeUrl: 'data:qr',
  revenueModel: 'split', requestedPatientFee: 1000,
  approvedPatientFee: 1000, requestedFeeSharePercentage: 60,
  feeSharePercentage: 60, fixedFeeShareAmount: 100, bankAccountNumber: 'secret',
};

const projectDoctor = (fields) => {
  const names = new Set(String(fields).split(/\s+/));
  assert.equal(names.has('revenueModel'), false, 'agent API must not select revenue');
  assert.equal(names.has('requestedPatientFee'), false, 'agent API must not select prices');
  assert.equal(names.has('approvedPatientFee'), false, 'agent API must not select approved prices');
  assert.equal(names.has('feeSharePercentage'), false, 'agent API must not select commission');
  assert.equal(names.has('fixedFeeShareAmount'), false, 'agent API must not select commission');
  return Object.fromEntries(Object.entries(rawDoctor).filter(([key]) => key === '_id' || names.has(key)));
};

let listFilter;
let detailFilter;
let doctorSelection;
let visitScope;
const mocks = {
  '../models/Agent.model': { findOne: () => ({ select: async () => ({ _id: AGENT_ID, status: 'active' }) }) },
  '../models/Doctor.model': {
    find: (filter) => {
      listFilter = filter;
      return {
        select: (fields) => {
          doctorSelection = fields;
          return { populate: () => ({ sort: () => ({ lean: async () => [projectDoctor(fields)] }) }) };
        },
      };
    },
    findOne: (filter) => {
      detailFilter = filter;
      return {
        select: (fields) => ({
          populate: () => ({ lean: async () => projectDoctor(fields) }),
        }),
      };
    },
  },
  '../models/Program.model': {},
  '../models/User.model': {},
  '../models/ClinicVisit.model': {
    countDocuments: async (filter) => {
      visitScope = filter;
      return 5;
    },
    find: () => ({ select: () => ({ sort: () => ({ limit: () => ({ lean: async () => [] }) }) }) }),
  },
  '../models/Patient.model': { countDocuments: async () => 7 },
  '../models/Payment.model': { Payment: {} },
  '../services/agentPatientCounts.service': {
    getPatientCountsByDoctor: async () => new Map([[DOCTOR_ID, 7]]),
  },
  '../services/agentDoctorVisits.service': {
    getClinicVisitCountsByDoctor: async ({ agentId, doctorIds }) => {
      assert.equal(agentId, AGENT_ID);
      assert.deepEqual(doctorIds, [DOCTOR_ID]);
      return new Map([[DOCTOR_ID, 5]]);
    },
  },
  '../services/storage.service': {},
  '../services/doctorApproval.service': {},
  '../utils/auditLogger': { writeAuditLog: async () => {} },
  '../utils/asyncHandler': (fn) => fn,
};

const originalLoad = Module._load;
let controller;
try {
  Module._load = function(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
    return originalLoad.apply(this, arguments);
  };
  controller = require('../src/controllers/agentDoctor.controller');
} finally {
  Module._load = originalLoad;
}

const request = (body = {}) => ({ params: { doctorId: DOCTOR_ID }, body, user: { _id: AGENT_USER, role: 'agent' } });
async function invoke(method, req = request()) {
  let status = 200;
  let json;
  const res = {
    status(code) { status = code; return this; },
    set() { return this; },
    json(data) { json = data; return this; },
  };
  await controller[method](req, res);
  return { status, json };
}

test('my doctors returns counts without disclosing patient price, revenue or payout', async () => {
  const response = await invoke('getMyDoctors');
  assert.equal(response.status, 200);
  assert.deepEqual(listFilter, { agent: AGENT_ID });
  assert.equal(response.json[0].connectedPatients, 7);
  assert.equal(response.json[0].clinicVisits, 5);
  assert.equal(response.json[0].requestedPatientFee, undefined);
  assert.equal(response.json[0].revenueModel, undefined);
  assert.equal(response.json[0].bankAccountNumber, undefined);
});

test('doctor detail totals all visits and uses an agent-owned doctor filter', async () => {
  const response = await invoke('getMyDoctorById');
  assert.equal(response.status, 200);
  assert.deepEqual(detailFilter, { _id: DOCTOR_ID, agent: AGENT_ID });
  assert.deepEqual(visitScope, { agent: AGENT_ID, doctor: DOCTOR_ID });
  assert.equal(response.json.performance.clinicVisits, 5);
  assert.equal(response.json.performance.connectedPatients, 7);
  assert.equal(response.json.doctor.approvedPatientFee, undefined);
  assert.equal(response.json.doctor.feeSharePercentage, undefined);
});

test('direct API attempts to edit commercial details are forbidden even if hidden in UI', async () => {
  // The controller verifies agent ownership before commercial field rejection.
  // Mock the initial model to provide the doctor as a plain record for update.
  mocks['../models/Doctor.model'].findOne = (filter) => {
    detailFilter = filter;
    return { ...rawDoctor, save: async () => {} };
  };
  const response = await invoke('updateMyDoctor', request({ requestedPatientFee: 1, revenueModel: 'platform_fee' }));
  assert.equal(response.status, 403);
  assert.equal(response.json.code, 'AGENT_COMMERCIAL_UPDATE_FORBIDDEN');
  assert.equal(rawDoctor.requestedPatientFee, 1000);
});
