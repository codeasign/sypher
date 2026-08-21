export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  success: boolean;
  provider: string;
  error?: string;
}

// Each vendor implementation only needs to know how to make its own API
// call -- no shared logic beyond this interface. Adding a third provider
// means adding one new providers/*.ts file, not touching rotation.ts.
export interface EmailProvider {
  name: string;
  send(params: SendEmailParams): Promise<SendEmailResult>;
}
