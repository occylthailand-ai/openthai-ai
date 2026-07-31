// @ts-check
import { ApiError } from './error-handler.js';

/**
 * Rule functions — each returns true when the value passes.
 * @type {Record<string, (v: unknown, param?: string) => boolean>}
 */
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

/**
 * Validate `data` against `schema`. Throws `ApiError.badRequest` on failure.
 *
 * Rules are pipe-separated: `'required|email'`, `'required|minlen:8|maxlen:64'`.
 * Optional fields (no `required`) are skipped when absent.
 *
 * @param {Record<string, unknown> | null | undefined} data
 * @param {Record<string, string>} schema  — field → rule string
 * @returns {void}
 */
export function validate(data, schema) {
  const errors = /** @type {string[]} */ ([]);

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

/**
 * @param {string} field
 * @param {string} rule
 * @param {string | undefined} param
 * @returns {string}
 */
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
