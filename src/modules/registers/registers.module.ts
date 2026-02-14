import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistersService } from './registers.service';
import { RegistersController } from './registers.controller';
import { Register } from './entities/register.entity';
import { CashSessionsModule } from '../cash-sessions/cash-sessions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Register]),
    forwardRef(() => CashSessionsModule),
  ],
  controllers: [RegistersController],
  providers: [RegistersService],
  exports: [RegistersService],
})
export class RegistersModule {}
