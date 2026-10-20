import { Controller, Get, Module } from '@nestjs/common';
import { AccountsModule } from './accounts/accounts.module.js';
import { PlatformModule } from './platform/platform.module.js';
import { VendorsModule } from './vendors/vendors.module.js';

@Controller('health')
class HealthController {
  @Get()
  health() {
    return { ok: true };
  }
}

@Module({
  imports: [PlatformModule, AccountsModule, VendorsModule],
  controllers: [HealthController],
})
export class AppModule {}
