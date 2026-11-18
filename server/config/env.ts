import 'dotenv/config';

export interface IntegrationReadiness {
  supabaseClient: boolean;
  supabaseAdmin: boolean;
  cloudinary: boolean;
  resend: boolean;
  whatsapp: boolean;
}

export const serverEnv = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  appUrl: process.env.APP_URL ?? 'http://localhost:3000',
  supabaseUrl: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY ?? '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  whatsappBusinessToken: process.env.WHATSAPP_BUSINESS_TOKEN ?? '',
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
};

export function getIntegrationReadiness(): IntegrationReadiness {
  return {
    supabaseClient: Boolean(serverEnv.supabaseUrl && serverEnv.supabaseAnonKey),
    supabaseAdmin: Boolean(serverEnv.supabaseUrl && serverEnv.supabaseServiceRoleKey),
    cloudinary: Boolean(
      serverEnv.cloudinaryCloudName &&
        serverEnv.cloudinaryApiKey &&
        serverEnv.cloudinaryApiSecret,
    ),
    resend: Boolean(serverEnv.resendApiKey),
    whatsapp: Boolean(
      serverEnv.whatsappBusinessToken && serverEnv.whatsappPhoneNumberId,
    ),
  };
}
