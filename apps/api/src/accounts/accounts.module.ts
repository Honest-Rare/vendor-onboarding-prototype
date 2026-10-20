import { Module } from '@nestjs/common';
import { AccountsRepository } from './accounts.repository.js';
import { AccountsService } from './accounts.service.js';
import { AuthController } from './auth.controller.js';
import { AdminGuard, VendorGuard } from './session.js';

@Module({
  controllers: [AuthController],
  providers: [AccountsRepository, AccountsService, AdminGuard, VendorGuard],
  exports: [AccountsService, AdminGuard, VendorGuard],
})
export class AccountsModule {}
