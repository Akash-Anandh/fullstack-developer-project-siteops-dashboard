import { body } from 'express-validator';

export const SITE_STATUSES = ['active', 'inactive', 'maintenance'];

export const createSiteRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('name is required')
    .isLength({ max: 150 })
    .withMessage('name must be at most 150 characters'),
  body('location')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 200 })
    .withMessage('location must be at most 200 characters'),
  body('status')
    .optional()
    .trim()
    .toLowerCase()
    .isIn(SITE_STATUSES)
    .withMessage(`status must be one of: ${SITE_STATUSES.join(', ')}`),
];

export const updateSiteRules = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('name cannot be empty')
    .isLength({ max: 150 })
    .withMessage('name must be at most 150 characters'),
  body('location')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 200 })
    .withMessage('location must be at most 200 characters'),
  body('status')
    .optional()
    .trim()
    .toLowerCase()
    .isIn(SITE_STATUSES)
    .withMessage(`status must be one of: ${SITE_STATUSES.join(', ')}`),
  body().custom((_, { req }) => {
    if (
      req.body.name === undefined &&
      req.body.location === undefined &&
      req.body.status === undefined
    ) {
      throw new Error('At least one of name, location, or status is required');
    }
    return true;
  }),
];
