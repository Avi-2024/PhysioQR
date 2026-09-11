require('dotenv').config();

const mongoose = require('mongoose');
const AssessmentQuestion = require('../src/models/AssessmentQuestion.model');
const PainCategory = require('../src/models/PainCategory.model');
const SurgeryType = require('../src/models/SurgeryType.model');

const yesNoOptions = [
  { label: 'Yes', labelHindi: 'हाँ', value: 'yes' },
  { label: 'No', labelHindi: 'नहीं', value: 'no' },
];

const slug = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

const options = (items) => items.map((item) => {
  if (Array.isArray(item)) return { label: item[0], value: item[1], labelHindi: item[2] || '' };
  return { label: item, value: slug(item), labelHindi: '' };
});

const common = (seedKey, questionText, questionType, displayOrder, extra = {}) => ({
  seedKey,
  questionText,
  questionType,
  displayOrder,
  scopeType: 'common',
  isActive: true,
  ...extra,
});

const scoped = (seedKey, questionText, questionType, displayOrder, scopeType, target, extra = {}) => ({
  seedKey,
  questionText,
  questionType,
  displayOrder,
  scopeType,
  isActive: true,
  ...(scopeType === 'body_region' ? { bodyRegion: target } : { surgeryType: target }),
  ...extra,
});

const redFlag = (seedKey, questionText, displayOrder, safetyMessage) => common(
  seedKey,
  questionText,
  'yes_no',
  displayOrder,
  {
    options: yesNoOptions,
    isRedFlag: true,
    redFlagOperator: 'equals',
    redFlagAnswerValues: ['yes'],
    redFlagSafetyMessage: safetyMessage,
  },
);

async function upsertQuestion(payload) {
  return AssessmentQuestion.findOneAndUpdate(
    { seedKey: payload.seedKey },
    { $set: payload },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function findRegion(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return PainCategory.findOne({
    $or: [
      { name: new RegExp(`^${escaped}$`, 'i') },
      { name: new RegExp(`^${escaped} Pain$`, 'i') },
    ],
  }).select('_id name isActive').lean();
}

async function seedCommonQuestions() {
  const items = [
    common('common_problem_start', 'When did your problem start?', 'single_choice', 10, {
      options: options([
        ['Today', 'today'],
        ['1–7 days ago', '1_7_days'],
        ['1–4 weeks ago', '1_4_weeks'],
        ['1–3 months ago', '1_3_months'],
        ['More than 3 months ago', 'more_than_3_months'],
        ['Not sure', 'not_sure'],
      ]),
    }),
    common('common_problem_onset', 'How did the problem start?', 'single_choice', 20, {
      options: options([
        ['Suddenly', 'suddenly'],
        ['Gradually', 'gradually'],
        ['After exercise or sport', 'after_exercise_sport'],
        ['After lifting', 'after_lifting'],
        ['After a fall or injury', 'after_fall_injury'],
        ['After work or another activity', 'after_work_activity'],
        ['No specific reason', 'no_specific_reason'],
        ['Other', 'other'],
      ]),
    }),
    common('common_current_pain', 'How much pain do you have right now? (0 = no pain, 10 = worst pain)', 'pain_scale', 30),
    common('common_worst_pain_7_days', 'What was your worst pain in the last 7 days? (0–10)', 'pain_scale', 40),
    common('common_symptoms_worse', 'What makes your symptoms worse?', 'multiple_choice', 50, {
      options: options(['Sitting', 'Standing', 'Walking', 'Bending', 'Lifting', 'Stairs', 'Exercise', 'Work', 'Sleeping', 'Other']),
    }),
    common('common_symptoms_better', 'What makes your symptoms better?', 'multiple_choice', 60, {
      options: options(['Rest', 'Movement', 'Exercise', 'Heat', 'Ice', 'Medication', 'Changing position', 'Other']),
    }),
    common('common_daily_activity_impact', 'How much does this problem affect your daily activities? Enter a number from 0 to 10.', 'number', 70),
    common('common_biggest_difficulty', 'What is the biggest thing you cannot do comfortably because of this problem?', 'text', 80),
    common('common_medical_conditions', 'Do you have any medical conditions your physiotherapist should know about?', 'multiple_choice', 90, {
      options: options(['Diabetes', 'High blood pressure', 'Heart condition', 'Previous fracture', 'Osteoporosis', 'Neurological condition', 'Other', 'None']),
    }),
    common('common_doctor_restrictions', 'Has your doctor given you any exercise or movement restrictions?', 'single_choice', 100, {
      options: options([
        ['No', 'no'],
        ['Yes', 'yes'],
        ["I'm not sure", 'not_sure'],
      ]),
    }),
    common('common_movement_description', 'How would you describe your movement right now?', 'single_choice', 120, {
      options: options([
        ['Normal', 'normal'],
        ['Slightly limited', 'slightly_limited'],
        ['Moderately limited', 'moderately_limited'],
        ['Severely limited', 'severely_limited'],
      ]),
    }),
    common('common_recovery_goal', 'What is the ONE main recovery goal you want to get back to?', 'text', 130),
    common('common_goal_importance', 'How important is achieving this recovery goal? Enter a number from 1 to 10.', 'number', 140),
  ];

  const saved = [];
  for (const item of items) saved.push(await upsertQuestion(item));

  const restrictions = saved.find((item) => item.seedKey === 'common_doctor_restrictions');
  await upsertQuestion(common('common_doctor_restrictions_detail', 'Please describe the exercise or movement restrictions your doctor gave you.', 'text', 110, {
    showIfQuestion: restrictions._id,
    showIfAnswer: 'yes',
    conditionalLogic: {
      dependsOnQuestion: restrictions._id,
      operator: 'equals',
      value: 'yes',
    },
  }));
}

async function seedSafetyQuestions() {
  const urgentMessage = 'Stop the exercise pathway and seek urgent medical assessment before continuing rehabilitation.';
  const reviewMessage = 'Medical or physiotherapy review is required before starting the exercise programme.';

  const items = [
    redFlag('safety_bladder_bowel', 'Have you developed new difficulty controlling your bladder or bowel, or difficulty passing urine?', 200, urgentMessage),
    redFlag('safety_saddle_numbness', 'Do you have new numbness or loss of feeling around your genitals, anus, or the area you would sit on a saddle?', 210, urgentMessage),
    redFlag('safety_bilateral_leg_weakness', 'Do you have severe or worsening weakness, numbness, or tingling in both legs?', 220, urgentMessage),
    redFlag('safety_serious_accident', 'Did this problem start after a serious accident or major trauma?', 230, reviewMessage),
    redFlag('safety_fever_unwell', 'Along with this pain or problem, do you currently feel feverish, shivery, or generally very unwell?', 240, reviewMessage),
  ];

  for (const item of items) await upsertQuestion(item);
}

async function seedRegionQuestions() {
  const definitions = [
    {
      region: 'Lower Back',
      questions: [
        ['lower_back_location', 'Where is your lower-back pain?', 'single_choice', 310, { options: options(['Centre of lower back', 'Right side', 'Left side', 'Both sides', 'Buttock', 'Leg']) }],
        ['lower_back_leg_radiation', 'Does the pain travel into your leg?', 'single_choice', 320, { options: options([['No', 'no'], ['Yes, right leg', 'right_leg'], ['Yes, left leg', 'left_leg'], ['Both legs', 'both_legs']]) }],
        ['lower_back_difficult_activities', 'Which activities are difficult because of your lower-back problem?', 'multiple_choice', 330, { options: options(['Sitting', 'Standing', 'Walking', 'Bending', 'Lifting', 'Sleeping']) }],
      ],
    },
    {
      region: 'Neck',
      questions: [
        ['neck_symptom_location', 'Where do you feel the neck-related symptoms?', 'multiple_choice', 410, { options: options(['Neck', 'Shoulder', 'Upper back', 'Arm', 'Hand']) }],
        ['neck_arm_hand_symptoms', 'Do you have symptoms going into your arm or hand?', 'single_choice', 420, { options: options([['No', 'no'], ['Right', 'right'], ['Left', 'left'], ['Both', 'both']]) }],
        ['neck_difficult_activities', 'What is difficult because of your neck problem?', 'multiple_choice', 430, { options: options(['Turning head', 'Looking up or down', 'Sitting', 'Working', 'Sleeping', 'Driving']) }],
      ],
    },
    {
      region: 'Knee',
      questions: [
        ['knee_side', 'Which knee is affected?', 'single_choice', 510, { options: options([['Right', 'right'], ['Left', 'left'], ['Both', 'both']]) }],
        ['knee_difficult_activities', 'Which activities are difficult because of your knee problem?', 'multiple_choice', 520, { options: options(['Walking', 'Stairs', 'Squatting', 'Running', 'Getting up from a chair', 'Kneeling', 'Exercise']) }],
        ['knee_instability', 'Does the knee feel unstable or give way?', 'single_choice', 530, { options: options([['Never', 'never'], ['Sometimes', 'sometimes'], ['Often', 'often']]) }],
      ],
    },
    {
      region: 'Shoulder',
      questions: [
        ['shoulder_side', 'Which shoulder is affected?', 'single_choice', 610, { options: options([['Right', 'right'], ['Left', 'left'], ['Both', 'both']]) }],
        ['shoulder_difficult_activities', 'Which activities are difficult because of your shoulder problem?', 'multiple_choice', 620, { options: options(['Reaching overhead', 'Dressing', 'Reaching behind your back', 'Lifting', 'Sleeping', 'Sports or exercise']) }],
      ],
    },
  ];

  for (const definition of definitions) {
    const region = await findRegion(definition.region);
    if (!region) {
      console.warn(`Skipping ${definition.region} questions: body region is not configured.`);
      continue;
    }
    for (const [key, text, type, order, extra] of definition.questions) {
      await upsertQuestion(scoped(key, text, type, order, 'body_region', region._id, extra));
    }
  }
}

async function seedSurgeryQuestions() {
  const tkr = await SurgeryType.findOne({ code: 'total_knee_replacement' }).select('_id code').lean();
  if (tkr) {
    await upsertQuestion(scoped('tkr_first_replacement', 'Was this your first knee replacement?', 'yes_no', 710, 'surgery_type', tkr._id, { options: yesNoOptions }));
    await upsertQuestion(scoped('tkr_current_symptoms', 'Which symptoms do you currently have after your knee replacement?', 'multiple_choice', 720, 'surgery_type', tkr._id, {
      options: options(['Pain', 'Swelling', 'Knee stiffness', 'Difficulty walking', 'Difficulty climbing stairs', 'Difficulty sitting or standing', 'Weakness', 'Other']),
    }));
    await upsertQuestion(scoped('tkr_walking_status', 'What is your current walking status?', 'single_choice', 730, 'surgery_type', tkr._id, {
      options: options(['Walking normally', 'Walking with difficulty', 'Walking with walker', 'Walking with crutches', 'Walking with cane', 'Not currently walking']),
    }));
  } else {
    console.warn('Skipping TKR questions: total_knee_replacement surgery type is not configured.');
  }

  const ligamentCodes = ['acl_reconstruction', 'pcl_reconstruction', 'mcl_lcl_surgery'];
  for (const code of ligamentCodes) {
    const surgery = await SurgeryType.findOne({ code }).select('_id code').lean();
    if (!surgery) {
      console.warn(`Skipping ${code} questions: surgery type is not configured.`);
      continue;
    }
    await upsertQuestion(scoped(`${code}_current_symptoms`, 'Which symptoms do you currently have after your knee ligament surgery?', 'multiple_choice', 810, 'surgery_type', surgery._id, {
      options: options(['Pain', 'Swelling', 'Stiffness', 'Weakness', 'Instability', 'Difficulty walking', 'Difficulty using stairs', 'Difficulty exercising']),
    }));
    await upsertQuestion(scoped(`${code}_activity_level`, 'What is your current activity level?', 'single_choice', 820, 'surgery_type', surgery._id, {
      options: options(['Not exercising', 'Light activity', 'Moderate activity', 'Sports training', 'Competitive sport']),
    }));
  }
}

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI or MONGO_URI is required');

  await mongoose.connect(uri);
  await seedCommonQuestions();
  await seedSafetyQuestions();
  await seedRegionQuestions();
  await seedSurgeryQuestions();

  const [total, commonCount, regionCount, surgeryCount, redFlagCount] = await Promise.all([
    AssessmentQuestion.countDocuments({ seedKey: { $exists: true } }),
    AssessmentQuestion.countDocuments({ seedKey: { $exists: true }, scopeType: 'common' }),
    AssessmentQuestion.countDocuments({ seedKey: { $exists: true }, scopeType: 'body_region' }),
    AssessmentQuestion.countDocuments({ seedKey: { $exists: true }, scopeType: 'surgery_type' }),
    AssessmentQuestion.countDocuments({ seedKey: { $exists: true }, isRedFlag: true }),
  ]);

  console.log('Assessment question library seeded successfully.');
  console.log(`Seed-managed questions: ${total}`);
  console.log(`Common: ${commonCount} | Body-region: ${regionCount} | Surgery-specific: ${surgeryCount} | Red flags: ${redFlagCount}`);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
