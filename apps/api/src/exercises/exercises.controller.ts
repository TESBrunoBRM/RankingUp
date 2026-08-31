import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { SearchExercisesDto } from './dto/search-exercises.dto';
import { ExercisesService } from './exercises.service';

@ApiTags('exercises')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('v1/exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  @ApiOperation({ summary: 'Busca en el catalogo de ejercicios con filtros y paginacion.' })
  search(@Query() dto: SearchExercisesDto) {
    return this.exercisesService.search(dto);
  }

  @Get('filters')
  @ApiOperation({ summary: 'Devuelve las facetas disponibles (zona, equipamiento, musculo) con su conteo.' })
  getFilters() {
    return this.exercisesService.getFilters();
  }

  @Get('lookup')
  @ApiOperation({ summary: 'Fichas de varios ejercicios por nombre, en una sola peticion.' })
  lookup(@Query('name') name?: string | string[]) {
    const names = Array.isArray(name) ? name : name ? [name] : [];
    return this.exercisesService.getManyByNames(names);
  }

  @Get('by-name')
  @ApiOperation({ summary: 'Busca un ejercicio por su nombre exacto (clave usada en workout_exercises).' })
  getByName(@Query('name') name: string) {
    return this.exercisesService.getByName(name ?? '');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un ejercicio con instrucciones paso a paso y media.' })
  getById(@Param('id') id: string) {
    return this.exercisesService.getById(id);
  }
}
