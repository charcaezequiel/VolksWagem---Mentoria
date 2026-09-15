const { body } = require('express-validator');

const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 128,
  regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
};

const register = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 150 }).withMessage('Name must be between 2 and 150 characters'),
  body('email')
    .trim()
    .isEmail().withMessage('Must be a valid email address')
    .toLowerCase(),
  body('password')
    .isLength({ min: PASSWORD_POLICY.minLength }).withMessage(`Password must be at least ${PASSWORD_POLICY.minLength} characters`)
    .bail()
    .isLength({ max: PASSWORD_POLICY.maxLength }).withMessage(`Password must be at most ${PASSWORD_POLICY.maxLength} characters`)
    .bail()
    .matches(PASSWORD_POLICY.regex).withMessage('Password must include an uppercase letter, a lowercase letter, a number and a symbol'),
  body('confirmPassword')
    .notEmpty().withMessage('Confirm password is required')
    .custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match'),
];

const login = [
  body('email')
    .trim()
    .isEmail().withMessage('Must be a valid email address')
    .toLowerCase(),
  body('password').notEmpty().withMessage('Password is required'),
];

module.exports = { register, login, PASSWORD_POLICY };