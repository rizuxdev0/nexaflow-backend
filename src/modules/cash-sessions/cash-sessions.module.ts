import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashSessionsService } from './cash-sessions.service';
import { CashSessionsController } from './cash-sessions.controller';
import { CashSession } from './entities/cash-session.entity';
import { RegistersModule } from '../registers/registers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CashSession]),
    forwardRef(() => RegistersModule), // Pour éviter les dépendances circulaires
  ],
  controllers: [CashSessionsController],
  providers: [CashSessionsService],
  exports: [CashSessionsService],
})
export class CashSessionsModule {}
