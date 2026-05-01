import { Module } from '@nestjs/common';
import { FirebaseNotificationAdapter } from '../adapter/out/firebase/FirebaseNotificationAdapter';
import { SEND_NOTIFICATION_PORT } from '../application/port/out/shared/SendNotificationPort';

@Module({
  providers: [
    FirebaseNotificationAdapter,
    {
      provide: SEND_NOTIFICATION_PORT,
      useExisting: FirebaseNotificationAdapter,
    },
  ],
  exports: [SEND_NOTIFICATION_PORT],
})
export class FirebaseModule {}
