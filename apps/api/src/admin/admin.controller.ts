import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminGuard } from "../auth/admin.guard";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import {
  ModeratePostDto,
  PageQueryDto,
  ReviewAdminFoodDto,
  ReviewBugDto,
  ReviewContentReportDto,
} from "./admin.dto";
import { AdminService, isAdminResource } from "./admin.service";

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, AdminGuard)
@Controller("v1/admin")
export class AdminController {
  constructor(private readonly service: AdminService) {}
  @Get("me")
  @ApiOperation({
    summary: "Valida el acceso administrativo con metadatos confiables.",
  })
  me(@CurrentUser() user: AuthenticatedUser) {
    return { id: user.id, email: user.email, role: user.role };
  }
  @Get("summary")
  @ApiOperation({ summary: "Contadores de las bandejas administrativas." })
  summary() {
    return this.service.summary();
  }
  @Get("audit-log")
  @ApiOperation({
    summary: "Historial paginado de decisiones, solo para administradores.",
  })
  audit(@Query() query: PageQueryDto) {
    return this.service.audit(query);
  }
  @Patch("food-submissions/:id")
  @ApiOperation({
    summary: "Corrige, aprueba o rechaza un aporte con auditoría atómica.",
  })
  food(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReviewAdminFoodDto,
  ) {
    return this.service.reviewFood(user.id, id, dto);
  }
  @Patch("content-reports/:id")
  @ApiOperation({
    summary:
      "Revisa una denuncia y opcionalmente oculta su publicación en la misma transacción.",
  })
  report(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReviewContentReportDto,
  ) {
    return this.service.reviewContent(user.id, id, dto);
  }
  @Patch("bug-reports/:id")
  @ApiOperation({
    summary: "Actualiza estado, prioridad y respuesta de un bug.",
  })
  bug(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReviewBugDto,
  ) {
    return this.service.reviewBug(user.id, id, dto);
  }
  @Patch("posts/:id/moderation")
  @ApiOperation({
    summary: "Oculta o restaura sin modificar privacidad, entrenamiento o XP.",
  })
  post(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ModeratePostDto,
  ) {
    return this.service.moderatePost(user.id, id, dto);
  }
  @Get(":resource")
  @ApiOperation({
    summary: "Lista paginada: food-submissions, content-reports o bug-reports.",
  })
  list(@Param("resource") resource: string, @Query() query: PageQueryDto) {
    if (!isAdminResource(resource)) throw new NotFoundException();
    return this.service.list(resource, query);
  }
  @Get(":resource/:id")
  @ApiOperation({
    summary: "Detalle con evidencia privada, autor e historial.",
  })
  detail(
    @Param("resource") resource: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    if (!isAdminResource(resource)) throw new NotFoundException();
    return this.service.detail(resource, id);
  }
}
