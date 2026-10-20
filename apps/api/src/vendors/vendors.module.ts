import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module.js';
import { AiModule } from '../ai/ai.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { RulesModule } from '../rules/rules.module.js';
import { AdminController } from './admin.controller.js';
import { ApplicationsService } from './applications.service.js';
import { FilesController } from './files.controller.js';
import { OnboardingService } from './onboarding.service.js';
import { PublicController } from './public.controller.js';
import { VendorController } from './vendor.controller.js';
import { VendorsRepository } from './vendors.repository.js';

@Module({
  imports: [AccountsModule, AiModule, NotificationsModule, PaymentsModule, RulesModule],
  controllers: [PublicController, AdminController, VendorController, FilesController],
  providers: [VendorsRepository, ApplicationsService, OnboardingService],
})
export class VendorsModule {}
