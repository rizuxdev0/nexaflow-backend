import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { CashSession, SessionStatus } from './entities/cash-session.entity';
import { OpenSessionDto } from './dto/open-session.dto';
import { CloseSessionDto } from './dto/close-session.dto';
import { PaymentMethod } from './dto/record-payment.dto';
import { RegistersService } from '../registers/registers.service';
import {
  PaginatedResponse,
  PaginatedResponseBuilder,
} from '../../common/interfaces/paginated-response.interface';

@Injectable()
export class CashSessionsService {
  constructor(
    @InjectRepository(CashSession)
    private sessionsRepository: Repository<CashSession>,
    @Inject(forwardRef(() => RegistersService))
    private registersService: RegistersService,
  ) {}

  async openSession(
    openSessionDto: OpenSessionDto,
    userId: string,
  ): Promise<CashSession> {
    // Vérifier si la caisse existe et est active
    const register = await this.registersService.findOne(
      openSessionDto.registerId,
    );

    if (!register.isActive) {
      throw new BadRequestException('La caisse est inactive');
    }

    // Vérifier s'il n'y a pas déjà une session ouverte sur cette caisse
    const activeSession = await this.sessionsRepository.findOne({
      where: {
        registerId: openSessionDto.registerId,
        status: SessionStatus.OPEN,
      },
    });

    if (activeSession) {
      throw new ConflictException(
        `Une session est déjà ouverte sur cette caisse depuis le ${activeSession.openedAt.toLocaleString()}`,
      );
    }

    // Créer la nouvelle session
    const session = this.sessionsRepository.create({
      registerId: openSessionDto.registerId,
      userId,
      openingAmount: openSessionDto.openingAmount,
      openedAt: new Date(),
      status: SessionStatus.OPEN,
      notes: openSessionDto.notes,
      payments: [],
    });

    return await this.sessionsRepository.save(session);
  }

  async closeSession(
    id: string,
    closeSessionDto: CloseSessionDto,
  ): Promise<CashSession> {
    const session = await this.findOne(id);

    if (session.status !== SessionStatus.OPEN) {
      throw new BadRequestException("Cette session n'est pas ouverte");
    }

    // Calculer le montant attendu
    const expectedAmount =
      session.openingAmount + session.cashIn - session.cashOut;
    const difference = closeSessionDto.closingAmount - expectedAmount;

    session.status = SessionStatus.CLOSED;
    session.closingAmount = closeSessionDto.closingAmount;
    session.expectedAmount = expectedAmount;
    session.difference = difference;
    session.closedAt = new Date();

    if (closeSessionDto.notes) {
      session.notes = session.notes
        ? `${session.notes}\nFermeture: ${closeSessionDto.notes}`
        : `Fermeture: ${closeSessionDto.notes}`;
    }

    return await this.sessionsRepository.save(session);
  }

  async suspendSession(id: string): Promise<CashSession> {
    const session = await this.findOne(id);

    if (session.status !== SessionStatus.OPEN) {
      throw new BadRequestException("Cette session n'est pas ouverte");
    }

    session.status = SessionStatus.SUSPENDED;
    return await this.sessionsRepository.save(session);
  }

  async resumeSession(id: string): Promise<CashSession> {
    const session = await this.findOne(id);

    if (session.status !== SessionStatus.SUSPENDED) {
      throw new BadRequestException("Cette session n'est pas suspendue");
    }

    session.status = SessionStatus.OPEN;
    return await this.sessionsRepository.save(session);
  }

  async findOne(id: string): Promise<CashSession> {
    const session = await this.sessionsRepository.findOne({
      where: { id },
      relations: ['register', 'orders'],
    });

    if (!session) {
      throw new NotFoundException(`Session avec l'ID "${id}" non trouvée`);
    }

    return session;
  }

  async findActiveByRegister(registerId: string): Promise<CashSession> {
    const session = await this.sessionsRepository.findOne({
      where: {
        registerId,
        status: SessionStatus.OPEN,
      },
      relations: ['register'],
    });

    if (!session) {
      throw new NotFoundException(
        `Aucune session active trouvée pour la caisse ${registerId}`,
      );
    }

    return session;
  }

  async findAll(
    page: number = 1,
    pageSize: number = 20,
    registerId?: string,
    status?: SessionStatus,
    startDate?: Date,
    endDate?: Date,
    userId?: string,
  ): Promise<PaginatedResponse<CashSession>> {
    const where: FindOptionsWhere<CashSession> = {};

    if (registerId) {
      where.registerId = registerId;
    }

    if (status) {
      where.status = status;
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate && endDate) {
      where.openedAt = Between(startDate, endDate);
    }

    const [data, total] = await this.sessionsRepository.findAndCount({
      where,
      relations: ['register'],
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { openedAt: 'DESC' },
    });

    return PaginatedResponseBuilder.build(data, total, page, pageSize);
  }

  async getSessionsByRegister(
    registerId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<CashSession[]> {
    const where: FindOptionsWhere<CashSession> = {
      registerId,
    };

    if (startDate && endDate) {
      where.openedAt = Between(startDate, endDate);
    }

    return await this.sessionsRepository.find({
      where,
      order: { openedAt: 'DESC' },
    });
  }

  //   async recordSale(
  //     sessionId: string,
  //     amount: number,
  //     paymentMethod: PaymentMethod,
  //     orderId: string,
  //   ): Promise<CashSession> {
  //     const session = await this.findOne(sessionId);

  //     if (session.status !== SessionStatus.OPEN) {
  //       throw new BadRequestException("La session n'est pas ouverte");
  //     }

  //     // Mettre à jour les compteurs de la session
  //     session.salesCount += 1;
  //     session.salesTotal = Number(session.salesTotal) + amount;

  //     // Mettre à jour les entrées d'argent si paiement en espèces
  //     if (paymentMethod === PaymentMethod.CASH) {
  //       session.cashIn = Number(session.cashIn) + amount;
  //     }

  //     // Mettre à jour les statistiques de paiement
  //     const paymentIndex = session.payments.findIndex(
  //       (p) => p.method === String(paymentMethod),
  //     );
  //     if (paymentIndex >= 0) {
  //       session.payments[paymentIndex].count += 1;
  //       session.payments[paymentIndex].total =
  //         Number(session.payments[paymentIndex].total) + amount;
  //     } else {
  //       session.payments.push({
  //         method: paymentMethod,
  //         count: 1,
  //         total: amount,
  //       });
  //     }

  //     return await this.sessionsRepository.save(session);
  //   }
  async recordSale(
    sessionId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    orderId: string,
  ): Promise<CashSession> {
    const session = await this.findOne(sessionId);

    if (session.status !== SessionStatus.OPEN) {
      throw new BadRequestException("La session n'est pas ouverte");
    }

    // Mettre à jour les compteurs de la session
    session.salesCount += 1;
    session.salesTotal = Number(session.salesTotal) + amount;

    // Mettre à jour les entrées d'argent si paiement en espèces
    if (paymentMethod === PaymentMethod.CASH) {
      session.cashIn = Number(session.cashIn) + amount;
    }

    // Mettre à jour les statistiques de paiement
    const paymentIndex = session.payments.findIndex(
      (p) => p.method === String(paymentMethod),
    );
    if (paymentIndex >= 0) {
      session.payments[paymentIndex].count += 1;
      session.payments[paymentIndex].total =
        Number(session.payments[paymentIndex].total) + amount;
    } else {
      session.payments.push({
        method: paymentMethod,
        count: 1,
        total: amount,
      });
    }

    // Ajouter l'ID de la commande dans les notes ou dans un champ dédié
    // Option 1: Ajouter aux notes
    session.notes = session.notes
      ? `${session.notes}\nVente #${orderId}: ${amount} (${paymentMethod})`
      : `Vente #${orderId}: ${amount} (${paymentMethod})`;

    // Option 2: Créer un champ orderIds dans l'entité (si vous voulez tracker toutes les commandes)
    // Il faudrait ajouter un champ dans l'entité: @Column({ type: 'simple-array', nullable: true }) orderIds: string[];
    // Puis: session.orderIds = [...(session.orderIds || []), orderId];

    return await this.sessionsRepository.save(session);
  }
  async recordCashIn(
    sessionId: string,
    amount: number,
    reason: string,
  ): Promise<CashSession> {
    const session = await this.findOne(sessionId);

    if (session.status !== SessionStatus.OPEN) {
      throw new BadRequestException("La session n'est pas ouverte");
    }

    session.cashIn = Number(session.cashIn) + amount;
    session.notes = session.notes
      ? `${session.notes}\nEntrée d'argent: ${amount} - ${reason}`
      : `Entrée d'argent: ${amount} - ${reason}`;

    return await this.sessionsRepository.save(session);
  }

  async recordCashOut(
    sessionId: string,
    amount: number,
    reason: string,
  ): Promise<CashSession> {
    const session = await this.findOne(sessionId);

    if (session.status !== SessionStatus.OPEN) {
      throw new BadRequestException("La session n'est pas ouverte");
    }

    // Vérifier qu'il y a assez d'argent dans la caisse
    const availableCash =
      session.openingAmount + session.cashIn - session.cashOut;
    if (availableCash < amount) {
      throw new BadRequestException(
        `Fonds insuffisants. Disponible: ${availableCash}, demandé: ${amount}`,
      );
    }

    session.cashOut = Number(session.cashOut) + amount;
    session.notes = session.notes
      ? `${session.notes}\nSortie d'argent: ${amount} - ${reason}`
      : `Sortie d'argent: ${amount} - ${reason}`;

    return await this.sessionsRepository.save(session);
  }

  async getSessionSummary(id: string): Promise<any> {
    const session = await this.findOne(id);

    const expectedAmount =
      session.openingAmount + session.cashIn - session.cashOut;
    const difference = session.closingAmount
      ? session.closingAmount - expectedAmount
      : null;

    return {
      sessionId: session.id,
      register: session.register?.name,
      status: session.status,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      openingAmount: session.openingAmount,
      cashIn: session.cashIn,
      cashOut: session.cashOut,
      expectedAmount,
      actualAmount: session.closingAmount,
      difference,
      salesCount: session.salesCount,
      salesTotal: session.salesTotal,
      payments: session.payments,
      averageTicket:
        session.salesCount > 0 ? session.salesTotal / session.salesCount : 0,
    };
  }

  async getDailySummary(date: Date = new Date()): Promise<any> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const sessions = await this.sessionsRepository.find({
      where: {
        openedAt: Between(startOfDay, endOfDay),
      },
      relations: ['register'],
    });

    const totalSales = sessions.reduce(
      (sum, s) => sum + Number(s.salesTotal),
      0,
    );
    const totalCashIn = sessions.reduce((sum, s) => sum + Number(s.cashIn), 0);
    const totalCashOut = sessions.reduce(
      (sum, s) => sum + Number(s.cashOut),
      0,
    );
    const totalSessions = sessions.length;
    const closedSessions = sessions.filter(
      (s) => s.status === SessionStatus.CLOSED,
    ).length;

    // Agréger les paiements
    const allPayments = sessions.flatMap((s) => s.payments);
    const paymentsByMethod = allPayments.reduce((acc, p) => {
      if (!acc[p.method]) {
        acc[p.method] = { count: 0, total: 0 };
      }
      acc[p.method].count += p.count;
      acc[p.method].total += Number(p.total);
      return acc;
    }, {});

    return {
      date: startOfDay.toISOString().split('T')[0],
      totalSessions,
      closedSessions,
      openSessions: totalSessions - closedSessions,
      totalSales,
      totalCashIn,
      totalCashOut,
      paymentsByMethod,
      sessions: sessions.map((s) => ({
        id: s.id,
        register: s.register?.name,
        status: s.status,
        salesCount: s.salesCount,
        salesTotal: s.salesTotal,
        openedAt: s.openedAt,
      })),
    };
  }
}
