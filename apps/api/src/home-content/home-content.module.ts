import { Module } from '@nestjs/common';
import { HomeContentController } from './home-content.controller';
import { HomeContentService, NEWS_FETCH } from './home-content.service';

@Module({
  controllers: [HomeContentController],
  providers: [
    HomeContentService,
    { provide: NEWS_FETCH, useValue: globalThis.fetch.bind(globalThis) },
  ],
})
export class HomeContentModule {}
