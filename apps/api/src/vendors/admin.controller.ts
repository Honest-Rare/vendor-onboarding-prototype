import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import type { SessionUser } from '../accounts/accounts.service.js';
import { AdminGuard, CurrentUser } from '../accounts/session.js';
import { parse } from '../common/validation.js';
import { ApplicationsService } from './applications.service.js';
import { OnboardingService } from './onboarding.service.js';

const reasonSchema = z.object({ reason: z.string().trim().min(3, 'A reason is required for every decision').max(2000) });
const rejectSchema = reasonSchema.extend({ message: z.string().trim().min(20, 'Write the message the applicant will receive').max(4000) });
const askSchema = z.object({ question: z.string().trim().min(10, 'Write the question for the applicant').max(2000) });
const reviewSchema = z.object({
  decision: z.enum(['approve', 'request_changes']),
  note: z.string().trim().max(2000).default(''),
});

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly applications: ApplicationsService,
    private readonly onboarding: OnboardingService,
  ) {}

  @Get('applications')
  list(@Query('filter') filter?: string) {
    return this.applications.queue(filter === 'decided' || filter === 'all' ? filter : 'open');
  }

  @Get('applications/:id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.applications.detail(id);
  }

  @Post('applications/:id/approve')
  @HttpCode(200)
  approve(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: SessionUser) {
    return this.applications.approve(id, user, parse(reasonSchema, body).reason);
  }

  @Post('applications/:id/reject')
  @HttpCode(200)
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: SessionUser) {
    const input = parse(rejectSchema, body);
    return this.applications.reject(id, user, input.reason, input.message);
  }

  @Post('applications/:id/ask')
  @HttpCode(200)
  ask(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: SessionUser) {
    return this.applications.askForInfo(id, user, parse(askSchema, body).question);
  }

  @Post('applications/:id/rescreen')
  @HttpCode(200)
  rescreen(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: SessionUser) {
    return this.applications.rerunScreening(id, user);
  }

  @Get('vendors')
  vendors() {
    return this.onboarding.listVendors();
  }

  @Get('vendors/:id')
  vendor(@Param('id', ParseUUIDPipe) id: string) {
    return this.onboarding.vendorDetail(id);
  }

  @Post('vendors/:id/sections/:key/review')
  @HttpCode(200)
  review(@Param('id', ParseUUIDPipe) id: string, @Param('key') key: string, @Body() body: unknown, @CurrentUser() user: SessionUser) {
    const input = parse(reviewSchema, body);
    return this.onboarding.reviewSection(id, key, user, input.decision, input.note);
  }
}
