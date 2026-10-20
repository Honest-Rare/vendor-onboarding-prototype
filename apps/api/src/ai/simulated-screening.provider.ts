import { Injectable } from '@nestjs/common';
import { SCRIPTED_RESULTS } from './scripted-results.js';
import type { ScreeningInput, ScreeningProvider, ScreeningResult } from './screening.types.js';

const BASE = { provider: 'simulated', model: 'none', promptVersion: 'vendor-screening-v1', simulated: true } as const;

/**
 * Stands in for the real AI until a Bedrock or Anthropic key exists.
 * Returns the scripted result for seeded test applications, and an honest "not screened" result otherwise.
 */
@Injectable()
export class SimulatedScreeningProvider implements ScreeningProvider {
  async screen(input: ScreeningInput): Promise<ScreeningResult> {
    await new Promise((resolve) => setTimeout(resolve, 1500)); // feels like a real call in the UI

    const scripted = input.fixture ? SCRIPTED_RESULTS[input.fixture] : undefined;
    if (scripted) return { ...BASE, ...scripted };

    return {
      ...BASE,
      recommendation: 'needs_a_look',
      confidence: null,
      summary:
        'Simulated AI: there is no scripted result for this application. Connect a real AI provider to screen it. ' +
        'Review the application and the rules results by hand.',
      criteria: (['regional', 'not_mainstream', 'quality', 'natural'] as const).map((criterion) => ({
        criterion,
        assessment: 'no_information' as const,
        note: 'Not screened (simulated provider).',
      })),
      flags: [],
      sourcesChecked: [],
    };
  }
}
