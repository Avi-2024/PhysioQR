const Counter = require('../models/Counter.model');

// Returns the next durable sequence value for the given counter key.
const getNextSequence = async (key, { session } = {}) => {
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, session }
  );
  return counter.sequence;
};

module.exports = { getNextSequence };
