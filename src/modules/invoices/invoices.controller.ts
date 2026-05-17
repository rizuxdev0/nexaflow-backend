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
  UseGuards,
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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('invoices')
@Controller('invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  // ============ LISTE PAGINÉE ============

  @Get()
  @Permissions('invoices.read')
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
  @Permissions('invoices.read')
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
  @Permissions('invoices.read')
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
  @Permissions('invoices.read')
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
  @Permissions('invoices.read')
  @ApiOperation({ summary: 'Facture par numéro de commande' })
  @ApiParam({ name: 'orderNumber', description: 'Numéro de commande' })
  @ApiResponse({ status: 200, description: 'Facture trouvée' })
  @ApiResponse({ status: 404, description: 'Facture non trouvée' })
  async findByOrderNumber(
    @Param('orderNumber') orderNumber: string,
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.findByOrderNumber(orderNumber);
  }

  // ============ NUMBERING CONFIG ============

  @Get('config/numbering')
  @Permissions('invoices.read')
  @ApiOperation({ summary: 'Récupérer la configuration de numérotation' })
  getNumberingConfig() {
    return this.invoicesService.getNumberingConfig();
  }

  @Patch('config/numbering')
  @Permissions('invoices.update')
  @ApiOperation({ summary: 'Mettre à jour la configuration de numérotation' })
  updateNumberingConfig(@Body() data: any) {
    return this.invoicesService.updateNumberingConfig(data);
  }

  // ============ CREDIT NOTES ============

  @Get('credit-notes')
  @Permissions('invoices.read')
  @ApiOperation({ summary: 'Liste des avoirs' })
  getCreditNotes(@Query('invoiceId') invoiceId?: string) {
    return this.invoicesService.getCreditNotes(invoiceId);
  }

  @Post('credit-notes')
  @Permissions('invoices.create')
  @ApiOperation({ summary: 'Créer un avoir' })
  createCreditNote(@Body() data: any) {
    return this.invoicesService.createCreditNote(data);
  }

  // ============ GÉNÉRATION DE FACTURE ============

  @Post('from-order/:orderId')
  @Permissions('invoices.create')
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
  @Permissions('invoices.read')
  @ApiOperation({ summary: "Détail d'une facture" })
  @ApiParam({ name: 'id', description: 'ID de la facture' })
  @ApiResponse({ status: 200, description: 'Facture trouvée' })
  @ApiResponse({ status: 404, description: 'Facture non trouvée' })
  async findOne(@Param('id') id: string): Promise<InvoiceResponseDto> {
    return this.invoicesService.findOne(id);
  }

  @Get('number/:invoiceNumber')
  @Permissions('invoices.read')
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
  @Permissions('invoices.update')
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

  @Post(':id/send-email')
  @Permissions('invoices.update')
  @ApiOperation({ summary: 'Envoyer la facture par email' })
  @ApiParam({ name: 'id', description: 'ID de la facture' })
  sendByEmail(@Param('id') id: string) {
    return this.invoicesService.sendByEmail(id);
  }

  @Patch(':id/convert')
  @Permissions('invoices.update')
  @ApiOperation({ summary: 'Convertir la devise de la facture' })
  @ApiParam({ name: 'id', description: 'ID de la facture' })
  convertCurrency(
    @Param('id') id: string,
    @Body() data: { currencyCode: string; rate: number },
  ) {
    return this.invoicesService.convertCurrency(id, data.currencyCode, data.rate);
  }

  // ============ ACTIONS SUPPLÉMENTAIRES ============

  @Post(':id/send-reminder')
  @Permissions('invoices.update')
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
  @Permissions('invoices.update')
  @ApiOperation({
    summary: 'Envoyer les rappels pour toutes les factures en retard',
  })
  @ApiResponse({ status: 200, description: 'Rappels envoyés' })
  async sendAllReminders(): Promise<any> {
    return this.invoicesService.sendInvoiceReminders();
  }
}
