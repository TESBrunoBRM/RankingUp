import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { ProgressService } from "../progress/progress.service";
import { SupabaseService } from "../supabase/supabase.service";
import { PageQueryDto } from "../admin/admin.dto";

describe("ReportsService", () => {
  const post = {
    id: "post",
    user_id: "author",
    visibility: "public",
    published_at: "2026-10-23T00:00:00Z",
  };
  const progress = { visiblePost: jest.fn() };
  const storage = { info: jest.fn() };
  const chain: any = {};
  for (const method of ["select", "eq", "order", "range", "insert"])
    chain[method] = jest.fn(() => chain);
  chain.single = jest.fn();
  chain.then = (resolve: (value: unknown) => void) =>
    resolve({ data: [], count: 0, error: null });
  const db = {
    from: jest.fn(() => chain),
    storage: { from: jest.fn(() => storage) },
  };
  let service: ReportsService;
  beforeEach(() => {
    jest.clearAllMocks();
    progress.visiblePost.mockResolvedValue(post);
    chain.single.mockResolvedValue({ data: { id: "report" }, error: null });
    service = new ReportsService(
      { serviceClient: db } as unknown as SupabaseService,
      progress as unknown as ProgressService,
    );
  });
  it("does not accept reports of posts the user cannot view", async () => {
    progress.visiblePost.mockRejectedValue(new NotFoundException());
    await expect(
      service.createPost("viewer", { postId: "post", reason: "spam" }),
    ).rejects.toThrow(NotFoundException);
    expect(db.from).not.toHaveBeenCalled();
  });
  it("does not accept reports of own posts", async () => {
    await expect(
      service.createPost("author", { postId: "post", reason: "spam" }),
    ).rejects.toThrow(BadRequestException);
    expect(db.from).not.toHaveBeenCalled();
  });
  it("maps an existing open report to a clear conflict", async () => {
    chain.single.mockResolvedValue({ data: null, error: { code: "23505" } });
    await expect(
      service.createPost("viewer", { postId: "post", reason: "spam" }),
    ).rejects.toThrow(ConflictException);
  });
  it("takes the post snapshot from the server-authorized record", async () => {
    await service.createPost("viewer", {
      postId: "post",
      reason: "spam",
      details: "Context",
    });
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ submitted_by: "viewer", post_snapshot: post }),
    );
    expect(chain.select).toHaveBeenCalledWith(
      expect.not.stringContaining("internal_notes"),
    );
  });
  it.each(["posts", "bugs", "foods"] as const)(
    "projects only public information and limits %s to the authenticated owner",
    async (kind) => {
      await service.mine(kind, "viewer", new PageQueryDto());
      expect(chain.eq).toHaveBeenCalledWith("submitted_by", "viewer");
      const columns = chain.select.mock.calls[0][0];
      expect(columns).not.toMatch(
        /internal_notes|reviewed_by|post_snapshot|submitted_by/,
      );
    },
  );
  const bug = {
    title: "Save error",
    description: "The save button does not work",
    steps: "Tap save",
    appVersion: "1.0.0",
    platform: "android",
  };
  it("rejects another user screenshot before accessing Storage", async () => {
    await expect(
      service.createBug("viewer", { ...bug, screenshotPath: "other/test.jpg" }),
    ).rejects.toThrow(ForbiddenException);
    expect(storage.info).not.toHaveBeenCalled();
  });
  it("rejects a missing screenshot", async () => {
    storage.info.mockResolvedValue({
      data: null,
      error: { message: "missing" },
    });
    await expect(
      service.createBug("viewer", {
        ...bug,
        screenshotPath: "viewer/test.jpg",
      }),
    ).rejects.toThrow(BadRequestException);
    expect(chain.insert).not.toHaveBeenCalled();
  });
});
