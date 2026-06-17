import { Controller, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { FoodsService } from './foods.service';

@ApiTags('foods')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('v1/foods')
export class FoodsController {
  constructor(private readonly foodsService: FoodsService) {}

  @Get('search')
  @ApiOperation({ summary: 'Busca alimentos en el catalogo backend.' })
  search(@Query('query') query = '') {
    return this.foodsService.search(query);
  }

  @Get('barcode/:barcode')
  @ApiOperation({ summary: 'Resuelve un codigo de barras a food_id.' })
  findByBarcode(@Param('barcode') barcode: string) {
    return this.foodsService.findByBarcode(barcode);
  }

  @Get(':foodId')
  @ApiOperation({ summary: 'Obtiene un alimento por id.' })
  getFood(@Param('foodId') foodId: string) {
    const food = this.foodsService.getFood(foodId);
    if (!food) {
      throw new NotFoundException('Alimento no encontrado.');
    }
    return food;
  }
}
