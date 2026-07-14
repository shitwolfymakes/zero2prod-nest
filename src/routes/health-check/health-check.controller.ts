//! src/routes/health-check/health-check.controller.ts
import { Controller, Get, HttpCode } from '@nestjs/common';

@Controller('health_check')
export class HealthCheckController {
  @Get()
  @HttpCode(200)
  healthCheck(): void {}
}
