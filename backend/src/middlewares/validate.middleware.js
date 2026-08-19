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

const objectIdPattern = /^[a-f\d]{24}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mobilePattern = /^\+?\d{10,15}$/;
const youtubePattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}(&.*)?$/;

const validators = {
  string: (value, rule) => {
    if (typeof value !== 'string') return 'must be a string';
    const trimmed = value.trim();
    if (rule.min && trimmed.length < rule.min) return `must be at least ${rule.min} characters`;
    if (rule.max && trimmed.length > rule.max) return `must be at most ${rule.max} characters`;
    return null;
  },
  number: (value, rule) => {
    const numberValue = Number(value);
    if (Number.isNaN(numberValue)) return 'must be a number';
    if (rule.min !== undefined && numberValue < rule.min) return `must be at least ${rule.min}`;
    if (rule.max !== undefined && numberValue > rule.max) return `must be at most ${rule.max}`;
    return null;
  },
  boolean: (value) => (typeof value === 'boolean' ? null : 'must be a boolean'),
  objectId: (value) => (objectIdPattern.test(String(value)) ? null : 'must be a valid id'),
  email: (value) => (emailPattern.test(String(value).trim()) ? null : 'must be a valid email'),
  mobile: (value) => (mobilePattern.test(String(value).trim()) ? null : 'must be a valid mobile number'),
  enum: (value, rule) => (rule.values.includes(value) ? null : `must be one of: ${rule.values.join(', ')}`),
  array: (value, rule) => {
    if (!Array.isArray(value)) return 'must be an array';
    if (rule.min !== undefined && value.length < rule.min) return `must contain at least ${rule.min} item(s)`;
    if (rule.max !== undefined && value.length > rule.max) return `must contain at most ${rule.max} item(s)`;
    return null;
  },
  youtubeUrl: (value) => (youtubePattern.test(String(value).trim()) ? null : 'must be a valid YouTube video URL'),
};

// Validates request body, params, and query using lightweight schema rules.
const validateSchema = ({ body = {}, params = {}, query = {} } = {}) => (req, res, next) => {
  const errors = [];

  const validateShape = (sourceName, source, schema) => {
    Object.entries(schema).forEach(([field, rule]) => {
      const value = source?.[field];
      if (rule.required && isBlank(value)) {
        errors.push({ source: sourceName, field, message: 'is required' });
        return;
      }
      if (isBlank(value)) {
        if (source && value === '') delete source[field];
        return;
      }

      const validator = validators[rule.type];
      if (!validator) return;
      const message = validator(value, rule);
      if (message) errors.push({ source: sourceName, field, message });
      else if (rule.type === 'number') source[field] = Number(value);
      else if (rule.type === 'string' || rule.type === 'email' || rule.type === 'mobile' || rule.type === 'youtubeUrl') {
        source[field] = String(value).trim();
      }
    });
  };

  validateShape('body', req.body, body);
  validateShape('params', req.params, params);
  validateShape('query', req.query, query);

  if (errors.length) return res.status(400).json({ message: 'Validation failed', errors });
  next();
};

module.exports = {
  requireFields,
  validateEnum,
  validateNumberRange,
  validateSchema,
};
