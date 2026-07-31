import { ApiError } from './error-handler.js';

// Lightweight field validator — avoids pulling in a full schema library.
// Usage: validate(req.body, { email: 'required|email', name: 'required', age: 'number' })
// Throws ApiError.badRequest with a clear message if validation fails.

const RULES = {
  required: (v) => v !== undefined && v !== null && v !== '',
  email:    (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)),
  number:   (v) => !isNaN(Number(v)),
  string:   (v) => typeof v === 'string',
  boolean:  (v) => typeof v === 'boolean',
  uuid:     (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v)),
  minlen:   (v, n) => String(v).length >= Number(n),
  maxlen:   (v, n) => String(v).length <= Number(n),
};

export function validate(data, schema) {
  const errors = [];

  for (const [field, ruleStr] of Object.entries(schema)) {
    const rules = ruleStr.split('|');
    const value = data?.[field];
    const isRequired = rules.includes('required');

    if (!isRequired && (value === undefined || value === null || value === '')) continue;

    for (const rule of rules) {
      const [name, param] = rule.split(':');
      const fn = RULES[name];
      if (!fn) continue;
      if (!fn(value, param)) {
        errors.push(humanMessage(field, name, param));
        break; // one error per field
      }
    }
  }

  if (errors.length > 0) {
    throw ApiError.badRequest(errors.join('; '));
  }
}

function humanMessage(field, rule, param) {
  switch (rule) {
    case 'required': return `${field} is required`;
    case 'email':    return `${field} must be a valid email`;
    case 'number':   return `${field} must be a number`;
    case 'string':   return `${field} must be a string`;
    case 'boolean':  return `${field} must be a boolean`;
    case 'uuid':     return `${field} must be a valid UUID`;
    case 'minlen':   return `${field} must be at least ${param} characters`;
    case 'maxlen':   return `${field} must be at most ${param} characters`;
    default:         return `${field} failed ${rule} validation`;
  }
}
