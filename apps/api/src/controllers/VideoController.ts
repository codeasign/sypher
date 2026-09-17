import { Body, Controller, Delete, Get, Path, Post, Put, Query, Request, Res, Route, Security, Tags, type TsoaResponse } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { User, Video } from '@prisma/client';
import { VideoRepository, type PublishedVideoSummary, type VideoResourceInput } from '../repositories/VideoRepository';
import { requireCanManageVideos } from '../lib/contentAuthz';
import { assertNoReplacementChar } from '../lib/textSanitize';
import { purge, getOrSet } from '../lib/cache';
import { applyPublicDetailCache, setPrivateNoStoreCache, setPublicListCache } from '../lib/httpCache';

const videoRepository = new VideoRepository();

const MAX_MANAGE_PAGE_SIZE = 1000;
const PUBLIC_CACHE_TTL_MS = 60_000;

interface VideoCreateRequest {
  title: string;
  description?: string | null;
  category?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  transcript?: string | null;
  resources?: VideoResourceInput[];
}

interface VideoUpdateRequest {
  title?: string;
  description?: string | null;
  category?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  transcript?: string | null;
  resources?: VideoResourceInput[];
}

interface VideoSetStatusRequest {
  status: 'draft' | 'published';
}

// Standalone single videos — Manage Videos / Browse Videos (user request
// 2026-09-16). Not tied to any course; a video only appears on the public
// listing/detail once it's BOTH published AND has an uploaded videoUrl.
@Route('videos')
@Tags('Videos')
export class VideoController extends Controller {
  // Every category-grouped published video — small enough (unlike courses)
  // to return unpaginated in one shot, same reasoning as
  // CourseController.listForSidebar.
  @Get()
  public async listPublished(): Promise<PublishedVideoSummary[]> {
    setPublicListCache(this);
    return getOrSet('videos:published-list', PUBLIC_CACHE_TTL_MS, () => videoRepository.listPublished());
  }

  @Get('{slug}')
  public async getBySlug(
    @Path() slug: string,
    @Request() request: ExpressRequest,
    @Res() notFound: TsoaResponse<404, void>,
  ): Promise<Video | void> {
    const video = await getOrSet(`videos:published-detail:${slug}`, PUBLIC_CACHE_TTL_MS, () => videoRepository.findBySlugPublished(slug));
    if (!video) return notFound(404);
    if (applyPublicDetailCache(this, request, video.updatedAt)) {
      this.setStatus(304);
      return;
    }
    // videoUrl is deliberately never sent to the client (user request
    // 2026-09-16: "URL should not be exposed at all") — playback goes
    // through GET /videos/{slug}/stream instead (lib/videoStream.ts, a
    // raw route registered in server.ts), which fetches the real Bunny
    // URL server-side and relays bytes. The frontend only ever needs
    // `slug` to build that stream URL.
    return { ...video, videoUrl: null };
  }

  @Get('manage/list')
  @Security('session')
  public async listManage(
    @Request() request: ExpressRequest,
    @Query() limit?: string,
    @Query() offset?: string,
    @Query() search?: string,
  ): Promise<{ videos: Video[]; total: number }> {
    setPrivateNoStoreCache(this);
    await requireCanManageVideos(request.user as User);
    const parsedLimit = limit === undefined ? 10 : Number.parseInt(limit, 10);
    const parsedOffset = offset === undefined ? 0 : Number.parseInt(offset, 10);
    const pageSize = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, MAX_MANAGE_PAGE_SIZE) : 10;
    const pageOffset = Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
    return videoRepository.listManagePage(pageSize, pageOffset, search);
  }

  @Get('manage/{id}')
  @Security('session')
  public async getManage(@Path() id: string, @Request() request: ExpressRequest, @Res() notFound: TsoaResponse<404, void>): Promise<Video | void> {
    setPrivateNoStoreCache(this);
    await requireCanManageVideos(request.user as User);
    const video = await videoRepository.findById(id);
    if (!video) return notFound(404);
    return video;
  }

  @Post()
  @Security('session')
  public async create(@Body() body: VideoCreateRequest, @Request() request: ExpressRequest): Promise<Video> {
    const user = request.user as User;
    await requireCanManageVideos(user);
    assertNoReplacementChar(body.title, 'Title');
    const video = await videoRepository.create({ ...body, authorId: user.id });
    purge('videos');
    return video;
  }

  @Put('{id}')
  @Security('session')
  public async update(@Path() id: string, @Body() body: VideoUpdateRequest, @Request() request: ExpressRequest): Promise<void> {
    await requireCanManageVideos(request.user as User);
    assertNoReplacementChar(body.title, 'Title');
    await videoRepository.update(id, body);
    purge('videos');
  }

  @Put('{id}/status')
  @Security('session')
  public async updateStatus(@Path() id: string, @Body() body: VideoSetStatusRequest, @Request() request: ExpressRequest): Promise<void> {
    await requireCanManageVideos(request.user as User);
    await videoRepository.setStatus(id, body.status);
    purge('videos');
  }

  @Delete('{id}')
  @Security('session')
  public async remove(@Path() id: string, @Request() request: ExpressRequest): Promise<void> {
    await requireCanManageVideos(request.user as User);
    await videoRepository.delete(id);
    purge('videos');
  }
}
