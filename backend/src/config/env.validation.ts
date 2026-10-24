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

  BREVO_API_KEY: Joi.string().allow('').optional(),
  MAIL_FROM: Joi.string().allow('').optional(),

  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),

  // Permite apuntar a un doble local en pruebas sin tocar el código.
  META_GRAPH_BASE_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .default('https://graph.facebook.com/v26.0'),

  // WhatsApp: la conexión real se configura desde el panel y se guarda
  // cifrada en `integracion`; estas variables son el fallback de desarrollo.
  WHATSAPP_PROVIDER: Joi.string()
    .valid('evolution', 'cloud')
    .default('evolution'),
  EVOLUTION_API_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .default('http://localhost:8080'),
  EVOLUTION_API_KEY: Joi.string().allow('').optional(),
  EVOLUTION_WEBHOOK_PUBLIC_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .default('http://localhost:5560/api/whatsapp/webhooks/evolution'),
  EVOLUTION_TIMEOUT_MS: Joi.number().integer().positive().default(15000),

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
