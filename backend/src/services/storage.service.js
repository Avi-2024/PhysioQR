const crypto = require('crypto');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

let s3Client;

// Builds a stable S3 object key for doctor KYC documents.
const buildDoctorDocumentKey = ({ doctorId, documentType, originalName }) => {
  const safeName = String(originalName || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
  return `doctors/${doctorId}/kyc/${documentType}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
};

// Returns a configured S3 client when storage mode is s3.
const getS3Client = () => {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
    });
  }
  return s3Client;
};

// Uploads a doctor KYC document to S3 or stores metadata-only in local test mode.
const uploadDoctorKycDocument = async ({ doctor, documentType, file }) => {
  if (!file) {
    const error = new Error('Document file is required');
    error.status = 400;
    throw error;
  }

  const mode = process.env.DOCUMENT_STORAGE_MODE || (process.env.NODE_ENV === 'production' ? 's3' : 'local');
  const key = buildDoctorDocumentKey({ doctorId: doctor.doctorId || doctor._id, documentType, originalName: file.originalname });
  const bucket = process.env.AWS_S3_BUCKET;

  if (mode === 's3') {
    if (!process.env.AWS_REGION || !bucket) {
      const error = new Error('AWS S3 storage is not configured');
      error.status = 503;
      throw error;
    }

    await getS3Client().send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ServerSideEncryption: 'AES256',
      Metadata: {
        doctorId: String(doctor._id),
        documentType,
      },
    }));
  }

  return {
    documentType,
    storageProvider: mode === 's3' ? 's3' : 'local',
    bucket: mode === 's3' ? bucket : undefined,
    key,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    uploadedAt: new Date(),
  };
};

// Creates a short-lived signed URL for a private doctor KYC object.
const createSignedDocumentUrl = async ({ document }) => {
  if (!document?.key) {
    const error = new Error('Document key is missing');
    error.status = 400;
    throw error;
  }

  if (document.storageProvider !== 's3') {
    return {
      storageProvider: document.storageProvider,
      key: document.key,
      url: null,
      message: 'Document is not stored in S3 in this environment',
    };
  }

  const bucket = document.bucket || process.env.AWS_S3_BUCKET;
  if (!process.env.AWS_REGION || !bucket) {
    const error = new Error('AWS S3 storage is not configured');
    error.status = 503;
    throw error;
  }

  const url = await getSignedUrl(
    getS3Client(),
    new GetObjectCommand({ Bucket: bucket, Key: document.key }),
    { expiresIn: Number(process.env.S3_SIGNED_URL_EXPIRES_SECONDS || 300) }
  );

  return { storageProvider: 's3', key: document.key, url, expiresInSeconds: Number(process.env.S3_SIGNED_URL_EXPIRES_SECONDS || 300) };
};

module.exports = { uploadDoctorKycDocument, createSignedDocumentUrl };
