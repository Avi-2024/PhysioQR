// Builds a patient-facing exercise object with the CURRENT DAY's dosage.
// Base Exercise instructions/videos remain in the reusable library; a 30-day
// progression can specify different sets, reps and holds on each day.
const toPlain = (value) => value?.toObject ? value.toObject() : value;

const withDayDosage = (entry) => {
  const exercise = toPlain(entry?.exercise);
  if (!exercise || typeof exercise !== 'object') return entry;
  return {
    ...toPlain(entry),
    exercise: {
      ...exercise,
      sets: entry.sets ?? exercise.sets,
      repetitions: entry.repetitions ?? exercise.repetitions,
      holdDuration: entry.holdDuration || exercise.holdDuration,
      restDuration: entry.restDuration || exercise.restDuration,
    },
  };
};

const withDayDosageInProgramme = (day) => {
  const plain = toPlain(day);
  if (!plain) return plain;
  return { ...plain, exercises: (plain.exercises || []).map(withDayDosage) };
};

module.exports = { withDayDosage, withDayDosageInProgramme };
