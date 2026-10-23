import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { SupabaseService } from "../supabase/supabase.service";
import { ProgressService } from "../progress/progress.service";
import { databaseError } from "../admin/database-error";
import type { PageQueryDto } from "../admin/admin.dto";
import type { FoodImageUploadDto } from "../foods/dto/foods.dto";
import type { CreateBugReportDto, CreateContentReportDto } from "./reports.dto";

const ownColumns = {
  posts: "id,reason,details,status,public_response,created_at,updated_at",
  bugs: "id,title,description,steps,app_version,platform,status,priority,public_response,created_at,updated_at",
  foods:
    "id,food_name,brand_name,barcode,status,serving_amount,serving_unit,calories,protein,carbs,fat,source_mode,original_values,review_note,created_at,updated_at",
} as const;

@Injectable()
export class ReportsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly progress: ProgressService,
  ) {}
  private get db() {
    return this.supabase.serviceClient;
  }

  async createPost(userId: string, dto: CreateContentReportDto) {
    const post = await this.progress.visiblePost(userId, dto.postId);
    if (post.user_id === userId)
      throw new BadRequestException(
        "No puedes denunciar tu propia publicación.",
      );
    const { data, error } = await this.db
      .from("content_reports")
      .insert({
        submitted_by: userId,
        post_id: dto.postId,
        post_snapshot: post,
        reason: dto.reason,
        details: dto.details ?? "",
      })
      .select(ownColumns.posts)
      .single();
    if (error) databaseError(error);
    return data;
  }

  async uploadUrl(userId: string, dto: FoodImageUploadDto) {
    const ext =
      dto.contentType === "image/png"
        ? "png"
        : dto.contentType === "image/webp"
          ? "webp"
          : "jpg";
    const path = `${userId}/${randomUUID()}.${ext}`;
    const { data, error } = await this.db.storage
      .from("bug-evidence")
      .createSignedUploadUrl(path);
    if (error || !data)
      throw new BadRequestException("No se pudo preparar la captura.");
    return { path, token: data.token };
  }

  async createBug(userId: string, dto: CreateBugReportDto) {
    if (dto.screenshotPath) {
      if (
        !dto.screenshotPath.startsWith(`${userId}/`) ||
        dto.screenshotPath.includes("..") ||
        !/^[\w/-]+\.(jpg|png|webp)$/.test(dto.screenshotPath)
      ) {
        throw new ForbiddenException("La captura no pertenece a tu cuenta.");
      }
      const { data, error } = await this.db.storage
        .from("bug-evidence")
        .info(dto.screenshotPath);
      if (error || !data)
        throw new BadRequestException(
          "La captura ya no existe. Vuelve a adjuntarla.",
        );
      if (Number(data.size) > 5242880)
        throw new BadRequestException("La captura supera los 5 MB.");
    }
    const { data, error } = await this.db
      .from("bug_reports")
      .insert({
        submitted_by: userId,
        title: dto.title,
        description: dto.description,
        steps: dto.steps,
        app_version: dto.appVersion,
        platform: dto.platform,
        screenshot_path: dto.screenshotPath ?? null,
      })
      .select(ownColumns.bugs)
      .single();
    if (error) databaseError(error);
    return data;
  }

  async mine(
    kind: keyof typeof ownColumns,
    userId: string,
    query: PageQueryDto,
  ) {
    const table = {
      posts: "content_reports",
      bugs: "bug_reports",
      foods: "food_submissions",
    }[kind];
    const start = (query.page - 1) * query.pageSize;
    const { data, error, count } = await this.db
      .from(table)
      .select(ownColumns[kind], { count: "exact" })
      .eq("submitted_by", userId)
      .order("created_at", { ascending: false })
      .order("id")
      .range(start, start + query.pageSize - 1);
    if (error) databaseError(error);
    return {
      items: data ?? [],
      total: count ?? 0,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}
