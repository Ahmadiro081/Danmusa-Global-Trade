import 'dotenv/config';

export interface IntegrationReadiness {
  supabaseClient: boolean;
  supabaseAdmin: boolean;
  cloudinary: boolean;
  resend: boolean;
  whatsapp: boolean;
}

function isValidHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('MY_')) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function isConfiguredValue(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && !trimmed.startsWith('MY_');
}

export const DEFAULT_RESEND_FROM_EMAIL =
  'Danmusa Global Trade <onboarding@resend.dev>';

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
  resendFromEmail:
    process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_RESEND_FROM_EMAIL,
  whatsappBusinessToken: process.env.WHATSAPP_BUSINESS_TOKEN ?? '',
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
};

export function getIntegrationReadiness(): IntegrationReadiness {
  const validSupabaseUrl = isValidHttpUrl(serverEnv.supabaseUrl);
  return {
    supabaseClient:
      validSupabaseUrl && isConfiguredValue(serverEnv.supabaseAnonKey),
    supabaseAdmin:
      validSupabaseUrl && isConfiguredValue(serverEnv.supabaseServiceRoleKey),
    cloudinary:
      isConfiguredValue(serverEnv.cloudinaryCloudName) &&
      isConfiguredValue(serverEnv.cloudinaryApiKey) &&
      isConfiguredValue(serverEnv.cloudinaryApiSecret),
    resend: isConfiguredValue(serverEnv.resendApiKey),
    whatsapp:
      isConfiguredValue(serverEnv.whatsappBusinessToken) &&
      isConfiguredValue(serverEnv.whatsappPhoneNumberId),
  };
}
