import { Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { AnalyzeFoodImageDto, CreateFoodSubmissionDto, FoodImageUploadDto, ListFoodSubmissionsDto, ReviewFoodSubmissionDto } from './dto/foods.dto';
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

  @Post('image-upload-url')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Crea una URL firmada para una foto privada de alimento.' })
  createImageUploadUrl(@CurrentUser() user: AuthenticatedUser, @Body() dto: FoodImageUploadDto) {
    return this.foodsService.createImageUploadUrl(user.id, dto);
  }

  @Post('analyze-image')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Analiza un plato o tabla nutricional con el proveedor IA del backend.' })
  analyzeImage(@CurrentUser() user: AuthenticatedUser, @Body() dto: AnalyzeFoodImageDto) {
    return this.foodsService.analyzeImage(user.id, dto);
  }

  @Post('submissions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Envia un alimento para moderacion.' })
  createSubmission(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFoodSubmissionDto) {
    return this.foodsService.createSubmission(user.id, dto);
  }

  @Get('submissions/mine')
  @ApiOperation({ summary: 'Lista los aportes del usuario autenticado.' })
  listOwnSubmissions(@CurrentUser() user: AuthenticatedUser) {
    return this.foodsService.listOwnSubmissions(user.id);
  }

  @Get('admin/submissions')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Lista aportes para moderacion. Requiere app_metadata.role=admin.' })
  listForReview(@Query() query: ListFoodSubmissionsDto) {
    return this.foodsService.listForReview(query.status);
  }

  @Patch('admin/submissions/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Aprueba o rechaza un alimento aportado.' })
  reviewSubmission(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewFoodSubmissionDto,
  ) {
    return this.foodsService.reviewSubmission(user.id, id, dto);
  }

  @Get(':foodId')
  @ApiOperation({ summary: 'Obtiene un alimento por id.' })
  async getFood(@CurrentUser() user: AuthenticatedUser, @Param('foodId') foodId: string) {
    const food = await this.foodsService.getFood(foodId, user.id);
    if (!food) {
      throw new NotFoundException('Alimento no encontrado.');
    }
    return food;
  }
}
