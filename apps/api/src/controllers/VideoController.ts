import { Body, Controller, Delete, Get, Path, Post, Put, Query, Request, Res, Route, Security, Tags, type TsoaResponse } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { Prisma, User, Video } from '@prisma/client';
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

// Response shape for every endpoint that returns a video. An explicit DTO,
// not Prisma's `Video` model type: that type drags Prisma's self-referential
// `JsonValue` (from the `resources` Json column) and its `DefaultSelection`
// payload wrapper into the OpenAPI spec, where clients can't use them.
/** A video, as returned by every video endpoint. */
export interface VideoResponse {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  /** Always null on the public detail endpoint: playback goes through GET /videos/{slug}/stream. */
  videoUrl: string | null;
  thumbnailUrl: string | null;
  transcript: string | null;
  resources: VideoResourceInput[] | null;
  status: string;
  authorId: string | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
}

export interface VideoListResponse {
  videos: VideoResponse[];
  total: number;
}

/** `resources` is a Json column; keep only well-formed { label, url } entries. */
function parseVideoResources(value: Prisma.JsonValue): VideoResourceInput[] | null {
  if (!Array.isArray(value)) return null;
  const resources: VideoResourceInput[] = [];
  for (const item of value) {
    if (item !== null && typeof item === 'object' && !Array.isArray(item) && typeof item.label === 'string' && typeof item.url === 'string') {
      resources.push({ label: item.label, url: item.url });
    }
  }
  return resources;
}

function toVideoResponse(video: Video): VideoResponse {
  return {
    id: video.id,
    slug: video.slug,
    title: video.title,
    description: video.description,
    category: video.category,
    videoUrl: video.videoUrl,
    thumbnailUrl: video.thumbnailUrl,
    transcript: video.transcript,
    resources: parseVideoResources(video.resources),
    status: video.status,
    authorId: video.authorId,
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
    publishedAt: video.publishedAt,
  };
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
  ): Promise<VideoResponse | void> {
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
    return { ...toVideoResponse(video), videoUrl: null };
  }

  @Get('manage/list')
  @Security('session')
  public async listManage(
    @Request() request: ExpressRequest,
    @Query() limit?: string,
    @Query() offset?: string,
    @Query() search?: string,
  ): Promise<VideoListResponse> {
    setPrivateNoStoreCache(this);
    await requireCanManageVideos(request.user as User);
    const parsedLimit = limit === undefined ? 10 : Number.parseInt(limit, 10);
    const parsedOffset = offset === undefined ? 0 : Number.parseInt(offset, 10);
    const pageSize = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, MAX_MANAGE_PAGE_SIZE) : 10;
    const pageOffset = Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
    const { videos, total } = await videoRepository.listManagePage(pageSize, pageOffset, search);
    return { videos: videos.map(toVideoResponse), total };
  }

  @Get('manage/{id}')
  @Security('session')
  public async getManage(@Path() id: string, @Request() request: ExpressRequest, @Res() notFound: TsoaResponse<404, void>): Promise<VideoResponse | void> {
    setPrivateNoStoreCache(this);
    await requireCanManageVideos(request.user as User);
    const video = await videoRepository.findById(id);
    if (!video) return notFound(404);
    return toVideoResponse(video);
  }

  @Post()
  @Security('session')
  public async create(@Body() body: VideoCreateRequest, @Request() request: ExpressRequest): Promise<VideoResponse> {
    const user = request.user as User;
    await requireCanManageVideos(user);
    assertNoReplacementChar(body.title, 'Title');
    const video = await videoRepository.create({ ...body, authorId: user.id });
    purge('videos');
    return toVideoResponse(video);
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
