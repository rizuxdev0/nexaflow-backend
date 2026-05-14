import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { Invoice } from './entities/invoice.entity';
import { Order } from '../orders/entities/order.entity';
import { CreditNote } from './entities/credit-note.entity';
import { InvoiceNumberingConfig } from './entities/invoice-numbering-config.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      Order,
      CreditNote,
      InvoiceNumberingConfig,
    ]),
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
