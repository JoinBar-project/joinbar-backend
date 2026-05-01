import { Controller, Get } from '@nestjs/common';
import { Public } from './decorator/public.decorator';

@Controller('health')
@Public()
export class HealthController {
  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }
}
