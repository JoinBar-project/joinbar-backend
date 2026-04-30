import { Global, Module } from '@nestjs/common';
import { NodemailerEmailAdapter } from '../adapter/out/mail/NodemailerEmailAdapter';
import { SEND_EMAIL_PORT } from '../application/port/out/shared/SendEmailPort';

/** @Global() — SendEmailPort 全域可用 */
@Global()
@Module({
  providers: [
    NodemailerEmailAdapter,
    { provide: SEND_EMAIL_PORT, useExisting: NodemailerEmailAdapter },
  ],
  exports: [SEND_EMAIL_PORT],
})
export class EmailModule {}
