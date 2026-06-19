const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  MONGODB_URI: z.string().url(),
  WEBHOOK_N8N: z.string().url(),
  WEBHOOK_MASIVOS_N8N: z.string().url(),
  N8N_MANDAR_MENSAJE: z.string().url(),
  WABA_ID: z.string(),
  META_TOKEN: z.string(),
  JWT_SECRET: z.string().min(32).default('change_this_super_secret_key_min_32_chars_fallback'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:4200'),
  INTERNAL_API_KEY: z.string().default('change_this_internal_key_min_32_chars_fallback'),
  OUT_OF_OFFICE_MESSAGE: z.string().default('Hola. Gracias por escribirnos. Nuestro horario de atención es de Lunes a Viernes de 9:00 AM a 6:00 PM. Te responderemos en cuanto iniciemos labores.'),
  SMTP_HOST: z.string().optional().default('smtp.gmail.com'),
  SMTP_PORT: z.string().optional().default('587'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FRONTEND_URL: z.string().default('http://localhost:4200'),
  AWS_REGION: z.string().optional().default('us-east-2'),
  AWS_BUCKET_NAME: z.string().optional().default('s3-canaco'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

module.exports = parsed.data;
