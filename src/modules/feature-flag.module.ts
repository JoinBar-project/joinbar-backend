import { Global, Module } from '@nestjs/common';
import { FeatureFlagService } from '../application/service/FeatureFlagService';

/** @Global() — FeatureFlagService 全域可用，各 Guard / Service / Interceptor 皆可注入 */
@Global()
@Module({
  providers: [FeatureFlagService],
  exports: [FeatureFlagService],
})
export class FeatureFlagModule {}
