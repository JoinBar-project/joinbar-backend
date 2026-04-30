export interface EmailPayload {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export const SEND_EMAIL_PORT = 'SEND_EMAIL_PORT';

export interface SendEmailPort {
  sendMail(payload: EmailPayload): Promise<void>;
}
