// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import { ValidationPipe, VersioningType } from '@nestjs/common';
// import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// import * as express from 'express';
// import { join } from 'path';
// import { port } from './common/variable/global';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);

//   // ============ GLOBAL CONFIGURATION ============

//   // 1. Global prefix pour toutes les routes
//   app.setGlobalPrefix('api');

//   // 2. Validation globale
//   app.useGlobalPipes(
//     new ValidationPipe({
//       whitelist: true,
//       forbidNonWhitelisted: true,
//       transform: true,
//       transformOptions: {
//         enableImplicitConversion: true,
//       },
//     }),
//   );

//   // 3. CORS configuration
//   app.enableCors({
//     // origin: ['http://localhost:5173', 'http://localhost:3000'],
//     origin: '*',
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization'],
//   });

//   // 4. API Versioning
//   app.enableVersioning({
//     type: VersioningType.URI,
//     defaultVersion: '1',
//   });

//   // 5. Serve static files (pour les images uploadées)
//   app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

//   // ============ SWAGGER DOCUMENTATION ============

//   const config = new DocumentBuilder()
//     .setTitle('NexaFlow API')
//     .setDescription('API de gestion commerciale NexaFlow')
//     .setVersion('1.0')
//     .addBearerAuth(
//       {
//         type: 'http',
//         scheme: 'bearer',
//         bearerFormat: 'JWT',
//         name: 'JWT',
//         description: 'Enter JWT token',
//         in: 'header',
//       },
//       'JWT-auth',
//     )
//     .addTag('categories', 'Gestion des catégories')
//     .addTag('suppliers', 'Gestion des fournisseurs')
//     .addTag('products', 'Gestion des produits')
//     .addTag('currencies', 'Gestion des devises')
//     .addServer('http://localhost:3003', 'Development server')
//     .build();

//   const document = SwaggerModule.createDocument(app, config);
//   // SwaggerModule.setup('api/docs', app, document, {
//   SwaggerModule.setup(
//     `api/${process.env.API_VERSION || 'v1'}/docs`,
//     app,
//     document,
//     {
//       swaggerOptions: {
//         persistAuthorization: true,
//         tagsSorter: 'alpha',
//         operationsSorter: 'alpha',
//       },
//       customSiteTitle: 'NexaFlow API Documentation',
//     },
//   );

//   // ============ START SERVER ============

//   // const port = process.env.PORT || 3003;
//   await app.listen(port || process.env.PORT);
//   console.log(`🚀 Application is running on: http://localhost:${port}/api/v1`);
//   console.log(`📚 Swagger documentation: http://localhost:${port}/api/v1/docs`);
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
    .setDescription(
      `
      API de gestion commerciale NexaFlow intégrant la gestion complète de stock, ventes et ecommerce.
      
      ## Informations générales
      Cette API permet de gérer l'ensemble des opérations commerciales de NexaFlow.
      
      ### Fonctionnalités principales
      - Gestion des catégories de produits
      - Gestion des fournisseurs
      - Gestion des produits et stocks
      - Gestion des devises et taux de change
      
      ### Authentification
      L'API utilise l'authentification par Bearer Token (JWT).
      Pour vous authentifier, cliquez sur le bouton "Authorize" en haut et entrez votre token.
      
      ### Codes d'erreur courants
      - \`400 Bad Request\` : Données invalides
      - \`401 Unauthorized\` : Token manquant ou invalide
      - \`403 Forbidden\` : Accès non autorisé
      - \`404 Not Found\` : Ressource non trouvée
      - \`500 Internal Server Error\` : Erreur serveur
    `,
    )
    .setVersion('1.0')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .setContact(
      'Support NexaFlow',
      'https://nexaflow-support.com',
      'support@nexaflow.com',
    )
    .setTermsOfService('https://nexaflow.com/terms')
    .addServer('http://localhost:3003', 'Development server')
    .addServer('https://staging-api.nexaflow.com', 'Staging server')
    .addServer('https://api.nexaflow.com', 'Production server')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'bearer',
      // 'JWT-auth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: "API Key pour l'accès aux services externes",
      },
      'api-key',
    )
    .addTag(
      'categories',
      '📁 Gestion des catégories - CRUD complet des catégories de produits',
    )
    .addTag(
      'suppliers',
      '🏭 Gestion des fournisseurs - Informations et contacts fournisseurs',
    )
    .addTag(
      'products',
      '📦 Gestion des produits - Catalogue produits et gestion des stocks',
    )
    .addTag(
      'currencies',
      '💱 Gestion des devises - Taux de change et conversions',
    )
    .addTag(
      'auth',
      '🔐 Authentification - Inscription, connexion et gestion des tokens',
    )
    .addTag('users', '👥 Gestion des utilisateurs - Profils et permissions')
    .addTag('dashboard', '📊 Tableau de bord - Statistiques et rapports')
    .addTag('health', "❤️ Health check - Monitoring de l'API")
    .addBasicAuth()
    .setExternalDoc(
      'Documentation Postman',
      'https://documenter.getpostman.com/view/nexaflow',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey}_${methodKey}`,
  });

  // Ajout de métadonnées personnalisées à la documentation
  document.info = {
    ...document.info,
    description: `${document.info.description}
    
    ---
    
    **📅 Dernière mise à jour de la documentation :** ${new Date().toLocaleString(
      'fr-FR',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      },
    )}
    
    **🏷️ Version de l'API :** ${process.env.npm_package_version || '1.0.0'}
    
    **📝 Environnement :** ${process.env.NODE_ENV || 'development'}
    
    **⚡ Statut :** ${
      process.env.NODE_ENV === 'production'
        ? '🟢 Production'
        : '🟡 Développement'
    }
    
    **🔧 Build :** ${process.env.BUILD_NUMBER || 'N/A'}
    
    **📊 Nombre total d'endpoints :** ${Object.keys(document.paths).reduce(
      (acc, path) => acc + Object.keys(document.paths[path]).length,
      0,
    )}
    `,
  };

  // Swagger UI avec options améliorées
  SwaggerModule.setup(
    `api/${process.env.API_VERSION || 'v1'}/docs`,
    app,
    document,
    {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        docExpansion: 'list',
        filter: true,
        showRequestDuration: true,
        tryItOutEnabled: true,
        displayRequestDuration: true,
        defaultModelsExpandDepth: 3,
        defaultModelExpandDepth: 3,
        syntaxHighlight: {
          theme: 'monokai',
        },
      },
      customSiteTitle: 'NexaFlow API Documentation',
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info { margin: 30px 0 }
        .swagger-ui .info h1 { font-size: 32px }
        .swagger-ui .response-col_status { width: 100px }
        .swagger-ui .scheme-container { margin-top: 20px }
      `,
      customfavIcon: 'https://nexaflow.com/favicon.ico',
      customJs: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
      ],
      customCssUrl: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
      ],
    },
  );

  // ============ START SERVER ============

  await app.listen(port || process.env.PORT);
  console.log(`🚀 Application is running on: http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api/v1/docs`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🕐 Documentation generated: ${new Date().toLocaleString()}`);
}
bootstrap();
