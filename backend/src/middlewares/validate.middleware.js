const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';

const requireFields = (...fields) => (req, res, next) => {
  const missing = fields.filter((field) => isBlank(req.body?.[field]));
  if (missing.length) {
    return res.status(400).json({
      message: 'Required fields are missing',
      fields: missing,
    });
  }
  next();
};

const validateEnum = (field, allowedValues = []) => (req, res, next) => {
  const value = req.body?.[field];
  if (value === undefined || value === null) return next();
  if (!allowedValues.includes(value)) {
    return res.status(400).json({
      message: `${field} must be one of: ${allowedValues.join(', ')}`,
    });
  }
  next();
};

const validateNumberRange = (field, { min, max } = {}) => (req, res, next) => {
  const value = req.body?.[field];
  if (value === undefined || value === null || value === '') return next();

  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) {
    return res.status(400).json({ message: `${field} must be a number` });
  }
  if (min !== undefined && numberValue < min) {
    return res.status(400).json({ message: `${field} must be at least ${min}` });
  }
  if (max !== undefined && numberValue > max) {
    return res.status(400).json({ message: `${field} must be at most ${max}` });
  }

  req.body[field] = numberValue;
  next();
};

module.exports = {
  requireFields,
  validateEnum,
  validateNumberRange,
};
