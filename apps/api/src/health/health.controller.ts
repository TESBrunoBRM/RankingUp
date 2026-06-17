import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check publico para despliegue cloud.' })
  getHealth() {
    return {
      status: 'ok',
      service: 'rankingup-api',
    };
  }
}
