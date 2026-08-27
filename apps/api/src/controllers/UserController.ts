import { Body, Controller, Get, Patch, Query, Request, Res, Route, Security, Tags, type TsoaResponse } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { User } from '@prisma/client';
import { USERNAME_PATTERN, UserRepository } from '../repositories/UserRepository';
import { HttpError } from '../lib/errors';

/**
 * User-scoped endpoints for the discussion system: mention autocomplete
 * (§11 — prefix search on the unique handle; visual disambiguation happens
 * in the dropdown via username + fullName, never by fuzzy-matching display
 * names server-side) and the profile-settings handle edit.
 */

const userRepository = new UserRepository();

export interface MentionCandidate {
  id: string;
  username: string;
  fullName: string | null;
}

export interface UserUpdateUsernameRequest {
  username: string;
}

export interface UserMeResponse {
  id: string;
  email: string;
  username: string;
  fullName: string | null;
  role: string;
}

function toMe(user: User): UserMeResponse {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
  };
}

@Route('users')
@Tags('Users')
export class UserController extends Controller {
  // Leading "@" tolerated so the client can pass the raw composer token.
  @Get('mention-search')
  @Security('session')
  public async mentionSearch(@Query() q: string): Promise<MentionCandidate[]> {
    const term = q.trim().replace(/^@+/, '').slice(0, 50);
    if (term.length === 0) return [];
    return userRepository.searchMentionCandidates(term);
  }

  // Profile-settings handle change (spec §11): same format rules as
  // signup generation, uniqueness settled by the DB index with a losing
  // race surfacing as a clean 409.
  @Patch('me')
  @Security('session')
  public async updateMe(
    @Body() body: UserUpdateUsernameRequest,
    @Request() request: ExpressRequest,
    @Res() badRequest: TsoaResponse<400, { message: string }>,
    @Res() conflict: TsoaResponse<409, { message: string }>,
  ): Promise<UserMeResponse | void> {
    const user = request.user as User;
    const username = body.username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(username)) {
      return badRequest(400, { message: 'Usernames use 3-20 lowercase letters, numbers or underscores' });
    }

    const existing = await userRepository.findByUsername(username);
    if (existing && existing.id !== user.id) {
      return conflict(409, { message: 'That username is already taken' });
    }

    try {
      await userRepository.setUsername(user.id, username);
    } catch (error) {
      // Race lost against another claimant between check and set.
      if (error instanceof HttpError && error.status === 409) {
        return conflict(409, { message: error.message });
      }
      throw error;
    }

    const fresh = await userRepository.findById(user.id);
    return fresh ? toMe(fresh) : undefined;
  }
}
