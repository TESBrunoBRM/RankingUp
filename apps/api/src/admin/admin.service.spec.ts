import { ConflictException } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { SupabaseService } from "../supabase/supabase.service";
import { FoodsService } from "../foods/foods.service";

describe("AdminService", () => {
  it("maps stale revisions to conflicts and sends concurrency values to the atomic RPC", async () => {
    const rpc = jest
      .fn()
      .mockResolvedValue({
        data: null,
        error: { code: "40001", message: "El registro cambió." },
      });
    const service = new AdminService(
      { serviceClient: { rpc } } as unknown as SupabaseService,
      {} as FoodsService,
    );
    await expect(
      service.reviewBug("admin", "bug", {
        status: "resolved",
        priority: "normal",
        publicResponse: "Corregido",
        expectedUpdatedAt: "2026-10-23T00:00:00Z",
      }),
    ).rejects.toThrow(ConflictException);
    expect(rpc).toHaveBeenCalledWith(
      "admin_review_bug",
      expect.objectContaining({
        p_admin_id: "admin",
        p_id: "bug",
        p_expected_updated_at: "2026-10-23T00:00:00Z",
      }),
    );
  });
  it("handles deleted evidence without breaking the review detail", async () => {
    const storage = {
      info: jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: "gone" } }),
      createSignedUrl: jest.fn(),
    };
    const service = new AdminService(
      {
        serviceClient: { storage: { from: () => storage } },
      } as unknown as SupabaseService,
      {} as FoodsService,
    );
    expect(
      await service.signedImage("food-evidence", "removed.jpg"),
    ).toBeNull();
    expect(storage.createSignedUrl).not.toHaveBeenCalled();
  });
});
