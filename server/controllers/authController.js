const Joi = require('joi');
const { login } = require('../services/authService');
const { createUser, ADMIN_ROLE, USER_ROLE, sanitizeUser } = require('../services/userService');

const loginSchema = Joi.object({
  username: Joi.string().min(3).max(64).required(),
  password: Joi.string().min(6).max(128).required()
});

const registerSchema = Joi.object({
  username: Joi.string().min(3).max(64).required(),
  password: Joi.string().min(8).max(128).required(),
  role: Joi.string()
    .valid(ADMIN_ROLE, USER_ROLE)
    .default(USER_ROLE)
});

async function loginHandler(req, res, next) {
  try {
    const { error, value } = loginSchema.validate(req.body, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });
    if (error) {
      return res.status(400).json({
        error: 'Dados inválidos.',
        details: error.details.map((d) => d.message)
      });
    }

    const { username, password } = value;
    const result = await login(username, password);
    return res.json({
      token: result.token,
      user: sanitizeUser(result.user)
    });
  } catch (err) {
    return next(err);
  }
}

async function registerHandler(req, res, next) {
  try {
    const { error, value } = registerSchema.validate(req.body, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });
    if (error) {
      return res.status(400).json({
        error: 'Dados inválidos.',
        details: error.details.map((d) => d.message)
      });
    }

    const user = await createUser(value);
    return res.status(201).json({ user });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  loginHandler,
  registerHandler
};

