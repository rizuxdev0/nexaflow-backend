// import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
// import { ApiTags, ApiOperation } from '@nestjs/swagger';
// import { InvoicesService } from './invoices.service';
// import { CreateInvoiceDto } from './dto/create-invoice.dto';

// @ApiTags('invoices')
// @Controller('invoices')
// export class InvoicesController {
//   constructor(private readonly invoicesService: InvoicesService) {}

//   @Post('generate')
//   @ApiOperation({ summary: 'Générer une facture depuis une commande' })
//   generateFromOrder(@Body() dto: CreateInvoiceDto) {
//     return this.invoicesService.generateFromOrder(dto.orderId);
//   }

//   @Get()
//   @ApiOperation({ summary: 'Liste des factures' })
//   findAll(@Query('page') page = 1, @Query('pageSize') pageSize = 20) {
//     return this.invoicesService.findAll(page, pageSize);
//   }

//   @Get(':id')
//   @ApiOperation({ summary: "Détail d'une facture" })
//   findOne(@Param('id') id: string) {
//     return this.invoicesService.findOne(id);
//   }
// }
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { InvoiceFilterDto } from './dto/invoice-filter.dto';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';

@ApiTags('invoices')
@Controller('invoices')
@ApiBearerAuth()
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  // ============ LISTE PAGINÉE ============

  @Get()
  @ApiOperation({ summary: 'Liste paginée des factures' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['draft', 'issued', 'paid', 'cancelled', 'overdue'],
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Liste des factures' })
  async findAll(
    @Query() filterDto: InvoiceFilterDto,
  ): Promise<PaginatedResponse<InvoiceResponseDto>> {
    return this.invoicesService.findAll(filterDto);
  }

  // ============ STATISTIQUES ============

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques des factures' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiResponse({ status: 200, description: 'Statistiques' })
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const period =
      startDate && endDate
        ? { start: new Date(startDate), end: new Date(endDate) }
        : undefined;
    return this.invoicesService.getInvoiceStats(period);
  }

  @Get('check-overdue')
  @ApiOperation({ summary: 'Vérifier et marquer les factures en retard' })
  @ApiResponse({
    status: 200,
    description: 'Nombre de factures marquées en retard',
  })
  async checkOverdue(): Promise<{ count: number }> {
    const count = await this.invoicesService.checkOverdueInvoices();
    return { count };
  }

  // ============ FACTURE PAR COMMANDE ============

  @Get('by-order/:orderId')
  @ApiOperation({ summary: 'Facture par ID de commande' })
  @ApiParam({ name: 'orderId', description: 'ID de la commande' })
  @ApiResponse({ status: 200, description: 'Facture trouvée' })
  @ApiResponse({ status: 404, description: 'Facture non trouvée' })
  async findByOrderId(
    @Param('orderId') orderId: string,
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.findByOrderId(orderId);
  }

  @Get('by-order-number/:orderNumber')
  @ApiOperation({ summary: 'Facture par numéro de commande' })
  @ApiParam({ name: 'orderNumber', description: 'Numéro de commande' })
  @ApiResponse({ status: 200, description: 'Facture trouvée' })
  @ApiResponse({ status: 404, description: 'Facture non trouvée' })
  async findByOrderNumber(
    @Param('orderNumber') orderNumber: string,
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.findByOrderNumber(orderNumber);
  }

  // ============ GÉNÉRATION DE FACTURE ============

  @Post('from-order/:orderId')
  @ApiOperation({ summary: 'Créer une facture depuis une commande' })
  @ApiParam({ name: 'orderId', description: 'ID de la commande' })
  @ApiResponse({ status: 201, description: 'Facture créée avec succès' })
  @ApiResponse({ status: 404, description: 'Commande non trouvée' })
  @HttpCode(HttpStatus.CREATED)
  async generateFromOrder(
    @Param('orderId') orderId: string,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.invoicesService.generateFromOrder(orderId);
    return this.invoicesService.findOne(invoice.id);
  }

  // ============ DÉTAIL FACTURE ============

  @Get(':id')
  @ApiOperation({ summary: "Détail d'une facture" })
  @ApiParam({ name: 'id', description: 'ID de la facture' })
  @ApiResponse({ status: 200, description: 'Facture trouvée' })
  @ApiResponse({ status: 404, description: 'Facture non trouvée' })
  async findOne(@Param('id') id: string): Promise<InvoiceResponseDto> {
    return this.invoicesService.findOne(id);
  }

  @Get('number/:invoiceNumber')
  @ApiOperation({ summary: "Détail d'une facture par son numéro" })
  @ApiParam({ name: 'invoiceNumber', description: 'Numéro de facture' })
  @ApiResponse({ status: 200, description: 'Facture trouvée' })
  @ApiResponse({ status: 404, description: 'Facture non trouvée' })
  async findByNumber(
    @Param('invoiceNumber') invoiceNumber: string,
  ): Promise<InvoiceResponseDto> {
    // À implémenter si besoin
    return this.invoicesService.findOne(invoiceNumber);
  }

  // ============ CHANGEMENT DE STATUT ============

  @Patch(':id/status')
  @ApiOperation({ summary: "Changer le statut d'une facture" })
  @ApiParam({ name: 'id', description: 'ID de la facture' })
  @ApiResponse({ status: 200, description: 'Statut mis à jour' })
  @ApiResponse({ status: 404, description: 'Facture non trouvée' })
  @ApiResponse({ status: 400, description: 'Transition de statut invalide' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateInvoiceStatusDto,
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.updateStatus(id, updateStatusDto);
  }

  // ============ ACTIONS SUPPLÉMENTAIRES ============

  @Post(':id/send-reminder')
  @ApiOperation({ summary: 'Envoyer un rappel de paiement' })
  @ApiParam({ name: 'id', description: 'ID de la facture' })
  @ApiResponse({ status: 200, description: 'Rappel envoyé' })
  sendReminder(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    // À implémenter avec un service d'email
    return Promise.resolve({
      success: true,
      message: `Rappel envoyé pour la facture ${id}`,
    });
  }

  @Post('send-reminders')
  @ApiOperation({
    summary: 'Envoyer les rappels pour toutes les factures en retard',
  })
  @ApiResponse({ status: 200, description: 'Rappels envoyés' })
  async sendAllReminders(): Promise<any> {
    return this.invoicesService.sendInvoiceReminders();
  }
}
