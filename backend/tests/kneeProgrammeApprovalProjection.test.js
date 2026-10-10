const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { isCandidateForProgrammeSignoff } = require('../src/services/programmeReleaseGate.service');
const { PROGRAM_CODE, EXERCISE_PREFIX } = require('../src/data/generalKnee30DayDraft');

const programmeId = '507f1f77bcf86cd799439011';
const exerciseId = '507f1f77bcf86cd799439012';
const adminId = '507f1f77bcf86cd799439013';

let programme, exercise, audit, projection, updates;

const Program = {
  findById: async () => programme,
};

const Exercise = {
  find: () => ({
    select: (fields) => {
      projection = fields;
      return {
        // Mimic Mongoose .select() so missing projected fields disappear.
        lean: async () => {
          const requested = new Set(fields.split(/\\s+/));
          if (!exercise.videoCandidateReviewPending) return [];
          return [Object.fromEntries(Object.entries(exercise).filter(([key]) => requested.has(key)))];
        },
      };
    },
  }),
  updateOne: async (filter, changes) => {
    if (exercise._id !== filter._id || exercise.youtubeVideoId !== filter.youtubeVideoId
      || exercise.videoUrl !== filter.videoUrl || !exercise.videoCandidateReviewPending) {
      return { modifiedCount: 0 };
    }
    Object.assign(exercise, changes.$set);
    updates += 1;
    return { modifiedCount: 1 };
  },
};

const originalLoad = Module._load;
let recordProgrammeClinicalApproval;
try {
  Module._load = function(request, parent, isMain) {
    if (request === 'mongoose') return { isValidObjectId: (id) => /^[a-f0-9]{24}$/i.test(id) };
    if (request === '../../models/Program.model') return Program;
    if (request === '../../models/PainCategory.model') return {};
    if (request === '../../models/PatientProgram.model') return {};
    if (request === '../../models/Exercise.model') return { ProgramDay: {}, Exercise };
    if (request === '../../utils/auditLogger') return { writeAuditLog: async (entry) => { audit = entry; } };
    if (request === '../../utils/queryHelpers') return { getPagination: () => ({}) };
    if (request === '../../utils/asyncHandler') return (fn) => fn;
    if (request === '../../services/programmeReleaseGate.service') {
      return {
        inspectProgrammeRelease: async () => ({
          issues: [], exercises: [{ id: exerciseId }],
        }),
        ensureApprovedRelease: async () => {},
        isCandidateForProgrammeSignoff,
      };
    }
    return originalLoad.apply(this, arguments);
  };
  ({ recordProgrammeClinicalApproval } = require('../src/controllers/admin/programs.controller'));
} finally {
  Module._load = originalLoad;
}

test.beforeEach(() => {
  audit = null;
  projection = '';
  updates = 0;
  exercise = {
    _id: exerciseId,
    name: 'Gentle Glute Bridge',
    seedKey: EXERCISE_PREFIX + 'bridge',
    videoUrl: 'https://www.youtube.com/watch?v=WK-5Pb9nNwQ',
    youtubeVideoId: 'WK-5Pb9nNwQ',
    isDemoVideo: true,
    videoCandidateReviewPending: true,
    videoCandidateSourcePage: 'https://www.kingstonandrichmond.nhs.uk/',
  };
  programme = {
    _id: programmeId, programCode: PROGRAM_CODE,
    isActive: false, clinicalApprovalRequired: true, clinicalApproval: {},
    save: async () => {},
  };
});

const submit = async () => {
  let status = 200;
  let body;
  const response = {
    status(code) { status = code; return response; },
    json(value) { body = value; return response; },
  };
  await recordProgrammeClinicalApproval({
    params: { id: programmeId },
    body: { clinicianName: 'Actual Reviewing Physiotherapist',
      reviewNote: 'The reviewing clinician confirmed programme exercises, doses, precautions and video suitability.' },
    user: { _id: adminId },
  }, response);
  return { status, body };
};

test('sign-off selects review-pending field and does not falsely reject a valid mapped video', async () => {
  const result = await submit();
  assert.equal(result.status, 200);
  assert.match(projection, /\\bvideoCandidateReviewPending\\b/);
  assert.equal(updates, 1);
  assert.equal(exercise.videoCandidateReviewPending, false);
  assert.equal(exercise.isDemoVideo, false);
  assert.equal(programme.isActive, false);
  assert.ok(programme.clinicalApproval.approvedAt);
  assert.equal(audit.action, 'programme_clinical_signoff_recorded');
  assert.equal(audit.metadata.videoCandidatesReviewedInProgrammeSignoff, 1);
});

test('if source information really is missing, explain which exercise is blocked', async () => {
  exercise.videoCandidateSourcePage = '';
  const result = await submit();
  assert.equal(result.status, 409);
  assert.match(result.body.message, /Gentle Glute Bridge/);
  assert.equal(updates, 0);
  assert.equal(programme.clinicalApproval.approvedAt, undefined);
});
