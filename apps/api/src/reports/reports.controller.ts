import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { PageQueryDto } from "../admin/admin.dto";
import { FoodImageUploadDto } from "../foods/dto/foods.dto";
import { CreateBugReportDto, CreateContentReportDto } from "./reports.dto";
import { ReportsService } from "./reports.service";

@ApiTags("reports")
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller("v1/reports")
export class ReportsController {
  constructor(private readonly service: ReportsService) {}
  @Post("posts")
  @HttpCode(201)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({
    summary:
      "Denuncia una publicación ajena visible; impide duplicados abiertos.",
  })
  post(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateContentReportDto,
  ) {
    return this.service.createPost(user.id, dto);
  }
  @Post("bugs")
  @HttpCode(201)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({
    summary: "Envía un bug con contexto y una captura privada opcional.",
  })
  bug(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBugReportDto) {
    return this.service.createBug(user.id, dto);
  }
  @Post("bugs/upload-url")
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({
    summary: "Prepara una captura JPEG, PNG o WebP de hasta 5 MB.",
  })
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: FoodImageUploadDto,
  ) {
    return this.service.uploadUrl(user.id, dto);
  }
  @Get(":kind/mine")
  @ApiOperation({
    summary:
      "Consulta solo tus envíos: foods, posts o bugs. Excluye datos internos.",
  })
  mine(
    @CurrentUser() user: AuthenticatedUser,
    @Param("kind") kind: string,
    @Query() query: PageQueryDto,
  ) {
    if (kind !== "foods" && kind !== "posts" && kind !== "bugs")
      throw new NotFoundException();
    return this.service.mine(kind, user.id, query);
  }
}
