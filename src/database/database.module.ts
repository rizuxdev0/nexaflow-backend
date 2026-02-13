// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { ConfigModule, ConfigService } from '@nestjs/config';

// @Module({
//   imports: [
//     TypeOrmModule.forRootAsync({
//       imports: [ConfigModule],
//       inject: [ConfigService],
//       useFactory: (configService: ConfigService) => ({
//         type: 'postgres',
//         host: configService.get('DB_HOST', 'localhost'),
//         port: configService.get('DB_PORT', 5432),
//         username: configService.get('DB_USERNAME', 'postgres'),
//         password: configService.get('DB_PASSWORD', 'postgres'),
//         database: configService.get('DB_DATABASE', 'nexaflow'),
//         entities: [__dirname + '/../**/*.entity{.ts,.js}'],
//         synchronize: configService.get('NODE_ENV') !== 'production',
//         logging: configService.get('NODE_ENV') === 'development',
//       }),
//     }),
//   ],
// })
// export class DatabaseModule {}
import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_DATABASE', 'nexaflow'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],

        // Synchronisation (à désactiver en production)
        synchronize: configService.get('NODE_ENV') !== 'production',

        // Logging
        logging: configService.get('NODE_ENV') === 'development',
        logger: 'advanced-console',

        // Pool configuration
        poolSize: 10,
        connectTimeoutMS: 10000,

        // Retry configuration
        retryAttempts: 3,
        retryDelay: 3000,

        // SSL (pour production)
        ssl:
          configService.get('NODE_ENV') === 'production'
            ? { rejectUnauthorized: false }
            : false,

        // Migration auto-run
        migrationsRun: false,
        migrationsTableName: 'migrations',

        // Cache
        cache: {
          type: 'database',
          tableName: 'query_result_cache',
          duration: 60000, // 1 minute
        },
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
