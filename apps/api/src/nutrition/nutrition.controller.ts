import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CreateFoodLogDto } from './dto/create-food-log.dto';
import { CreateWaterLogDto } from './dto/create-water-log.dto';
import { GetNutritionLogsDto } from './dto/get-nutrition-logs.dto';
import { NutritionService } from './nutrition.service';

@ApiTags('nutrition')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('v1/nutrition')
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Devuelve logs y resumen nutricional diario.' })
  getLogs(@CurrentUser() user: AuthenticatedUser, @Query() query: GetNutritionLogsDto) {
    return this.nutritionService.getDailySummary(user.id, query.date);
  }

  @Post('logs')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Calcula macros y guarda un alimento.' })
  createLog(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFoodLogDto) {
    return this.nutritionService.createFoodLog(user.id, dto);
  }

  @Delete('logs/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Elimina un log validando ownership.' })
  deleteLog(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.nutritionService.deleteFoodLog(user.id, id);
  }

  @Post('water')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registra un vaso de agua para el dia indicado.' })
  createWaterLog(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateWaterLogDto) {
    return this.nutritionService.createWaterLog(user.id, dto);
  }

  @Delete('water/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Elimina un vaso de agua validando ownership.' })
  deleteWaterLog(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.nutritionService.deleteWaterLog(user.id, id);
  }
}
