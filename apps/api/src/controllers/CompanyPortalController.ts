import { Body, Controller, Post, Request, Res, Route, Tags, type TsoaResponse } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import { CompanyRepository } from '../repositories/CompanyRepository';
import { consumeCompanyResolveAllowance } from '../lib/rateLimit';

/**
 * Public (no session) endpoints for the corporate portal on
 * corporate.sypher.local — step 1 of the flow: the visitor types their
 * company's code, we confirm Sypher recognises it, and hand back just
 * enough to brand the login screen that follows. The actual credential +
 * company-membership check happens later at POST /auth/login/company.
 *
 * Business codes are not secrets (they look like "ACMECORP"), so a
 * not-found is a plain 404; the only abuse concern is bulk enumeration,
 * which the per-IP rate limit blunts.
 */

const companyRepository = new CompanyRepository();

@Route('companies')
@Tags('CompanyPortal')
export class CompanyPortalController extends Controller {
  @Post('resolve')
  public async resolve(
    @Body() body: CompanyResolveRequest,
    @Request() request: ExpressRequest,
    @Res() badRequest: TsoaResponse<400, CompanyPortalMessageResponse>,
    @Res() notFound: TsoaResponse<404, CompanyPortalMessageResponse>,
    @Res() tooManyRequests: TsoaResponse<429, CompanyPortalMessageResponse, { 'Retry-After': string }>,
  ): Promise<CompanyPortalView | void> {
    // Behind Caddy every socket is localhost, so prefer the forwarded
    // client IP; the key only needs to be stable per caller, not perfect.
    const forwarded = (request.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
    const clientKey = forwarded || request.ip || request.socket.remoteAddress || 'unknown';
    const retryAfter = consumeCompanyResolveAllowance(clientKey);
    if (retryAfter > 0) {
      return tooManyRequests(
        429,
        { message: 'Too many attempts. Please wait a minute and try again.' },
        { 'Retry-After': String(retryAfter) },
      );
    }

    const code = (body.code ?? '').trim().toUpperCase();
    if (!code) return badRequest(400, { message: 'Enter your company code.' });

    const company = await companyRepository.findPublicByCode(code);
    if (!company) return notFound(404, { message: "We don't recognise that company code." });

    return {
      id: company.id,
      name: company.name,
      logoUrl: company.logoUrl,
      // Resolve even when lapsed so the portal can show a specific
      // "access has expired" message instead of a generic not-found — the
      // login step re-checks this authoritatively either way.
      active: company.accessUntil.getTime() > Date.now(),
      accessUntil: company.accessUntil.toISOString(),
    };
  }
}

export interface CompanyResolveRequest {
  /** Human business code, e.g. "ACMECORP" — case-insensitive, trimmed server-side. */
  code: string;
}

export interface CompanyPortalView {
  /** Company cuid — passed back at login as the membership-check anchor. */
  id: string;
  name: string;
  logoUrl: string | null;
  /** accessUntil is still in the future. */
  active: boolean;
  accessUntil: string;
}

export interface CompanyPortalMessageResponse {
  message: string;
}
