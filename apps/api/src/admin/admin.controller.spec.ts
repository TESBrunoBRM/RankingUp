import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { SupabaseService } from "../supabase/supabase.service";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { AdminGuard } from "../auth/admin.guard";

describe("Admin HTTP authorization and validation", () => {
  let app: INestApplication;
  let base: string;
  const service = {
    summary: jest.fn(() => ({ pendingFoods: 2 })),
    list: jest.fn(() => ({ items: [], total: 0 })),
    detail: jest.fn(),
    audit: jest.fn(),
    reviewFood: jest.fn(),
    reviewContent: jest.fn(),
    reviewBug: jest.fn(),
    moderatePost: jest.fn(),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: service },
        AdminGuard,
        SupabaseAuthGuard,
        {
          provide: SupabaseService,
          useValue: {
            getUserFromToken: jest.fn(async (token: string) =>
              token === "invalid"
                ? null
                : {
                    id: "u1",
                    email: "admin@example.test",
                    role: token === "admin" ? "admin" : "user",
                  },
            ),
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.listen(0, "127.0.0.1");
    base = await app.getUrl();
  });
  afterAll(async () => app.close());
  const id = "00000000-0000-4000-8000-000000000001";
  const endpoints = [
    ["GET", "me"],
    ["GET", "summary"],
    ["GET", "audit-log"],
    ...["food-submissions", "content-reports", "bug-reports"].flatMap(
      (resource) => [
        ["GET", resource],
        ["GET", `${resource}/${id}`],
        ["PATCH", `${resource}/${id}`],
      ],
    ),
    ["PATCH", `posts/${id}/moderation`],
  ];
  it.each(endpoints)(
    "rejects non-admin %s %s before handler execution",
    async (method, path) => {
      const response = await fetch(`${base}/v1/admin/${path}`, {
        method,
        headers: {
          Authorization: "Bearer user",
          "Content-Type": "application/json",
        },
        ...(method === "PATCH" ? { body: "{}" } : {}),
      });
      expect(response.status).toBe(403);
    },
  );
  it("rejects missing and invalid sessions", async () => {
    expect((await fetch(`${base}/v1/admin/me`)).status).toBe(401);
    expect(
      (
        await fetch(`${base}/v1/admin/me`, {
          headers: { Authorization: "Bearer invalid" },
        })
      ).status,
    ).toBe(401);
  });
  it("serves real administrative data after trusted role validation", async () => {
    const response = await fetch(`${base}/v1/admin/summary`, {
      headers: { Authorization: "Bearer admin" },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ pendingFoods: 2 });
  });
  it("rejects string booleans and unrecognized fields for moderation", async () => {
    for (const body of [
      { hidden: "false", reason: "Valid reason" },
      { hidden: true, reason: "Valid reason", actorId: "spoof" },
    ]) {
      const response = await fetch(`${base}/v1/admin/posts/${id}/moderation`, {
        method: "PATCH",
        headers: {
          Authorization: "Bearer admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      expect(response.status).toBe(400);
    }
    expect(service.moderatePost).not.toHaveBeenCalled();
  });
  it("validates nested food corrections and requires concurrency information", async () => {
    const response = await fetch(`${base}/v1/admin/food-submissions/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "approved",
        reviewNote: "Revisado",
        corrections: { calories: -10 },
      }),
    });
    expect(response.status).toBe(400);
    expect(service.reviewFood).not.toHaveBeenCalled();
  });
  it("bounds pagination", async () => {
    expect(
      (
        await fetch(`${base}/v1/admin/food-submissions?pageSize=1000`, {
          headers: { Authorization: "Bearer admin" },
        })
      ).status,
    ).toBe(400);
  });
});
