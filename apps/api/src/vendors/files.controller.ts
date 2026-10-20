import { Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AccountsService } from '../accounts/accounts.service.js';
import { readSessionCookie } from '../accounts/session.js';
import { FilesService } from '../platform/files.service.js';
import { VendorsRepository } from './vendors.repository.js';

/** Admins see every file; vendors only their own. Applicants never get files back. */
@Controller('files')
export class FilesController {
  constructor(
    private readonly accounts: AccountsService,
    private readonly files: FilesService,
    private readonly repo: VendorsRepository,
  ) {}

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request, @Res() res: Response) {
    const user = await this.accounts.userForSession(readSessionCookie(req));
    if (!user) throw new UnauthorizedException('Please sign in');
    const file = await this.files.get(id);
    if (user.role === 'vendor') {
      const vendor = await this.repo.getVendorByUser(user.id);
      if (!vendor || file.ownerType !== 'vendor' || file.ownerRef !== vendor.id) throw new ForbiddenException();
    }
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.originalName.replace(/["\\\r\n]/g, '')}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(file.absolutePath);
  }
}
