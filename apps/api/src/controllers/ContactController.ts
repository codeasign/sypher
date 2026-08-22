import { Body, Controller, Post, Res, Route, Tags, type TsoaResponse } from 'tsoa';
import { ContactSubmissionRepository } from '../repositories/ContactSubmissionRepository';
import { sendContactNotification } from '../lib/email';

const contactSubmissionRepository = new ContactSubmissionRepository();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ContactRequest {
  name: string;
  email: string;
  message: string;
  /** Honeypot — real users never fill this in; bots that do get a fake success. */
  botcheck?: string;
}

interface ContactMessageResponse {
  message: string;
}

@Route('contact')
@Tags('Contact')
export class ContactController extends Controller {
  @Post()
  public async submit(
    @Body() body: ContactRequest,
    @Res() badRequest: TsoaResponse<400, ContactMessageResponse>,
  ): Promise<ContactMessageResponse> {
    if (body.botcheck) {
      return { message: 'Thanks for reaching out — we will get back to you soon.' };
    }

    const name = body.name.trim();
    const email = body.email.trim().toLowerCase();
    const message = body.message.trim();

    if (!name) return badRequest(400, { message: 'Name is required' });
    if (!EMAIL_RE.test(email)) return badRequest(400, { message: 'Invalid email address' });
    if (!message) return badRequest(400, { message: 'Message is required' });

    await contactSubmissionRepository.create({ name, email, message });
    await sendContactNotification(name, email, message);

    return { message: 'Thanks for reaching out — we will get back to you soon.' };
  }
}
