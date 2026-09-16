import { body } from 'express-validator';

export const INSTALLATION_STATUSES = [
  'pending',
  'in_progress',
  'completed',
  'cancelled',
];

export const createInstallationRules = [
  body('site_id')
    .isInt({ min: 1 })
    .withMessage('site_id must be a positive integer'),
  body('equipment_type')
    .trim()
    .notEmpty()
    .withMessage('equipment_type is required')
    .isLength({ max: 100 })
    .withMessage('equipment_type must be at most 100 characters'),
  body('status')
    .optional()
    .trim()
    .customSanitizer((value) =>
      typeof value === 'string'
        ? value.toLowerCase().replace(/\s+/g, '_')
        : value
    )
    .isIn(INSTALLATION_STATUSES)
    .withMessage(`status must be one of: ${INSTALLATION_STATUSES.join(', ')}`),
  body('notes')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('notes must be at most 2000 characters'),
];

export const updateInstallationRules = [
  body('site_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('site_id must be a positive integer'),
  body('equipment_type')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('equipment_type cannot be empty')
    .isLength({ max: 100 })
    .withMessage('equipment_type must be at most 100 characters'),
  body('status')
    .optional()
    .trim()
    .customSanitizer((value) =>
      typeof value === 'string'
        ? value.toLowerCase().replace(/\s+/g, '_')
        : value
    )
    .isIn(INSTALLATION_STATUSES)
    .withMessage(`status must be one of: ${INSTALLATION_STATUSES.join(', ')}`),
  body('notes')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('notes must be at most 2000 characters'),
  body().custom((_, { req }) => {
    const updatableFields = ['site_id', 'equipment_type', 'status', 'notes'];
    if (updatableFields.every((field) => req.body[field] === undefined)) {
      throw new Error(
        'At least one of site_id, equipment_type, status, or notes is required'
      );
    }
    return true;
  }),
];
