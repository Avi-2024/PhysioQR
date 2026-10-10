// Physiotherapist-review draft, NOT a prescription or an approved protocol.
// For non-operative, non-acute general knee discomfort only. The 30-day
// calendar is an editorial progression proposal; each individual needs clinical
// screening and symptom-guided adjustments before any patient publication.
//
// Source concepts: AAOS Knee Conditioning Program and NHS Inform knee exercises.
// No videos, outcome guarantees or surgical protocols are supplied by this file.
const PROGRAM_CODE = 'DRAFT-KNEE-GENERAL-30D';
const EXERCISE_PREFIX = 'physioqr_knee_general_30d_';

const commonSafety = 'Stop if pain worsens or new pain, swelling, locking, giving-way or dizziness occurs. Use comfortable range only. Consult a physiotherapist before progressing.';

const exercises = [
  { key:'quad_set', name:'Quadriceps Isometric Set', description:'Lie or sit with your leg supported and gently tighten the front thigh as if straightening the knee. Hold, then relax; do not force the knee down.', sets:1, repetitions:8, holdDuration:'3 seconds', restDuration:'30 seconds', equipment:[], safety:'Avoid forcing painful knee extension.' },
  { key:'heel_slide', name:'Supported Heel Slide', description:'Lie on your back with your heel supported. Slowly slide the heel toward your body to bend the knee comfortably, then straighten.', sets:1, repetitions:8, holdDuration:'1 second', restDuration:'30 seconds', equipment:['Mat or bed'], safety:'Do not pull the knee into a painful bend.' },
  { key:'seated_extension', name:'Seated Knee Extension', description:'Sit upright on a stable chair. Slowly straighten one knee within a comfortable range, pause and lower in control.', sets:1, repetitions:8, holdDuration:'2 seconds', restDuration:'45 seconds', equipment:['Stable chair'], safety:'Avoid kicking, swinging or forcing terminal extension.' },
  { key:'straight_leg_raise', name:'Straight-Leg Raise', description:'Lie on your back, bend the other knee, tighten the front thigh of the working leg, lift the straight leg a short distance and lower slowly.', sets:1, repetitions:6, holdDuration:'2 seconds', restDuration:'60 seconds', equipment:['Mat or firm bed'], safety:'Use only if you can hold the working knee straight without lag or sharp pain.' },
  { key:'heel_raise', name:'Supported Double-Leg Heel Raise', description:'Stand holding a stable counter or chair, rise onto both toes slowly, then lower both heels with control.', sets:1, repetitions:8, holdDuration:'1 second', restDuration:'45 seconds', equipment:['Stable counter'], safety:'Stay supported and avoid sudden loss of balance.' },
  { key:'hamstring_curl', name:'Supported Standing Hamstring Curl', description:'Hold a stable support, bend one knee so the heel rises gently backward, then lower slowly without leaning.', sets:1, repetitions:8, holdDuration:'1 second', restDuration:'45 seconds', equipment:['Stable counter'], safety:'Use comfortable knee bend and avoid twisting the hip.' },
  { key:'hip_abduction', name:'Side-Lying Hip Abduction', description:'Lie on the side with the working leg on top and straight. Slowly lift it a short distance without rolling the pelvis, then lower.', sets:1, repetitions:8, holdDuration:'2 seconds', restDuration:'60 seconds', equipment:['Mat or firm bed'], safety:'Reduce range if hip or knee pain increases.' },
  { key:'sit_to_stand', name:'Supported Sit-to-Stand', description:'From a firm chair, position feet comfortably, lean forward slightly, stand using hands if necessary, then sit down slowly.', sets:1, repetitions:6, holdDuration:'1 second', restDuration:'60 seconds', equipment:['Firm chair','Nearby stable support'], safety:'Avoid low seats and movements that cause knee collapse or sharp pain.' },
  { key:'mini_squat', name:'Supported Mini Squat', description:'Hold a secure support. Bend at hips and knees just a little, keep kneecaps facing forward, then straighten slowly.', sets:1, repetitions:6, holdDuration:'1 second', restDuration:'60 seconds', equipment:['Secure counter'], safety:'Shallow pain-free range only. Do not attempt deep squats.' },
  { key:'step_up', name:'Low Supported Step-Up', description:'Hold a handrail, step onto a low stable step, straighten gently, then step back down slowly.', sets:1, repetitions:6, holdDuration:'1 second', restDuration:'60 seconds', equipment:['Low stable step','Handrail'], safety:'Not for unstable knees, recent falls or difficulty weight-bearing; clinician must approve.' },
  { key:'weight_shift', name:'Supported Side-to-Side Weight Shift', description:'Stand at a counter with both feet on the floor. Gently move weight from one leg toward the other without twisting.', sets:1, repetitions:8, holdDuration:'2 seconds', restDuration:'45 seconds', equipment:['Stable counter'], safety:'Keep both feet supported and stop if the knee buckles.' },
  { key:'tandem_stance', name:'Supported Staggered Balance Stand', description:'Near a counter, place one foot slightly ahead of the other and hold a comfortable, supported standing position.', sets:2, repetitions:1, holdDuration:'10 seconds', restDuration:'30 seconds', equipment:['Stable counter'], safety:'Hands remain close to the counter. Avoid unsupported balance practice.' },
  { key:'bridge', name:'Gentle Glute Bridge', description:'Lie on your back with knees comfortably bent. Tighten your buttocks and raise your hips a small distance; lower slowly.', sets:1, repetitions:8, holdDuration:'2 seconds', restDuration:'60 seconds', equipment:['Mat or firm bed'], safety:'Keep knees comfortable and avoid arching the lower back.' },
  { key:'calf_stretch', name:'Supported Standing Calf Stretch', description:'Face a wall or counter, place one foot behind, keep the heel on the floor and lean forward gently until the calf stretches.', sets:2, repetitions:1, holdDuration:'20 seconds', restDuration:'30 seconds', equipment:['Wall or counter'], safety:'No bouncing or stretching through pain.' },
  { key:'hamstring_stretch', name:'Gentle Seated Hamstring Stretch', description:'Sit near the front of a sturdy chair. Extend one leg with heel down and hinge gently at the hips until a mild back-of-thigh stretch.', sets:2, repetitions:1, holdDuration:'20 seconds', restDuration:'30 seconds', equipment:['Stable chair'], safety:'Do not bounce, lock forcefully or push into knee pain.' },
];

const dose = (key, sets, repetitions, holdDuration) => ({ key, sets, repetitions, holdDuration });
const D = dose;

const days = [
  { dayNumber:1, title:'Baseline comfort and gentle movement', focus:'Establish symptom baseline; short, comfortable movements only.', items:[D('quad_set',1,6,'3 seconds'),D('heel_slide',1,6,'1 second'),D('calf_stretch',1,1,'15 seconds')] },
  { dayNumber:2, title:'Restore comfortable knee motion', focus:'Move slowly and compare symptoms with the previous day.', items:[D('heel_slide',1,8,'1 second'),D('quad_set',1,8,'3 seconds'),D('seated_extension',1,6,'2 seconds')] },
  { dayNumber:3, title:'Early thigh engagement', focus:'Introduce gentle control without forcing range.', items:[D('quad_set',1,8,'3 seconds'),D('heel_slide',1,8,'1 second'),D('seated_extension',1,8,'2 seconds'),D('calf_stretch',1,1,'20 seconds')] },
  { dayNumber:4, title:'Introduce supported weight bearing', focus:'Only if walking and standing are comfortable; hold support.', items:[D('quad_set',1,10,'3 seconds'),D('heel_slide',1,8,'1 second'),D('weight_shift',1,6,'2 seconds'),D('heel_raise',1,6,'1 second')] },
  { dayNumber:5, title:'Recovery and symptom review', focus:'Low-load recovery day. Do not advance if swollen or sore.', items:[D('heel_slide',1,8,'1 second'),D('quad_set',1,8,'3 seconds'),D('hamstring_stretch',1,1,'20 seconds')] },
  { dayNumber:6, title:'Controlled knee and calf strength', focus:'Work at a comfortable pace; take full rest between sets.', items:[D('quad_set',2,8,'3 seconds'),D('seated_extension',1,8,'2 seconds'),D('heel_raise',1,8,'1 second'),D('calf_stretch',1,1,'20 seconds')] },
  { dayNumber:7, title:'Hip support and knee control', focus:'Strengthen the surrounding hip muscles gently.', items:[D('heel_slide',1,10,'1 second'),D('straight_leg_raise',1,6,'2 seconds'),D('hip_abduction',1,6,'2 seconds'),D('hamstring_stretch',1,1,'20 seconds')] },
  { dayNumber:8, title:'Comfortable daily movement', focus:'Add functional practice only if standing feels stable.', items:[D('quad_set',2,8,'3 seconds'),D('seated_extension',2,8,'2 seconds'),D('sit_to_stand',1,5,'1 second'),D('heel_raise',1,8,'1 second')] },
  { dayNumber:9, title:'Gentle posterior-chain engagement', focus:'Use controlled movement, no knee twisting.', items:[D('heel_slide',1,10,'1 second'),D('hamstring_curl',1,8,'1 second'),D('bridge',1,6,'2 seconds'),D('calf_stretch',1,1,'20 seconds')] },
  { dayNumber:10, title:'Recovery and tolerance checkpoint', focus:'Low-load recovery day; physiotherapist should review tolerance.', items:[D('quad_set',1,8,'3 seconds'),D('heel_slide',1,8,'1 second'),D('hamstring_stretch',1,1,'20 seconds')] },
  { dayNumber:11, title:'Build basic thigh strength', focus:'Progress only if previous sessions caused no flare.', items:[D('seated_extension',2,8,'2 seconds'),D('straight_leg_raise',2,6,'2 seconds'),D('heel_raise',2,8,'1 second'),D('calf_stretch',1,1,'20 seconds')] },
  { dayNumber:12, title:'Practice chair transfers', focus:'Use a higher seat or hands if needed; avoid painful depth.', items:[D('quad_set',1,10,'3 seconds'),D('sit_to_stand',2,6,'1 second'),D('hip_abduction',2,8,'2 seconds'),D('heel_slide',1,8,'1 second')] },
  { dayNumber:13, title:'Supported standing strength', focus:'Maintain balance support throughout.', items:[D('heel_raise',2,10,'1 second'),D('hamstring_curl',2,8,'1 second'),D('weight_shift',2,8,'2 seconds'),D('seated_extension',1,10,'2 seconds')] },
  { dayNumber:14, title:'Gentle mini-squat introduction', focus:'Only if clinician agrees and supported chair transfers are comfortable.', items:[D('mini_squat',1,5,'1 second'),D('bridge',2,8,'2 seconds'),D('quad_set',1,10,'3 seconds'),D('calf_stretch',1,1,'20 seconds')] },
  { dayNumber:15, title:'Recovery and mid-plan check', focus:'Review pain, swelling, range, walking and confidence before next block.', items:[D('heel_slide',1,10,'1 second'),D('quad_set',1,10,'3 seconds'),D('hamstring_stretch',1,1,'20 seconds')] },
  { dayNumber:16, title:'Increase controlled repetitions', focus:'Continue with slow tempo and a stable surface.', items:[D('seated_extension',2,10,'2 seconds'),D('sit_to_stand',2,6,'1 second'),D('heel_raise',2,10,'1 second'),D('hip_abduction',1,10,'2 seconds')] },
  { dayNumber:17, title:'Hip and hamstring coordination', focus:'Build gentle posterior and lateral strength.', items:[D('bridge',2,10,'2 seconds'),D('hamstring_curl',2,10,'1 second'),D('hip_abduction',2,8,'2 seconds'),D('heel_slide',1,10,'1 second')] },
  { dayNumber:18, title:'Stable standing and balance', focus:'Keep hands close to support; no eyes-closed balance.', items:[D('weight_shift',2,10,'2 seconds'),D('tandem_stance',2,1,'10 seconds'),D('heel_raise',2,10,'1 second'),D('calf_stretch',1,1,'20 seconds')] },
  { dayNumber:19, title:'Controlled supported squat pattern', focus:'Shallow bend only; reduce load if symptoms rise.', items:[D('mini_squat',2,6,'1 second'),D('sit_to_stand',2,8,'1 second'),D('straight_leg_raise',2,8,'2 seconds'),D('hamstring_stretch',1,1,'20 seconds')] },
  { dayNumber:20, title:'Recovery and functional review', focus:'Low-load day. Do not automatically advance for persistent swelling.', items:[D('heel_slide',1,10,'1 second'),D('quad_set',1,10,'3 seconds'),D('calf_stretch',1,1,'20 seconds')] },
  { dayNumber:21, title:'Stair preparation (conditional)', focus:'Low step-up requires explicit clinician approval and stable weight bearing.', items:[D('step_up',1,5,'1 second'),D('sit_to_stand',2,8,'1 second'),D('hip_abduction',2,10,'2 seconds'),D('heel_raise',2,10,'1 second')] },
  { dayNumber:22, title:'Build confidence with daily tasks', focus:'Stay within symptom limits; use chair and counter.', items:[D('sit_to_stand',2,10,'1 second'),D('mini_squat',2,6,'1 second'),D('tandem_stance',2,1,'15 seconds'),D('heel_slide',1,10,'1 second')] },
  { dayNumber:23, title:'Thigh and hip strength review', focus:'Control technique and avoid fatigue-related compensation.', items:[D('seated_extension',2,12,'2 seconds'),D('straight_leg_raise',2,8,'2 seconds'),D('bridge',2,10,'2 seconds'),D('calf_stretch',1,1,'20 seconds')] },
  { dayNumber:24, title:'Supported step and standing pattern', focus:'Skip step-ups until a clinician confirms safety.', items:[D('step_up',1,6,'1 second'),D('heel_raise',2,12,'1 second'),D('hamstring_curl',2,10,'1 second'),D('weight_shift',2,10,'2 seconds')] },
  { dayNumber:25, title:'Recovery and progress check', focus:'Check for next-day soreness, swelling and safe daily function.', items:[D('quad_set',1,10,'3 seconds'),D('heel_slide',1,10,'1 second'),D('hamstring_stretch',1,1,'20 seconds')] },
  { dayNumber:26, title:'Consolidate controlled strength', focus:'Prioritise form over higher repetitions.', items:[D('sit_to_stand',2,10,'1 second'),D('mini_squat',2,8,'1 second'),D('hip_abduction',2,10,'2 seconds'),D('seated_extension',2,10,'2 seconds')] },
  { dayNumber:27, title:'Control during standing activities', focus:'Use hand support and symptom-guided load.', items:[D('step_up',2,6,'1 second'),D('heel_raise',2,12,'1 second'),D('weight_shift',2,10,'2 seconds'),D('tandem_stance',2,1,'15 seconds')] },
  { dayNumber:28, title:'Strength and range consolidation', focus:'Do not force range or move into a painful squat.', items:[D('straight_leg_raise',2,10,'2 seconds'),D('bridge',2,10,'2 seconds'),D('hamstring_curl',2,12,'1 second'),D('heel_slide',1,12,'1 second')] },
  { dayNumber:29, title:'Functional confidence rehearsal', focus:'Proceed only when clinician-approved movement is well tolerated.', items:[D('sit_to_stand',2,10,'1 second'),D('mini_squat',2,8,'1 second'),D('step_up',2,6,'1 second'),D('calf_stretch',1,1,'20 seconds')] },
  { dayNumber:30, title:'Reassessment and next-step planning', focus:'Low-load day; clinician reviews symptoms and decides the next plan.', items:[D('heel_slide',1,10,'1 second'),D('quad_set',1,10,'3 seconds'),D('hamstring_stretch',1,1,'20 seconds')] },
];

const validateDraft = () => {
  const errors = [];
  const exerciseKeys = new Set(exercises.map((exercise) => exercise.key));
  if (exerciseKeys.size !== exercises.length) errors.push('Duplicate exercise keys');
  if (days.length !== 30) errors.push('Exactly 30 days required');
  days.forEach((day,index) => {
    if (day.dayNumber !== index + 1) errors.push(`Incorrect day number at index ${index}`);
    if (!day.title || !day.focus || day.items.length < 2) errors.push(`Incomplete day ${day.dayNumber}`);
    const unique = new Set();
    day.items.forEach((item) => {
      if (!exerciseKeys.has(item.key)) errors.push(`Unknown exercise on day ${day.dayNumber}: ${item.key}`);
      if (unique.has(item.key)) errors.push(`Duplicate exercise on day ${day.dayNumber}: ${item.key}`);
      unique.add(item.key);
      if (![item.sets,item.repetitions].every((value)=>Number.isInteger(value)&&value>=1)) errors.push(`Invalid dosage day ${day.dayNumber}`);
      if (!item.holdDuration) errors.push(`Missing hold duration day ${day.dayNumber}`);
    });
  });
  return errors;
};

module.exports = { PROGRAM_CODE, EXERCISE_PREFIX, commonSafety, exercises, days, validateDraft };
