import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { parseCorsUrls, resolveCorsOrigins } from './shared/config/cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ extended: true, limit: '2mb' }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('CallZen API')
    .setDescription('Real-time sales co-pilot and AI practice prospects')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  const corsOrigins = resolveCorsOrigins({
    nodeEnv: process.env.NODE_ENV,
    corsUrls: parseCorsUrls(process.env.CORS_URLS),
    appUrl: process.env.APP_URL,
    landingUrl: process.env.LANDING_URL,
  });

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Organisation-Id', 'Access-Control-Allow-Origin'],
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  new Logger('Bootstrap').log(`CallZen API listening on port ${port}`);
}
bootstrap();
