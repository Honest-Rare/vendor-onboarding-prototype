import { Inject, Injectable, Logger, Module } from '@nestjs/common';
import { config } from '../config.js';
import { SimulatedScreeningProvider } from './simulated-screening.provider.js';
import { SCREENING_PROVIDER, type ScreeningInput, type ScreeningProvider } from './screening.types.js';

/** Entry point other modules use. Swapping the provider does not touch any caller. */
@Injectable()
export class ScreeningService {
  private readonly logger = new Logger('AI');

  constructor(@Inject(SCREENING_PROVIDER) private readonly provider: ScreeningProvider) {}

  async screen(input: ScreeningInput) {
    const started = Date.now();
    const result = await this.provider.screen(input);
    // Stand-in for Langfuse tracing: one structured line per screening.
    this.logger.log(
      JSON.stringify({
        trace: 'vendor-screening',
        applicationId: input.applicationId,
        provider: result.provider,
        promptVersion: result.promptVersion,
        recommendation: result.recommendation,
        confidence: result.confidence,
        ms: Date.now() - started,
      }),
    );
    return result;
  }
}

@Module({
  providers: [
    {
      provide: SCREENING_PROVIDER,
      useFactory: () => {
        if (config.aiProvider !== 'simulated') {
          new Logger('AI').warn(`AI_PROVIDER "${config.aiProvider}" is not implemented yet; using the simulated provider.`);
        }
        return new SimulatedScreeningProvider();
      },
    },
    ScreeningService,
  ],
  exports: [ScreeningService],
})
export class AiModule {}
