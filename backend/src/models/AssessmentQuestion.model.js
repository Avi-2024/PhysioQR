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
  painCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'PainCategory' },
  isRedFlag: { type: Boolean, default: false },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },

  // Conditional logic — show this question only if a previous answer matches
  showIfQuestion: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentQuestion' },
  showIfAnswer: String,
}, { timestamps: true });

module.exports = mongoose.model('AssessmentQuestion', assessmentQuestionSchema);
