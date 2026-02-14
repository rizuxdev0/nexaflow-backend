import {
  Controller,
  Get,
  Post,
  Body,
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
import { CashSessionsService } from './cash-sessions.service';
import { OpenSessionDto } from './dto/open-session.dto';
import { CloseSessionDto } from './dto/close-session.dto';
// import { RecordPaymentDto } from './dto/record-payment.dto';
import { CashSession } from './entities/cash-session.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';

@ApiTags('cash-sessions')
@Controller('cash-sessions')
@ApiBearerAuth()
export class CashSessionsController {
  constructor(private readonly cashSessionsService: CashSessionsService) {}

  @Post('open')
  @ApiOperation({ summary: 'Ouvrir une session de caisse' })
  @ApiResponse({ status: 201, description: 'Session ouverte avec succès' })
  @ApiResponse({ status: 409, description: 'Session déjà ouverte' })
  @HttpCode(HttpStatus.CREATED)
  openSession(
    @Body() openSessionDto: OpenSessionDto,
    // À remplacer par @CurrentUser() quand l'auth sera implémentée
    @Query('userId') userId: string,
  ): Promise<CashSession> {
    return this.cashSessionsService.openSession(
      openSessionDto,
      userId || 'system',
    );
  }

  @Get()
  @ApiOperation({ summary: 'Liste paginée des sessions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'registerId', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['open', 'closed', 'suspended'],
  })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiResponse({ status: 200, description: 'Liste des sessions' })
  findAll(
    @Query() paginationDto: PaginationDto,
    @Query('registerId') registerId?: string,
    @Query('status') status?: any,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ): Promise<PaginatedResponse<CashSession>> {
    return this.cashSessionsService.findAll(
      paginationDto.page,
      paginationDto.pageSize,
      registerId,
      status,
      startDate,
      endDate,
    );
  }

  @Get('daily-summary')
  @ApiOperation({ summary: 'Résumé journalier des sessions' })
  @ApiQuery({ name: 'date', required: false, type: Date })
  @ApiResponse({ status: 200, description: 'Résumé journalier' })
  getDailySummary(@Query('date') date?: Date): Promise<any> {
    return this.cashSessionsService.getDailySummary(
      date ? new Date(date) : new Date(),
    );
  }

  @Get('active/:registerId')
  @ApiOperation({ summary: "Session active d'une caisse" })
  @ApiParam({ name: 'registerId', description: 'ID de la caisse' })
  @ApiResponse({ status: 200, description: 'Session active trouvée' })
  @ApiResponse({ status: 404, description: 'Aucune session active' })
  findActiveByRegister(
    @Param('registerId') registerId: string,
  ): Promise<CashSession> {
    return this.cashSessionsService.findActiveByRegister(registerId);
  }

  @Get('register/:registerId')
  @ApiOperation({ summary: "Sessions d'une caisse" })
  @ApiParam({ name: 'registerId', description: 'ID de la caisse' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiResponse({ status: 200, description: 'Liste des sessions de la caisse' })
  getByRegister(
    @Param('registerId') registerId: string,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ): Promise<CashSession[]> {
    return this.cashSessionsService.getSessionsByRegister(
      registerId,
      startDate,
      endDate,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'une session" })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({ status: 200, description: 'Session trouvée' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  findOne(@Param('id') id: string): Promise<CashSession> {
    return this.cashSessionsService.findOne(id);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: "Résumé détaillé d'une session" })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({ status: 200, description: 'Résumé de la session' })
  getSessionSummary(@Param('id') id: string): Promise<any> {
    return this.cashSessionsService.getSessionSummary(id);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Fermer une session' })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({ status: 200, description: 'Session fermée' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  @ApiResponse({ status: 400, description: 'Session non ouverte' })
  closeSession(
    @Param('id') id: string,
    @Body() closeSessionDto: CloseSessionDto,
  ): Promise<CashSession> {
    return this.cashSessionsService.closeSession(id, closeSessionDto);
  }

  @Post(':id/suspend')
  @ApiOperation({ summary: 'Suspendre une session' })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({ status: 200, description: 'Session suspendue' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  suspendSession(@Param('id') id: string): Promise<CashSession> {
    return this.cashSessionsService.suspendSession(id);
  }

  @Post(':id/resume')
  @ApiOperation({ summary: 'Reprendre une session suspendue' })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({ status: 200, description: 'Session reprise' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  resumeSession(@Param('id') id: string): Promise<CashSession> {
    return this.cashSessionsService.resumeSession(id);
  }

  @Post(':id/cash-in')
  @ApiOperation({ summary: "Enregistrer une entrée d'argent" })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({ status: 200, description: 'Entrée enregistrée' })
  recordCashIn(
    @Param('id') id: string,
    @Body() dto: { amount: number; reason: string },
  ): Promise<CashSession> {
    return this.cashSessionsService.recordCashIn(id, dto.amount, dto.reason);
  }

  @Post(':id/cash-out')
  @ApiOperation({ summary: "Enregistrer une sortie d'argent" })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({ status: 200, description: 'Sortie enregistrée' })
  @ApiResponse({ status: 400, description: 'Fonds insuffisants' })
  recordCashOut(
    @Param('id') id: string,
    @Body() dto: { amount: number; reason: string },
  ): Promise<CashSession> {
    return this.cashSessionsService.recordCashOut(id, dto.amount, dto.reason);
  }

  // Note: Ce endpoint est appelé par le module Orders quand une vente est effectuée
  @Post(':id/record-sale')
  @ApiOperation({
    summary: 'Enregistrer une vente sur la session (usage interne)',
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({ status: 200, description: 'Vente enregistrée' })
  @HttpCode(HttpStatus.OK)
  async recordSale(
    @Param('id') id: string,
    @Body() dto: { amount: number; method: string; orderId: string },
  ): Promise<{ success: boolean }> {
    await this.cashSessionsService.recordSale(
      id,
      dto.amount,
      dto.method as any,
      dto.orderId,
    );
    return { success: true };
  }
}
