// import { Injectable, NotFoundException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository, Between } from 'typeorm';
// import { Invoice, InvoiceStatus } from './entities/invoice.entity';
// import { Order } from '../orders/entities/order.entity';
// // import { CreateInvoiceDto } from './dto/create-invoice.dto';

// @Injectable()
// export class InvoicesService {
//   constructor(
//     @InjectRepository(Invoice)
//     private invoicesRepository: Repository<Invoice>,
//     @InjectRepository(Order)
//     private ordersRepository: Repository<Order>,
//   ) {}

//   // ✅ La méthode manquante
//   async generateFromOrder(orderId: string): Promise<Invoice> {
//     const order = await this.ordersRepository.findOne({
//       where: { id: orderId },
//       relations: ['items', 'customer'],
//     });

//     if (!order) {
//       throw new NotFoundException(`Commande avec l'ID ${orderId} non trouvée`);
//     }

//     // Vérifier si une facture existe déjà
//     const existingInvoice = await this.invoicesRepository.findOne({
//       where: { orderId },
//     });

//     if (existingInvoice) {
//       return existingInvoice;
//     }

//     // Générer le numéro de facture
//     const invoiceNumber = await this.generateInvoiceNumber();

//     // Préparer les items pour la facture
//     const items = order.items.map((item) => ({
//       productId: item.productId,
//       productName: item.productName,
//       productSku: item.productSku,
//       quantity: item.quantity,
//       unitPrice: item.unitPrice,
//       totalPrice: item.totalPrice,
//       taxRate: item.taxRate,
//       taxAmount: item.taxAmount,
//     }));

//     // Calculer la date d'échéance (J+30 par défaut)
//     const issuedAt = new Date();
//     const dueDate = new Date();
//     dueDate.setDate(dueDate.getDate() + 30);

//     // Créer la facture
//     const invoice = this.invoicesRepository.create({
//       invoiceNumber,
//       orderId: order.id,
//       orderNumber: order.orderNumber,
//       customerId: order.customerId,
//       customerName: order.customerName,
//       customerEmail: order.customerEmail,
//       customerAddress: order.shippingAddress,
//       items,
//       subtotal: order.subtotal,
//       taxTotal: order.taxTotal,
//       total: order.total,
//       status: InvoiceStatus.ISSUED,
//       issuedAt,
//       dueDate,
//       paymentMethod: order.paymentMethod,
//     });

//     return await this.invoicesRepository.save(invoice);
//   }

//   private async generateInvoiceNumber(): Promise<string> {
//     const date = new Date();
//     const year = date.getFullYear();
//     const month = (date.getMonth() + 1).toString().padStart(2, '0');

//     // Compter les factures du mois
//     const startOfMonth = new Date(year, date.getMonth(), 1);
//     const endOfMonth = new Date(year, date.getMonth() + 1, 0, 23, 59, 59);

//     const count = await this.invoicesRepository.count({
//       where: {
//         createdAt: Between(startOfMonth, endOfMonth),
//       },
//     });

//     const sequence = (count + 1).toString().padStart(4, '0');
//     return `FAC-${year}${month}-${sequence}`;
//   }

//   // Autres méthodes CRUD...
//   async findAll(page = 1, pageSize = 20) {
//     const [data, total] = await this.invoicesRepository.findAndCount({
//       skip: (page - 1) * pageSize,
//       take: pageSize,
//       order: { createdAt: 'DESC' },
//       relations: ['order'],
//     });

//     return {
//       data,
//       total,
//       page,
//       pageSize,
//       totalPages: Math.ceil(total / pageSize),
//     };
//   }

//   async findOne(id: string): Promise<Invoice> {
//     const invoice = await this.invoicesRepository.findOne({
//       where: { id },
//       relations: ['order'],
//     });

//     if (!invoice) {
//       throw new NotFoundException(`Facture avec l'ID ${id} non trouvée`);
//     }

//     return invoice;
//   }
// }
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, FindOptionsWhere, EntityManager, ObjectLiteral } from 'typeorm';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { Order } from '../orders/entities/order.entity';
import { CreditNote } from './entities/credit-note.entity';
import { InvoiceNumberingConfig } from './entities/invoice-numbering-config.entity';
import { InvoiceFilterDto } from './dto/invoice-filter.dto';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import {
  PaginatedResponse,
  PaginatedResponseBuilder,
} from '../../common/interfaces/paginated-response.interface';
import { TenantService } from '../../common/tenant/tenant.service';
import { AbstractTenantService } from '../../common/tenant/abstract-tenant.service';

@Injectable()
export class InvoicesService extends AbstractTenantService<Invoice> {
  constructor(
    @InjectRepository(Invoice)
    private invoicesRepository: Repository<Invoice>,
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(CreditNote)
    private creditNotesRepository: Repository<CreditNote>,
    @InjectRepository(InvoiceNumberingConfig)
    private configRepository: Repository<InvoiceNumberingConfig>,
    tenantService: TenantService,
  ) {
    super(invoicesRepository, tenantService, 'Invoice');
  }

  // Proxied secondary repositories
  private get ordersRepo() { return this.tenantRepo(this.ordersRepository); }
  private get creditNotesRepo() { return this.tenantRepo(this.creditNotesRepository); }
  private get configRepo() { return this.tenantRepo(this.configRepository); }

  private getRepo<T extends ObjectLiteral>(baseRepo: Repository<T>, manager?: EntityManager): Repository<T> {
    const repo = manager ? manager.getRepository(baseRepo.target) : baseRepo;
    return this.tenantRepo(repo as Repository<T>);
  }

  // ============ GÉNÉRATION DE FACTURE ============

  async generateFromOrder(orderId: string, manager?: EntityManager): Promise<Invoice> {
    const repoOrder = this.getRepo(this.ordersRepository, manager);
    const repoInvoice = this.getRepo(this.invoicesRepository, manager);

    const order = await repoOrder.findOne({
      where: { id: orderId },
      relations: ['items', 'customer'],
    });

    if (!order) {
      throw new NotFoundException(`Commande avec l'ID ${orderId} non trouvée`);
    }

    // Vérifier si une facture existe déjà
    const existingInvoice = await repoInvoice.findOne({
      where: { orderId },
    });

    if (existingInvoice) {
      return existingInvoice;
    }

    // Générer le numéro de facture
    const invoiceNumber = await this.generateInvoiceNumber(manager);

    // Préparer les items pour la facture
    const items = order.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      productSku: item.productSku,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
      total: Number(item.totalPrice), // Map both for frontend compatibility
      taxRate: item.taxRate,
      taxAmount: item.taxAmount,
    }));

    // Calculer la date d'échéance (J+30 par défaut)
    const issuedAt = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Créer la facture
    const invoice = repoInvoice.create({
      invoiceNumber,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerName: order.customerName || 'Client comptoir',
      customerEmail: order.customerEmail,
      customerAddress: order.shippingAddress,
      items,
      subtotal: order.subtotal,
      taxTotal: order.taxTotal,
      discountTotal: order.discountTotal || 0,
      total: order.total,
      status: InvoiceStatus.ISSUED,
      issuedAt,
      dueDate,
      paymentMethod: order.paymentMethod,
      vendorId: this.tenantService.getVendorId() || undefined,
    });

    return await repoInvoice.save(invoice);
  }

  private async generateInvoiceNumber(manager?: EntityManager): Promise<string> {
    const repoConfig = this.getRepo(this.configRepository, manager);
    
    let config = await repoConfig.findOne({ where: {} });
    if (!config) {
      config = repoConfig.create({
        vendorId: this.tenantService.getVendorId() || undefined,
      });
      await repoConfig.save(config);
    }

    const now = new Date();
    let num = config.prefix;
    if (config.includeYear) num += config.separator + now.getFullYear();
    if (config.includeMonth) num += String(now.getMonth() + 1).padStart(2, '0');
    num += config.separator + String(config.nextSequence).padStart(config.padLength, '0');

    // Increment sequence
    config.nextSequence++;
    await repoConfig.save(config);

    return num;
  }

  async getNumberingConfig(): Promise<InvoiceNumberingConfig> {
    let config = await this.configRepo.findOne({ where: {} });
    if (!config) {
      config = this.configRepo.create({
        vendorId: this.tenantService.getVendorId() || undefined,
      });
      await this.configRepo.save(config);
    }
    return config;
  }

  async updateNumberingConfig(data: Partial<InvoiceNumberingConfig>): Promise<InvoiceNumberingConfig> {
    let config = await this.getNumberingConfig();
    Object.assign(config, data);
    return await this.configRepo.save(config);
  }

  // ============ LISTE PAGINÉE ============

  async findAll(
    filterDto: InvoiceFilterDto,
  ): Promise<PaginatedResponse<InvoiceResponseDto>> {
    const {
      page = 1,
      pageSize = 20,
      status,
      search,
      startDate,
      endDate,
      customerId,
    } = filterDto;

    const where: FindOptionsWhere<Invoice> = {};

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (search) {
      // Recherche par numéro de facture ou nom du client
      const searchWhere = [
        { invoiceNumber: Like(`%${search}%`) },
        { customerName: Like(`%${search}%`) },
        { orderNumber: Like(`%${search}%`) },
      ];

      const [data, total] = await this.repo.findAndCount({
        where: searchWhere,
        skip: (page - 1) * pageSize,
        take: pageSize,
        order: { createdAt: 'DESC' },
        relations: ['order'],
      });

      return PaginatedResponseBuilder.build(
        this.mapToResponseDtos(data),
        total,
        page,
        pageSize,
      );
    }

    if (startDate && endDate) {
      where.issuedAt = Between(new Date(startDate), new Date(endDate));
    }

    const [data, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
      relations: ['order'],
    });

    return PaginatedResponseBuilder.build(
      this.mapToResponseDtos(data),
      total,
      page,
      pageSize,
    );
  }

  // ============ DÉTAIL FACTURE ============

  async findOne(id: string): Promise<InvoiceResponseDto> {
    const invoice = await this.repo.findOne({
      where: { id },
      relations: ['order'],
    });

    if (!invoice) {
      throw new NotFoundException(`Facture avec l'ID ${id} non trouvée`);
    }

    return this.mapToResponseDto(invoice);
  }

  // ============ FACTURE PAR COMMANDE ============

  async findByOrderId(orderId: string): Promise<InvoiceResponseDto> {
    const invoice = await this.repo.findOne({
      where: { orderId },
      relations: ['order'],
    });

    if (!invoice) {
      throw new NotFoundException(
        `Aucune facture trouvée pour la commande ${orderId}`,
      );
    }

    return this.mapToResponseDto(invoice);
  }

  async findByOrderNumber(orderNumber: string): Promise<InvoiceResponseDto> {
    const invoice = await this.repo.findOne({
      where: { orderNumber },
      relations: ['order'],
    });

    if (!invoice) {
      throw new NotFoundException(
        `Aucune facture trouvée pour la commande ${orderNumber}`,
      );
    }

    return this.mapToResponseDto(invoice);
  }

  // ============ CHANGEMENT DE STATUT ============

  async updateStatus(
    id: string,
    updateStatusDto: UpdateInvoiceStatusDto,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.repo.findOne({
      where: { id },
    });

    if (!invoice) {
      throw new NotFoundException(`Facture avec l'ID ${id} non trouvée`);
    }

    // Validation des transitions de statut
    this.validateStatusTransition(invoice.status, updateStatusDto.status);

    // Mettre à jour le statut
    invoice.status = updateStatusDto.status;

    // Si le statut passe à "paid", enregistrer la date de paiement
    if (updateStatusDto.status === InvoiceStatus.PAID && !invoice.paidAt) {
      invoice.paidAt = new Date();
    }

    // Ajouter des notes si fournies
    if (updateStatusDto.notes) {
      invoice.notes = invoice.notes
        ? `${invoice.notes}\n${new Date().toISOString()}: ${updateStatusDto.notes}`
        : `${new Date().toISOString()}: ${updateStatusDto.notes}`;
    }

    const updatedInvoice = await this.repo.save(invoice);
    return this.mapToResponseDto(updatedInvoice);
  }

  private validateStatusTransition(
    currentStatus: InvoiceStatus,
    newStatus: InvoiceStatus,
  ): void {
    const validTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
      [InvoiceStatus.DRAFT]: [InvoiceStatus.ISSUED, InvoiceStatus.CANCELLED],
      [InvoiceStatus.ISSUED]: [
        InvoiceStatus.PAID,
        InvoiceStatus.CANCELLED,
        InvoiceStatus.OVERDUE,
      ],
      [InvoiceStatus.PAID]: [InvoiceStatus.CANCELLED], // Remboursement
      [InvoiceStatus.CANCELLED]: [], // Pas de transition depuis annulé
      [InvoiceStatus.OVERDUE]: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Transition de statut invalide: ${currentStatus} → ${newStatus}`,
      );
    }
  }

  // ============ STATISTIQUES ============

  async getInvoiceStats(period?: { start: Date; end: Date }) {
    const where: any = {};

    if (period) {
      where.issuedAt = Between(period.start, period.end);
    }

    const invoices = await this.repo.find({ where });

    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce(
      (sum, inv) => sum + Number(inv.total),
      0,
    );
    const paidAmount = invoices
      .filter((inv) => inv.status === InvoiceStatus.PAID)
      .reduce((sum, inv) => sum + Number(inv.total), 0);
    const overdueAmount = invoices
      .filter((inv) => inv.status === InvoiceStatus.OVERDUE)
      .reduce((sum, inv) => sum + Number(inv.total), 0);

    const byStatus = {
      [InvoiceStatus.DRAFT]: invoices.filter(
        (inv) => inv.status === InvoiceStatus.DRAFT,
      ).length,
      [InvoiceStatus.ISSUED]: invoices.filter(
        (inv) => inv.status === InvoiceStatus.ISSUED,
      ).length,
      [InvoiceStatus.PAID]: invoices.filter(
        (inv) => inv.status === InvoiceStatus.PAID,
      ).length,
      [InvoiceStatus.CANCELLED]: invoices.filter(
        (inv) => inv.status === InvoiceStatus.CANCELLED,
      ).length,
      [InvoiceStatus.OVERDUE]: invoices.filter(
        (inv) => inv.status === InvoiceStatus.OVERDUE,
      ).length,
    };

    return {
      totalInvoices,
      totalAmount,
      paidAmount,
      unpaidAmount: totalAmount - paidAmount,
      overdueAmount,
      byStatus,
    };
  }

  // ============ UTILITAIRES ============

  async checkOverdueInvoices(): Promise<number> {
    const today = new Date();

    const overdueInvoices = await this.repo
      .createQueryBuilder('invoice')
      .where('invoice.status = :status', { status: InvoiceStatus.ISSUED })
      .andWhere('invoice.dueDate < :today', { today })
      .getMany();

    if (overdueInvoices.length > 0) {
      // Mettre à jour le statut des factures en retard
      await this.repo.update(
        overdueInvoices.map((inv) => inv.id),
        { status: InvoiceStatus.OVERDUE },
      );
    }

    return overdueInvoices.length;
  }

  async sendInvoiceReminders(): Promise<any> {
    // Logique pour envoyer des rappels de paiement
    // À implémenter avec un service d'email
    const overdueInvoices = await this.repo.find({
      where: { status: InvoiceStatus.OVERDUE },
      relations: ['order'],
    });

    return {
      count: overdueInvoices.length,
      message: `${overdueInvoices.length} rappels de paiement à envoyer`,
    };
  }

  // ============ MAPPERS ============

  // ============ MULTI-CURRENCY ============

  async convertCurrency(id: string, currencyCode: string, rate: number): Promise<InvoiceResponseDto> {
    const invoice = await this.repo.findOne({ where: { id } });
    if (!invoice) throw new NotFoundException('Facture non trouvée');
    
    // We update the invoice with currency info (for record keeping)
    // In a real app, this might be more complex
    await this.repo.update(id, {
       notes: (invoice.notes || '') + `\nConverti en ${currencyCode} (Taux: ${rate})`
    });
    
    return this.findOne(id);
  }

  // ============ EMAIL ============

  async sendByEmail(id: string): Promise<InvoiceResponseDto> {
    const invoice = await this.findOne(id);
    // Simuler l'envoi d'email
    console.log(`Envoi de la facture ${invoice.invoiceNumber} à ${invoice.customerEmail}...`);
    
    // Mettre à jour le statut si c'est un brouillon
    if (invoice.status === InvoiceStatus.DRAFT) {
      await this.updateStatus(id, { status: InvoiceStatus.ISSUED });
    }
    
    return this.findOne(id);
  }

  // ============ AVOIRS (CREDIT NOTES) ============

  async getCreditNotes(invoiceId?: string): Promise<CreditNote[]> {
    const where: any = {};
    if (invoiceId) where.invoiceId = invoiceId;
    return await this.creditNotesRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async createCreditNote(data: any): Promise<CreditNote> {
    // Generate Credit Note Number
    let config = await this.getNumberingConfig();
    const now = new Date();
    const creditNoteNumber = `${config.creditNotePrefix}-${now.getFullYear()}${String(now.getMonth()+1).padStart(2, '0')}-${String(config.nextCreditNoteSequence).padStart(4, '0')}`;
    
    config.nextCreditNoteSequence++;
    await this.configRepo.save(config);

    const creditNote = this.creditNotesRepo.create({
      vendorId: this.tenantService.getVendorId() || undefined,
    });
    Object.assign(creditNote, data);
    creditNote.creditNoteNumber = creditNoteNumber;

    return await this.creditNotesRepo.save(creditNote);
  }

  // ============ MAPPERS ============

  private mapToResponseDto(invoice: Invoice): InvoiceResponseDto {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      orderId: invoice.orderId,
      orderNumber: invoice.orderNumber,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail,
      customerAddress: invoice.customerAddress,
      items: invoice.items.map(item => ({
        ...item,
        total: Number(item.totalPrice || item.total) // Ensure 'total' exists for frontend
      })),
      subtotal: Number(invoice.subtotal),
      taxTotal: Number(invoice.taxTotal),
      discountTotal: Number(invoice.discountTotal),
      total: Number(invoice.total),
      status: invoice.status,
      issuedAt: invoice.issuedAt,
      dueDate: invoice.dueDate,
      paidAt: invoice.paidAt,
      notes: invoice.notes,
      paymentMethod: invoice.paymentMethod,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }

  private mapToResponseDtos(invoices: Invoice[]): InvoiceResponseDto[] {
    return invoices.map((invoice) => this.mapToResponseDto(invoice));
  }
}
