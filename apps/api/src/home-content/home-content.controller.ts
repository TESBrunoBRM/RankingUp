import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HomeContentService } from './home-content.service';

@ApiTags('home-content')
@Controller('v1/home-content')
export class HomeContentController {
  constructor(private readonly homeContentService: HomeContentService) {}

  @Get()
  @ApiOperation({ summary: 'Devuelve mensajes y noticias fitness con fallback editorial.' })
  getHomeContent() {
    return this.homeContentService.getHomeContent();
  }
}
