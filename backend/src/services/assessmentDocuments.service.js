const crypto = require('crypto');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Patient health records must never be silently accepted in metadata-only mode.
const MAX_ASSESSMENT_DOCUMENT_SIZE = 10 * 1024 * 1024;
const DOCUMENT_TYPES = ['doctor_prescription', 'investigation_report'];
const MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

const uploadError = (message, status = 400) => Object.assign(new Error(message), { status });
const hasValidSignature = (file) => {
  const bytes = file?.buffer;
  if (!Buffer.isBuffer(bytes) || !bytes.length) return false;
  if (file.mimetype === 'application/pdf') return bytes.subarray(0, 5).toString('ascii') === '%PDF-';
  if (file.mimetype === 'image/jpeg') return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.mimetype === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (file.mimetype === 'image/webp') return bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  return false;
};

const validateAssessmentDocument = (file, documentType) => {
  if (!DOCUMENT_TYPES.includes(documentType)) throw uploadError('Unknown assessment document type');
  if (!file || !Number.isFinite(file.size) || file.size < 1 || file.size > MAX_ASSESSMENT_DOCUMENT_SIZE) {
    throw uploadError('Assessment documents must be non-empty and at most 10 MB');
  }
  if (!MIME_TYPES.includes(file.mimetype) || !hasValidSignature(file)) {
    throw uploadError('Upload a valid PDF, JPG, PNG or WebP document');
  }
};

const getStorageConfig = () => {
  const mode = process.env.DOCUMENT_STORAGE_MODE || (process.env.NODE_ENV === 'production' ? 's3' : 'local');
  if (mode !== 's3' || !process.env.AWS_REGION || !process.env.AWS_S3_BUCKET) {
    throw uploadError('Private document storage is not configured. You can continue the assessment without attachments.', 503);
  }
  return { bucket: process.env.AWS_S3_BUCKET };
};

let s3;
const getClient = () => {
  if (!s3) s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }
      : undefined,
  });
  return s3;
};

const uploadAssessmentDocument = async ({ patientId, documentType, file }) => {
  validateAssessmentDocument(file, documentType);
  const { bucket } = getStorageConfig();
  const key = `patients/${patientId}/assessments/${documentType}/${crypto.randomUUID()}`;
  await getClient().send(new PutObjectCommand({
    Bucket: bucket, Key: key, Body: file.buffer, ContentType: file.mimetype,
    ServerSideEncryption: 'AES256', ContentDisposition: 'attachment',
    Metadata: { patientId: String(patientId), documentType },
  }));
  return {
    documentType, storageProvider: 's3', bucket, key,
    originalName: String(file.originalname || 'document').slice(0, 180),
    mimeType: file.mimetype, size: file.size, uploadedAt: new Date(),
  };
};

const deleteAssessmentDocument = async (document) => {
  if (document?.storageProvider === 's3' && document.bucket && document.key) {
    await getClient().send(new DeleteObjectCommand({ Bucket: document.bucket, Key: document.key }));
  }
};

const publicAssessmentDocuments = (documents = []) => documents.map((document) => ({
  id: String(document._id || ''),
  documentType: document.documentType,
  originalName: document.originalName,
  mimeType: document.mimeType,
  size: document.size,
  uploadedAt: document.uploadedAt,
}));

module.exports = {
  MAX_ASSESSMENT_DOCUMENT_SIZE, DOCUMENT_TYPES, MIME_TYPES,
  validateAssessmentDocument, uploadAssessmentDocument, deleteAssessmentDocument, publicAssessmentDocuments,
};
