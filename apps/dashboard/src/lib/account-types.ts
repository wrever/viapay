export type AccountProfile = {
  id: string;
  name: string;
  email: string;
  business_name: string | null;
  phone_e164: string | null;
  notify_email_paid: boolean;
  notify_wa_paid: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  merchant_wallet: string | null;
};
