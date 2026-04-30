import { Module } from '@nestjs/common';
import { JwtModule as NestJwtModule } from '@nestjs/jwt';
import { getEnv } from '../infrastructure/validate-env';

@Module({
  imports: [
    NestJwtModule.registerAsync({
      useFactory: () => {
        const env = getEnv();
        return {
          secret: env.ACCESS_SECRET,
          signOptions: { expiresIn: env.ACCESS_TOKEN_EXPIRES_IN },
        };
      },
    }),
  ],
  exports: [NestJwtModule],
})
export class JwtModule {}
