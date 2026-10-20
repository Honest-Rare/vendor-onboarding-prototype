import { BadRequestException, Body, Controller, Get, HttpCode, Post, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { z } from 'zod';
import { RateLimiter } from '../common/rate-limit.js';
import { parse } from '../common/validation.js';
import { FilesService, MAX_FILE_BYTES } from '../platform/files.service.js';
import { applicationSchema } from './application.schema.js';
import { ApplicationsService } from './applications.service.js';

const tokenSchema = z.object({ token: z.string().min(10).max(200) });
const answerSchema = tokenSchema.extend({ answer: z.string().trim().min(2, 'Please write an answer').max(4000) });

const submitLimiter = new RateLimiter(5, 60 * 60 * 1000);
const uploadLimiter = new RateLimiter(40, 60 * 60 * 1000);

/** Storefront endpoints. No account: applicants are identified by single-use email links. */
@Controller('applications')
export class PublicController {
  constructor(
    private readonly applications: ApplicationsService,
    private readonly files: FilesService,
  ) {}

  @Post('photos')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES } }))
  async uploadPhoto(@Req() req: Request, @UploadedFile() file: Express.Multer.File) {
    uploadLimiter.check(req, 'photos');
    if (file && !file.mimetype.startsWith('image/')) throw new BadRequestException('Sample photos must be JPG, PNG or WebP images');
    return this.files.save(file, 'application', null);
  }

  @Post()
  async submit(@Req() req: Request, @Body() body: unknown) {
    submitLimiter.check(req, 'submit');
    return this.applications.submit(parse(applicationSchema, body));
  }

  @Post('confirm')
  @HttpCode(200)
  async confirm(@Body() body: unknown) {
    return this.applications.confirmEmail(parse(tokenSchema, body).token);
  }

  @Get('question')
  async question(@Query('token') token: string) {
    return this.applications.questionForToken(parse(z.string().min(10).max(200), token));
  }

  @Post('answer')
  @HttpCode(200)
  async answer(@Body() body: unknown) {
    const input = parse(answerSchema, body);
    return this.applications.answer(input.token, input.answer);
  }
}
