const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAssessmentDocument, uploadAssessmentDocument } = require('../src/services/assessmentDocuments.service');

const makeFile = (mimetype, buffer) => ({
  mimetype, buffer, originalname: 'medical-report.pdf', size: buffer.length,
});
const pdf = makeFile('application/pdf', Buffer.from('%PDF-1.7 demo'));
const jpeg = makeFile('image/jpeg', Buffer.from([0xff,0xd8,0xff,0xe0,0,0]));
const png = makeFile('image/png', Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]));
const webp = makeFile('image/webp', Buffer.from('RIFF0000WEBP'));

test('PDF and common imaging formats accepted for either optional field', () => {
  for (const file of [pdf,jpeg,png,webp]) {
    for (const kind of ['doctor_prescription','investigation_report']) {
      assert.doesNotThrow(() => validateAssessmentDocument(file,kind));
    }
  }
});
test('extension or declared MIME alone cannot spoof an uploaded document', () => {
  assert.throws(() => validateAssessmentDocument(makeFile('application/pdf',Buffer.from('<script>alert(1)</script>')),'doctor_prescription'), { status:400 });
  assert.throws(() => validateAssessmentDocument(makeFile('application/x-msdownload',Buffer.from('MZ123456')),'investigation_report'), { status:400 });
  assert.throws(() => validateAssessmentDocument(makeFile('image/png',Buffer.from('%PDF-1.7 demo')),'investigation_report'), { status:400 });
});
test('reject empty, oversized, unexpected categories', () => {
  assert.throws(() => validateAssessmentDocument(makeFile('application/pdf',Buffer.alloc(0)),'doctor_prescription'),{status:400});
  assert.throws(() => validateAssessmentDocument({ ...pdf, size: 10*1024*1024+1 },'investigation_report'),{status:400});
  assert.throws(() => validateAssessmentDocument(pdf,'patient_photo'),{status:400});
});
test('without durable S3 configuration selected uploads fail instead of silently losing health records', async () => {
  const previous = { mode:process.env.DOCUMENT_STORAGE_MODE, region:process.env.AWS_REGION, bucket:process.env.AWS_S3_BUCKET };
  try {
    process.env.DOCUMENT_STORAGE_MODE='local';
    await assert.rejects(() => uploadAssessmentDocument({patientId:'test',documentType:'doctor_prescription',file:pdf}),
      (err) => err.status===503 && /Private document storage/.test(err.message));
  } finally {
    for(const [name,value] of Object.entries({DOCUMENT_STORAGE_MODE:previous.mode,AWS_REGION:previous.region,AWS_S3_BUCKET:previous.bucket})) {
      if(value===undefined) delete process.env[name]; else process.env[name]=value;
    }
  }
});
