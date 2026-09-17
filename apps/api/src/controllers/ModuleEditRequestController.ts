import { Body, Controller, Get, Path, Post, Put, Query, Request, Res, Route, Security, Tags, type TsoaResponse } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { User } from '@prisma/client';
import { ModuleEditRequestRepository, type ModuleEditRequestWithContext } from '../repositories/ModuleEditRequestRepository';
import { CourseModuleRepository } from '../repositories/CourseModuleRepository';
import { requireCanManageCourses, requireCanApproveModuleEdits } from '../lib/contentAuthz';
import { assertImportedDiagramCaptions } from '../lib/diagramMarkup';
import { purge } from '../lib/cache';
import { setPrivateNoStoreCache } from '../lib/httpCache';

const moduleEditRequestRepository = new ModuleEditRequestRepository();
const courseModuleRepository = new CourseModuleRepository();

// Same "fetch-once, bounded" convention as Course/Blog/Video/Cohort's
// manage endpoints — the audit queue page has no paging UI today.
const DEFAULT_QUEUE_PAGE_SIZE = 1000;
const MAX_QUEUE_PAGE_SIZE = 2000;

interface CreateModuleEditRequestBody {
  courseId: string;
  moduleId: string;
  bodyMdx: string;
}

// Reviewer-proposed content edits, queued for a Course Auditor to approve
// before they go live (user request 2026-09-16). Split from
// CourseController's module endpoints since the access model differs:
// submitting requires only manage-course-authoring, approving requires
// the separate course-audit grant.
@Route('module-edit-requests')
@Tags('ModuleEditRequests')
export class ModuleEditRequestController extends Controller {
  @Post()
  @Security('session')
  public async create(@Body() body: CreateModuleEditRequestBody, @Request() request: ExpressRequest): Promise<{ id: string }> {
    const user = request.user as User;
    await requireCanManageCourses(user);
    assertImportedDiagramCaptions(body.bodyMdx);
    const created = await moduleEditRequestRepository.create({
      moduleId: body.moduleId,
      courseId: body.courseId,
      proposedBodyMdx: body.bodyMdx,
      requestedById: user.id,
    });
    return { id: created.id };
  }

  @Get()
  @Security('session')
  public async list(
    @Query() status: string = 'pending',
    @Request() request: ExpressRequest,
    @Query() limit?: string,
    @Query() offset?: string,
  ): Promise<ModuleEditRequestWithContext[]> {
    setPrivateNoStoreCache(this);
    await requireCanApproveModuleEdits(request.user as User);
    const parsedLimit = limit === undefined ? DEFAULT_QUEUE_PAGE_SIZE : Number.parseInt(limit, 10);
    const parsedOffset = offset === undefined ? 0 : Number.parseInt(offset, 10);
    const pageSize = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, MAX_QUEUE_PAGE_SIZE) : DEFAULT_QUEUE_PAGE_SIZE;
    const pageOffset = Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
    return moduleEditRequestRepository.listByStatus(status, pageSize, pageOffset);
  }

  @Get('{id}')
  @Security('session')
  public async getOne(@Path() id: string, @Request() request: ExpressRequest, @Res() notFound: TsoaResponse<404, void>): Promise<ModuleEditRequestWithContext | void> {
    setPrivateNoStoreCache(this);
    await requireCanApproveModuleEdits(request.user as User);
    const row = await moduleEditRequestRepository.findById(id);
    if (!row) return notFound(404);
    return row;
  }

  @Put('{id}/approve')
  @Security('session')
  public async approve(@Path() id: string, @Request() request: ExpressRequest, @Res() notFound: TsoaResponse<404, void>): Promise<void> {
    const user = request.user as User;
    await requireCanApproveModuleEdits(user);
    const row = await moduleEditRequestRepository.findById(id);
    if (!row || row.status !== 'pending') return notFound(404);
    await courseModuleRepository.update(row.moduleId, { bodyMdx: row.proposedBodyMdx });
    await moduleEditRequestRepository.setStatus(id, 'approved', user.id);
    purge('courses');
  }

  @Put('{id}/reject')
  @Security('session')
  public async reject(@Path() id: string, @Request() request: ExpressRequest, @Res() notFound: TsoaResponse<404, void>): Promise<void> {
    const user = request.user as User;
    await requireCanApproveModuleEdits(user);
    const row = await moduleEditRequestRepository.findById(id);
    if (!row || row.status !== 'pending') return notFound(404);
    await moduleEditRequestRepository.setStatus(id, 'rejected', user.id);
  }
}
