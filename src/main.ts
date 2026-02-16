// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
//   await app.listen(process.env.PORT ?? 3003);
// }
// bootstrap();
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import { join } from 'path';
import { port } from './common/variable/global';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ============ GLOBAL CONFIGURATION ============

  // 1. Global prefix pour toutes les routes
  app.setGlobalPrefix('api');

  // 2. Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 3. CORS configuration
  app.enableCors({
    // origin: ['http://localhost:5173', 'http://localhost:3000'],
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // 4. API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // 5. Serve static files (pour les images uploadées)
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  // ============ SWAGGER DOCUMENTATION ============

  const config = new DocumentBuilder()
    .setTitle('NexaFlow API')
    .setDescription('API de gestion commerciale NexaFlow')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('categories', 'Gestion des catégories')
    .addTag('suppliers', 'Gestion des fournisseurs')
    .addTag('products', 'Gestion des produits')
    .addTag('currencies', 'Gestion des devises')
    .addServer('http://localhost:3003', 'Development server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  // SwaggerModule.setup('api/docs', app, document, {
  SwaggerModule.setup(
    `api/${process.env.API_VERSION || 'v1'}/docs`,
    app,
    document,
    {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      customSiteTitle: 'NexaFlow API Documentation',
    },
  );

  // ============ START SERVER ============

  // const port = process.env.PORT || 3003;
  await app.listen(port || process.env.PORT);
  console.log(`🚀 Application is running on: http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api/v1/docs`);
}
bootstrap();
