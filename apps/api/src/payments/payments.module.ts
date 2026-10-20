import { Logger, Module } from '@nestjs/common';
import { config } from '../config.js';
import { PG_POOL, type Db } from '../platform/database.js';
import { SimulatedPaymentsProvider } from './simulated-payments.provider.js';
import { StripeExpressProvider } from './stripe-express.provider.js';
import { PAYMENTS_PROVIDER } from './payments.types.js';

const logger = new Logger('Payments');

@Module({
  providers: [
    SimulatedPaymentsProvider,
    {
      provide: PAYMENTS_PROVIDER,
      inject: [PG_POOL],
      useFactory: (db: Db) => {
        const key = config.stripeSecretKey;
        if (key.startsWith('sk_test_')) {
          logger.log('Using Stripe Connect Express in test mode.');
          return new StripeExpressProvider(key);
        }
        if (key) {
          logger.error('STRIPE_SECRET_KEY is not a test key (sk_test_). It is ignored; using simulated Stripe.');
        } else {
          logger.log('No Stripe key; using simulated Stripe.');
        }
        return new SimulatedPaymentsProvider(db);
      },
    },
  ],
  exports: [PAYMENTS_PROVIDER, SimulatedPaymentsProvider],
})
export class PaymentsModule {}
