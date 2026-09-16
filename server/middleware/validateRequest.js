import { param, validationResult } from 'express-validator';

export function validateRequest(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json({
      error: {
        message: 'Validation failed',
        status: 400,
        errors: result.array(),
      },
    });
  }
  next();
}

export const idParam = [
  param('id').isInt({ min: 1 }).withMessage('id must be a positive integer'),
];
