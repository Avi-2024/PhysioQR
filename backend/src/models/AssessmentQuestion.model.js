const mongoose = require('mongoose');

const assessmentQuestionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  questionTextHindi: String,
  questionType: {
    type: String,
    enum: ['single_choice', 'multiple_choice', 'yes_no', 'pain_scale', 'number', 'text', 'date', 'image'],
    required: true,
  },
  options: [{ label: String, labelHindi: String, value: String }],

  // Stable key used only by system seed scripts. Admin-created questions do not
  // need one. This makes the default clinical library safe to re-run without
  // creating duplicate questions.
  seedKey: { type: String, unique: true, sparse: true, trim: true },

  // Existing questions default to common so current production data remains valid.
  // Admin can scope new questions to a body region or a surgery type without
  // creating a separate hardcoded frontend form for every pathway.
  scopeType: {
    type: String,
    enum: ['common', 'body_region', 'surgery_type'],
    default: 'common',
  },
  bodyRegion: { type: mongoose.Schema.Types.ObjectId, ref: 'PainCategory' },
  surgeryType: { type: mongoose.Schema.Types.ObjectId, ref: 'SurgeryType' },

  isRedFlag: { type: Boolean, default: false },
  redFlagAnswerValues: [{ type: mongoose.Schema.Types.Mixed }],
  redFlagOperator: {
    type: String,
    enum: ['any_answer', 'equals', 'not_equals', 'includes', 'gte', 'lte', 'between'],
    default: 'any_answer',
  },
  redFlagMinValue: Number,
  redFlagMaxValue: Number,
  redFlagSafetyMessage: String,
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },

  // Conditional logic controls when a question becomes visible after a prior answer.
  showIfQuestion: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentQuestion' },
  showIfAnswer: String,
  conditionalLogic: {
    dependsOnQuestion: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentQuestion' },
    operator: {
      type: String,
      enum: ['equals', 'not_equals', 'includes', 'gte', 'lte', 'between'],
    },
    value: mongoose.Schema.Types.Mixed,
    values: [{ type: mongoose.Schema.Types.Mixed }],
    minValue: Number,
    maxValue: Number,
  },
}, { timestamps: true });

assessmentQuestionSchema.index({ isActive: 1, scopeType: 1, bodyRegion: 1, surgeryType: 1, displayOrder: 1 });

module.exports = mongoose.model('AssessmentQuestion', assessmentQuestionSchema);
