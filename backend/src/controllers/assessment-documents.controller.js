const mongoose = require('mongoose');
const PatientAssessment = require('../models/PatientAssessment.model');
const { createSignedDocumentUrl } = require('../services/storage.service');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');

// Patient owns their own documents; Admin is authorized for clinical review.
// Never expose S3 keys, bucket names, or signed URLs in list/assessment responses.
const getAssessmentDocumentAccess = asyncHandler(async (req, res) => {
  const { id, documentId } = req.params;
  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(documentId)) {
    return res.status(400).json({ message: 'Invalid assessment document reference' });
  }

  const assessment = await PatientAssessment.findById(id).select('+assessmentDocuments');
  if (!assessment) return res.status(404).json({ message: 'Assessment not found' });
  if (req.user.role !== 'admin' && String(req.user._id) !== String(assessment.patient)) {
    return res.status(403).json({ message: 'You cannot access another patient’s clinical documents' });
  }

  const document = assessment.assessmentDocuments?.id(documentId);
  if (!document) return res.status(404).json({ message: 'Assessment document not found' });

  const access = await createSignedDocumentUrl({ document });
  res.set('Cache-Control', 'no-store');
  await writeAuditLog({
    req, action: 'patient_assessment_document_accessed', module: 'PatientAssessment',
    recordId: assessment._id,
    newValue: { documentId: document._id, documentType: document.documentType },
  });
  res.json({ url: access.url, expiresInSeconds: access.expiresInSeconds });
});

module.exports = { getAssessmentDocumentAccess };
