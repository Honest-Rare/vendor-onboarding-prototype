import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

/** Validates a request body; returns readable field errors on failure. */
export function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new BadRequestException({
      message: 'Some fields need attention',
      errors: result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    });
  }
  return result.data;
}
