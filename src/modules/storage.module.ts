import { Module } from '@nestjs/common';
import { FirebaseStorageAdapter } from '../adapter/out/firebase/FirebaseStorageAdapter';
import { FILE_STORAGE_PORT } from '../application/port/out/shared/FileStoragePort';

@Module({
  providers: [
    FirebaseStorageAdapter,
    { provide: FILE_STORAGE_PORT, useExisting: FirebaseStorageAdapter },
  ],
  exports: [FILE_STORAGE_PORT],
})
export class StorageModule {}
