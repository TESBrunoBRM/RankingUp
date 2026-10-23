import type { NestExpressApplication } from "@nestjs/platform-express";
import type { ConfigService } from "@nestjs/config";
import { existsSync } from "fs";
import { join } from "path";
import helmet from "helmet";
import { static as serveStatic, type Express } from "express";

export function configureAdminWeb(
  app: NestExpressApplication,
  config: ConfigService,
) {
  const directory = join(__dirname, "..", "..", "public", "admin");
  const supabaseUrl = config.get<string>("SUPABASE_URL")!;
  const supabaseOrigin = new URL(supabaseUrl).origin;
  app.use(
    "/admin",
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          scriptSrcElem: ["'self'"],
          styleSrc: ["'self'"],
          fontSrc: ["'self'"],
          imgSrc: ["'self'", supabaseOrigin, "data:"],
          connectSrc: ["'self'", supabaseOrigin],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: null,
        },
      },
    }),
  );
  const adapter = app.getHttpAdapter().getInstance() as Express;
  adapter.get("/admin/config.json", (_request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.json({
      supabaseUrl,
      anonKey: config.get<string>("SUPABASE_ANON_KEY"),
    });
  });
  app.use("/admin", serveStatic(directory, { index: false }));
  adapter.get(["/admin", "/admin/*"], (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    if (request.path.startsWith("/admin/assets/"))
      return response.status(404).end();
    const adminOrigin = config.get<string>("ADMIN_ORIGIN");
    if (adminOrigin)
      return response.redirect(
        302,
        `${new URL(adminOrigin).origin}/#${request.path.slice("/admin".length) || "/"}`,
      );
    const index = join(directory, "index.html");
    if (!existsSync(index))
      return response
        .status(503)
        .json({
          message: "Configura ADMIN_ORIGIN con la URL del panel independiente.",
        });
    return response.sendFile(index);
  });
}
