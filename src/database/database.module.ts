import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');

        // Méthode 1 : Connexion via DATABASE_URL (recommandé par Supabase)
        if (databaseUrl) {
          console.log('🔗 Connecting to database via DATABASE_URL');
          return {
            type: 'postgres' as const,
            url: databaseUrl,
            entities: [__dirname + '/../**/*.entity{.ts,.js}'],
            synchronize: configService.get('DB_SYNCHRONIZE') === 'true'
              || configService.get('NODE_ENV') !== 'production',
            logging: configService.get('NODE_ENV') === 'development',
            logger: 'advanced-console' as const,
            ssl: { rejectUnauthorized: false },
            poolSize: 5,
            connectTimeoutMS: 15000,
            retryAttempts: 3,
            retryDelay: 3000,
            migrationsRun: false,
            migrationsTableName: 'migrations',
            extra: {
              // Nécessaire pour le pooler Supabase (PgBouncer)
              pgbouncer: true,
            },
          };
        }

        // Méthode 2 : Connexion via variables individuelles (fallback)
        const password = configService.get('DB_PASSWORD', 'postgres');
        console.log('🔗 Connecting to database via individual DB_* variables');
        return {
          type: 'postgres' as const,
          host: configService.get('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get('DB_USERNAME', 'postgres'),
          password: String(password), // Force en string pour éviter l'erreur SASL
          database: configService.get('DB_DATABASE', 'nexaflow'),
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: configService.get('DB_SYNCHRONIZE') === 'true'
            || configService.get('NODE_ENV') !== 'production',
          logging: configService.get('NODE_ENV') === 'development',
          logger: 'advanced-console' as const,
          poolSize: 10,
          connectTimeoutMS: 10000,
          retryAttempts: 3,
          retryDelay: 3000,
          ssl:
            configService.get('NODE_ENV') === 'production'
              ? { rejectUnauthorized: false }
              : false,
          migrationsRun: false,
          migrationsTableName: 'migrations',
          cache: {
            type: 'database' as const,
            tableName: 'query_result_cache',
            duration: 60000,
          },
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
