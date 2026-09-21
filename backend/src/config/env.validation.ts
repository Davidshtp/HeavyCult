import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  SERVER_PORT: Joi.number().port().default(5560),
  API_GLOBAL_PREFIX: Joi.string().default('api'),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(5432),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),
  DB_SYNCHRONIZE: Joi.boolean().default(false),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_RECOVERY_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN_SECONDS: Joi.number().integer().positive().default(3600),
  JWT_RECOVERY_EXPIRES_IN_SECONDS: Joi.number()
    .integer()
    .positive()
    .default(300),

  COOKIE_SECURE: Joi.boolean().default(false),
  COOKIE_MAX_AGE_SECONDS: Joi.number().integer().positive().default(3600),

  FRONTEND_URL: Joi.string().uri().required(),

  BCRYPT_SALT_ROUNDS: Joi.number().integer().min(10).max(14).default(10),
  MAX_LOGIN_ATTEMPTS: Joi.number().integer().positive().default(5),
  LOGIN_BLOCK_MINUTES: Joi.number().integer().positive().default(15),

  TOKEN_EXPIRES_MINUTES: Joi.number().integer().positive().default(10),
  TOKEN_MAX_ATTEMPTS: Joi.number().integer().positive().default(5),

  MAIL_HOST: Joi.string().allow('').optional(),
  MAIL_PORT: Joi.number().port().optional(),
  MAIL_USER: Joi.string().email().allow('').optional(),
  MAIL_PASSWORD: Joi.string().allow('').optional(),
  MAIL_FROM: Joi.string().allow('').optional(),

  ADMIN_NOMBRE: Joi.string().required(),
  ADMIN_APELLIDO: Joi.string().allow('').optional(),
  ADMIN_EMAIL: Joi.string().email().required(),
  ADMIN_PASSWORD: Joi.string().min(8).required(),
  ADMIN_TELEFONO: Joi.string().allow('').optional(),
})
  .unknown(true)
  .messages({
    'any.required': 'La variable de entorno {{#label}} es obligatoria.',
    'string.email':
      'La variable de entorno {{#label}} debe ser un correo válido.',
    'string.min':
      'La variable de entorno {{#label}} debe tener al menos {{#limit}} caracteres.',
    'any.only':
      'La variable de entorno {{#label}} debe ser uno de: {{#valids}}.',
  });
