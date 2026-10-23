import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { FoodsService } from "../foods/foods.service";
import type {
  ModeratePostDto,
  PageQueryDto,
  ReviewAdminFoodDto,
  ReviewBugDto,
  ReviewContentReportDto,
} from "./admin.dto";
import { databaseError } from "./database-error";

const resources = {
  "food-submissions": {
    table: "food_submissions",
    search: "food_name",
    statuses: ["pending", "approved", "rejected"],
    type: "food_submission",
  },
  "content-reports": {
    table: "content_reports",
    search: "details",
    statuses: ["pending", "in_review", "resolved", "dismissed"],
    type: "content_report",
  },
  "bug-reports": {
    table: "bug_reports",
    search: "title",
    statuses: ["open", "in_progress", "resolved", "closed"],
    type: "bug_report",
  },
} as const;
export type AdminResource = keyof typeof resources;
export const isAdminResource = (value: string): value is AdminResource =>
  Object.prototype.hasOwnProperty.call(resources, value);
const escapedSearch = (value: string) => value.replace(/[\\%_]/g, "\\$&");

@Injectable()
export class AdminService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly foods: FoodsService,
  ) {}
  private get db() {
    return this.supabase.serviceClient;
  }

  async summary() {
    const specs = [
      ["food_submissions", "status", ["pending"]],
      ["content_reports", "status", ["pending", "in_review"]],
      ["bug_reports", "status", ["open", "in_progress"]],
      ["post_moderation", "hidden", [true]],
    ] as const;
    const counts = await Promise.all(
      specs.map(async ([table, column, values]) => {
        const { count, error } = await this.db
          .from(table)
          .select("*", { count: "exact", head: true })
          .in(column, [...values]);
        if (error) databaseError(error);
        return count ?? 0;
      }),
    );
    return {
      pendingFoods: counts[0],
      openReports: counts[1],
      openBugs: counts[2],
      hiddenPosts: counts[3],
    };
  }

  async list(resource: AdminResource, query: PageQueryDto) {
    const spec = resources[resource];
    let request = this.db.from(spec.table).select("*", { count: "exact" });
    if (query.status) {
      if (!(spec.statuses as readonly string[]).includes(query.status))
        throw new BadRequestException("Filtro de estado inválido.");
      request = request.eq("status", query.status);
    }
    if (query.search)
      request = request.ilike(spec.search, `%${escapedSearch(query.search)}%`);
    const start = (query.page - 1) * query.pageSize;
    const { data, count, error } = await request
      .order("created_at", { ascending: false })
      .order("id")
      .range(start, start + query.pageSize - 1);
    if (error) databaseError(error);
    return {
      items: await this.withPeople(data ?? [], "submitted_by"),
      total: count ?? 0,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  private async withPeople<T extends Record<string, unknown>>(
    rows: T[],
    key: string,
  ) {
    const ids = [
      ...new Set(
        rows
          .map((row) => row[key])
          .filter((id): id is string => typeof id === "string"),
      ),
    ];
    if (!ids.length) return rows.map((row) => ({ ...row, person: null }));
    const { data, error } = await this.db
      .from("profiles")
      .select("id,name,username")
      .in("id", ids);
    if (error) databaseError(error);
    const people = new Map((data ?? []).map((row) => [row.id, row]));
    return rows.map((row) => ({
      ...row,
      person: people.get(String(row[key])) ?? null,
    }));
  }

  async signedImage(
    bucket: string,
    path?: string | null,
  ): Promise<string | null> {
    if (!path) return null;
    const storage = this.db.storage.from(bucket);
    const info = await storage.info(path);
    if (info.error || !info.data) return null;
    const { data, error } = await storage.createSignedUrl(path, 300);
    return error ? null : (data?.signedUrl ?? null);
  }

  async detail(resource: AdminResource, id: string) {
    const spec = resources[resource];
    const { data, error } = await this.db
      .from(spec.table)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) databaseError(error);
    if (!data) throw new NotFoundException("El envío ya no existe.");
    const [item] = await this.withPeople([data], "submitted_by");
    const history = await this.auditFor(spec.type, id);
    if (resource === "food-submissions")
      return {
        ...item,
        imageUrl: await this.signedImage("food-evidence", data.image_path),
        history,
      };
    if (resource === "bug-reports")
      return {
        ...item,
        imageUrl: await this.signedImage("bug-evidence", data.screenshot_path),
        history,
      };
    const [post, moderation, related] = await Promise.all([
      data.post_id
        ? this.db
            .from("workout_logs")
            .select(
              "id,user_id,name,description,photo_path,published_at,visibility",
            )
            .eq("id", data.post_id)
            .maybeSingle()
        : { data: null, error: null },
      this.db
        .from("post_moderation")
        .select("*")
        .eq("post_id", data.post_snapshot.id)
        .maybeSingle(),
      data.post_id
        ? this.db
            .from("content_reports")
            .select("id,status,reason,created_at", { count: "exact" })
            .eq("post_id", data.post_id)
            .order("created_at", { ascending: false })
            .limit(20)
        : { data: [], error: null, count: 0 },
    ]);
    if (post.error || moderation.error || related.error)
      databaseError(post.error ?? moderation.error ?? related.error!);
    return {
      ...item,
      post: post.data,
      moderation: moderation.data,
      related: related.data,
      relatedCount: related.count,
      imageUrl: await this.signedImage(
        "progress-photos",
        data.post_snapshot.photo_path,
      ),
      history,
    };
  }

  async audit(query: PageQueryDto) {
    const start = (query.page - 1) * query.pageSize;
    let request = this.db
      .from("admin_action_log")
      .select("*", { count: "exact" });
    if (query.search)
      request = request.ilike("action", `%${escapedSearch(query.search)}%`);
    const { data, error, count } = await request
      .order("created_at", { ascending: false })
      .order("id")
      .range(start, start + query.pageSize - 1);
    if (error) databaseError(error);
    return {
      items: await this.withPeople(data ?? [], "actor_id"),
      total: count ?? 0,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  private async auditFor(type: string, id: string) {
    const { data, error } = await this.db
      .from("admin_action_log")
      .select("*")
      .eq("resource_type", type)
      .eq("resource_id", id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) databaseError(error);
    return this.withPeople(data ?? [], "actor_id");
  }

  reviewFood(adminId: string, id: string, dto: ReviewAdminFoodDto) {
    return this.foods.reviewSubmission(adminId, id, dto);
  }

  private async rpc(name: string, args: Record<string, unknown>) {
    const { data, error } = await this.db.rpc(name, args);
    if (error) databaseError(error);
    return data;
  }

  reviewContent(adminId: string, id: string, dto: ReviewContentReportDto) {
    return this.rpc("admin_review_content_report", {
      p_admin_id: adminId,
      p_id: id,
      p_status: dto.status,
      p_public_response: dto.publicResponse ?? null,
      p_internal_notes: dto.internalNotes ?? null,
      p_expected_updated_at: dto.expectedUpdatedAt,
      p_hide_post: dto.hidePost ?? false,
      p_expected_post_updated_at: dto.expectedPostUpdatedAt ?? null,
    });
  }

  reviewBug(adminId: string, id: string, dto: ReviewBugDto) {
    return this.rpc("admin_review_bug", {
      p_admin_id: adminId,
      p_id: id,
      p_status: dto.status,
      p_priority: dto.priority,
      p_public_response: dto.publicResponse ?? null,
      p_internal_notes: dto.internalNotes ?? null,
      p_expected_updated_at: dto.expectedUpdatedAt,
    });
  }

  moderatePost(adminId: string, id: string, dto: ModeratePostDto) {
    return this.rpc("admin_moderate_post", {
      p_admin_id: adminId,
      p_id: id,
      p_hidden: dto.hidden,
      p_reason: dto.reason,
      p_expected_updated_at: dto.expectedUpdatedAt ?? null,
    });
  }
}
