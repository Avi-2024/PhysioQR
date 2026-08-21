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

  // Conditional logic controls when a common-assessment question is visible
  // after a prior answer. Questions are intentionally not pain-category scoped.
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

module.exports = mongoose.model('AssessmentQuestion', assessmentQuestionSchema);
