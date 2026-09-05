import { Body, Controller, Get, Patch, Query, Request, Res, Route, Security, Tags, type TsoaResponse } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { User } from '@prisma/client';
import { USERNAME_PATTERN, UserRepository } from '../repositories/UserRepository';
import {
  UserActivityRepository,
  type ActivityCommentKind,
  type ActivityCommentPage,
  type ActivityCounts,
  type ActivityScope,
} from '../repositories/UserActivityRepository';
import { DashboardRepository, type DashboardData } from '../repositories/DashboardRepository';
import { isAllowedAvatarUrl } from '../lib/avatar';
import { HttpError } from '../lib/errors';

/**
 * User-scoped endpoints for the discussion system: mention autocomplete
 * (§11 — prefix search on the unique handle; visual disambiguation happens
 * in the dropdown via username + fullName, never by fuzzy-matching display
 * names server-side), the profile-settings handle + avatar edit, and the
 * profile page's activity summary.
 */

const userRepository = new UserRepository();
const userActivityRepository = new UserActivityRepository();
const dashboardRepository = new DashboardRepository();

export interface MentionCandidate {
  id: string;
  username: string;
  fullName: string | null;
}

export interface UserUpdateProfileRequest {
  /** New handle — 3-20 lowercase letters, numbers or underscores. Omit to leave unchanged. */
  username?: string;
  /** Preset avatar path (/avatars/*.svg) or an uploaded Bunny URL. Omit to leave unchanged. */
  avatarUrl?: string;
  /** About/bio text, up to 500 chars. Empty string clears it. Omit to leave unchanged. */
  bio?: string;
}

export interface UserMeResponse {
  id: string;
  email: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
}

const BIO_MAX = 500;

export type UserActivityCountsResponse = ActivityCounts;
export type UserActivityCommentPageResponse = ActivityCommentPage;
export type UserDashboardResponse = DashboardData;

function toMe(user: User): UserMeResponse {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
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

  // Profile page's headline counts (posts / replies / up / down / helpful).
  // Cheap — five COUNT(*)s. The tab lists are a separate, paginated call.
  @Get('me/activity')
  @Security('session')
  public async myActivity(@Request() request: ExpressRequest): Promise<UserActivityCountsResponse> {
    const user = request.user as User;
    return userActivityRepository.counts(user.id);
  }

  // Everything the signed-in user's Dashboard renders: plan + access
  // rollup, learning progress and streaks, mock-exam trend, community
  // stats, weekly activity, per-category progress, continue-learning /
  // recommended course refs, platform totals, and the upgrade CTA payload.
  // One aggregated pass in DashboardRepository (~11 bounded parallel queries).
  @Get('me/dashboard')
  @Security('session')
  public async myDashboard(@Request() request: ExpressRequest): Promise<UserDashboardResponse> {
    const user = request.user as User;
    return dashboardRepository.build(user);
  }

  // One cursor page of the caller's own comments. `kind` = post (top-level),
  // reply, or any; `scope` = blog, course, or all. Reply rows carry the
  // parent comment they answered. Lazily paged by the profile page's
  // activity tabs — pass the previous page's `nextCursor` to continue.
  @Get('me/comments')
  @Security('session')
  public async myComments(
    @Request() request: ExpressRequest,
    @Query() kind?: 'post' | 'reply' | 'any',
    @Query() scope?: 'blog' | 'course' | 'all',
    @Query() cursor?: string,
    @Query() limit?: string,
  ): Promise<UserActivityCommentPageResponse> {
    const user = request.user as User;
    const resolvedKind: ActivityCommentKind =
      kind === 'post' || kind === 'reply' || kind === 'any' ? kind : 'any';
    const resolvedScope: ActivityScope =
      scope === 'blog' || scope === 'course' || scope === 'all' ? scope : 'all';
    const resolvedLimit = limit ? Number.parseInt(limit, 10) : 15;
    return userActivityRepository.listComments(
      user.id,
      resolvedKind,
      resolvedScope,
      cursor,
      resolvedLimit,
    );
  }

  // Profile-settings edit (spec §11): handle format rules mirror signup
  // generation, uniqueness settled by the DB index with a losing race
  // surfacing as a clean 409. Avatar must be a preset path or a URL on our
  // own Bunny pull zone. Bio is free text up to 500 chars ("" clears it).
  // Every field optional; sending none is a 400.
  @Patch('me')
  @Security('session')
  public async updateMe(
    @Body() body: UserUpdateProfileRequest,
    @Request() request: ExpressRequest,
    @Res() badRequest: TsoaResponse<400, { message: string }>,
    @Res() conflict: TsoaResponse<409, { message: string }>,
  ): Promise<UserMeResponse | void> {
    const user = request.user as User;

    const wantsUsername = typeof body.username === 'string';
    const wantsAvatar = typeof body.avatarUrl === 'string';
    const wantsBio = typeof body.bio === 'string';
    if (!wantsUsername && !wantsAvatar && !wantsBio) {
      return badRequest(400, { message: 'Nothing to update' });
    }

    if (wantsAvatar) {
      const avatarUrl = (body.avatarUrl ?? '').trim();
      if (!avatarUrl || avatarUrl.length > 2048 || !isAllowedAvatarUrl(avatarUrl)) {
        return badRequest(400, { message: 'That avatar image is not allowed' });
      }
      await userRepository.setAvatarUrl(user.id, avatarUrl);
    }

    if (wantsBio) {
      const bio = (body.bio ?? '').trim();
      if (bio.length > BIO_MAX) {
        return badRequest(400, { message: `About text must be ${BIO_MAX} characters or fewer` });
      }
      await userRepository.setBio(user.id, bio.length > 0 ? bio : null);
    }

    if (wantsUsername) {
      const username = (body.username ?? '').trim().toLowerCase();
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
    }

    const fresh = await userRepository.findById(user.id);
    return fresh ? toMe(fresh) : undefined;
  }
}
