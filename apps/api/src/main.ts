import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';

const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net';

/**
 * `public/minigame.html` corre dentro de un WebView y carga MediaPipe Pose
 * (JS + wasm) desde jsdelivr, asi que la CSP tiene que dejar pasar ese origen.
 * Si algun dia el minijuego se sirve con assets locales, esto se puede cerrar.
 */
const buildCsp = () => ({
  useDefaults: true,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "'wasm-unsafe-eval'", MEDIAPIPE_CDN],
    scriptSrcElem: ["'self'", "'unsafe-inline'", MEDIAPIPE_CDN],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'blob:'],
    mediaSrc: ["'self'", 'blob:'],
    connectSrc: ["'self'", MEDIAPIPE_CDN],
    workerSrc: ["'self'", 'blob:'],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: null,
  },
});

const resolveCorsOrigin = (rawOrigin: string, isProduction: boolean, logger: Logger) => {
  const origins = rawOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const isWildcard = origins.length === 0 || origins.includes('*');

  if (!isWildcard) return origins;

  if (isProduction) {
    // Un wildcard con credentials:true deja que cualquier web autenticada llame a la API.
    throw new Error(
      'CORS_ORIGIN no puede ser "*" en produccion. Define los origenes permitidos separados por comas.'
    );
  }

  logger.warn('CORS_ORIGIN="*": se permiten todos los origenes (solo aceptable en desarrollo).');
  return true as const;
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');
  const config = app.get(ConfigService);
  const isProduction = (config.get<string>('NODE_ENV') ?? 'development') === 'production';

  // Detras de un reverse proxy (Render, Fly, Nginx...) req.ip es la IP del proxy
  // y el rate limit se compartiria entre todos los usuarios. TRUST_PROXY indica
  // cuantos saltos de proxy hay delante.
  const trustProxy = config.get<string>('TRUST_PROXY');
  if (trustProxy) {
    app.set('trust proxy', Number.isNaN(Number(trustProxy)) ? trustProxy : Number(trustProxy));
  }

  app.use(helmet({
    contentSecurityPolicy: buildCsp(),
    // El WebView del minijuego consume la pagina desde otro origen que el bundle RN.
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  app.useStaticAssets(join(__dirname, '..', 'public'));

  app.enableCors({
    origin: resolveCorsOrigin(config.get<string>('CORS_ORIGIN') ?? '*', isProduction, logger),
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  // Swagger describe toda la superficie de la API: fuera de desarrollo va cerrado
  // salvo que se active explicitamente.
  const swaggerEnabled = !isProduction || config.get<string>('ENABLE_SWAGGER') === 'true';
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('RankingUp API')
      .setDescription('Backend API for RankingUp critical business logic')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));
  } else {
    logger.log('Swagger deshabilitado (NODE_ENV=production y ENABLE_SWAGGER!=true).');
  }

  const port = config.get<number>('PORT') ?? 3001;
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
