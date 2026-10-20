import { Body, Controller, Get, HttpCode, Param, Post, Put, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { z } from 'zod';
import type { SessionUser } from '../accounts/accounts.service.js';
import { CurrentUser, VendorGuard } from '../accounts/session.js';
import { parse } from '../common/validation.js';
import { MAX_FILE_BYTES } from '../platform/files.service.js';
import { OnboardingService } from './onboarding.service.js';

const saveSchema = z.object({
  data: z.record(z.string(), z.unknown()),
  submit: z.boolean().default(false),
});

/** Vendor panel endpoints. Only after approval: the vendor has an account. */
@Controller('vendor')
@UseGuards(VendorGuard)
export class VendorController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get('overview')
  overview(@CurrentUser() user: SessionUser) {
    return this.onboarding.overview(user);
  }

  @Put('sections/:key')
  save(@Param('key') key: string, @Body() body: unknown, @CurrentUser() user: SessionUser) {
    const input = parse(saveSchema, body);
    return this.onboarding.saveSection(user, key, input.data, input.submit);
  }

  @Post('uploads')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES } }))
  upload(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: SessionUser) {
    return this.onboarding.upload(user, file);
  }

  @Post('payouts/start')
  @HttpCode(200)
  startPayouts(@CurrentUser() user: SessionUser) {
    return this.onboarding.startPayouts(user);
  }

  @Post('payouts/refresh')
  @HttpCode(200)
  refreshPayouts(@CurrentUser() user: SessionUser) {
    return this.onboarding.refreshPayouts(user);
  }

  @Post('payouts/simulate-complete')
  @HttpCode(200)
  simulateComplete(@Body() body: unknown, @CurrentUser() user: SessionUser) {
    return this.onboarding.completeSimulatedPayouts(user, parse(z.object({ accountId: z.string().min(5) }), body).accountId);
  }

  @Post('go-live')
  @HttpCode(200)
  goLive(@CurrentUser() user: SessionUser) {
    return this.onboarding.goLive(user);
  }
}
