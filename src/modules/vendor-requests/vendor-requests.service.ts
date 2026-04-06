import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VendorRequest, VendorRequestStatus } from './entities/vendor-request.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class VendorRequestsService {
  constructor(
    @InjectRepository(VendorRequest)
    private readonly vendorRequestRepository: Repository<VendorRequest>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, data: any): Promise<VendorRequest> {
    const request = this.vendorRequestRepository.create({
      userId,
      storeName: data.name,
      description: data.description,
      phone: data.phone,
      email: data.email,
      address: data.address,
      city: data.city,
      country: data.country,
      contactPerson: data.contactPerson,
      website: data.website,
      taxId: data.taxId,
      bankName: data.bankName,
      bankAccount: data.bankAccount,
      mobileMoney: data.mobileMoney,
      notes: data.notes,
      status: VendorRequestStatus.PENDING,
    });

    const saved = await this.vendorRequestRepository.save(request);
    
    // Notify Admin
    try {
      await this.notificationsService.notifyVendorRequest(
        saved.id, 
        saved.storeName, 
        saved.contactPerson || 'Un nouveau client'
      );
    } catch (err) {
      console.error('Error sending vendor request notification:', err);
    }

    return saved;
  }

  async findAll(): Promise<VendorRequest[]> {
    return await this.vendorRequestRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<VendorRequest> {
    const request = await this.vendorRequestRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!request) {
      throw new NotFoundException('Demande non trouvée');
    }

    return request;
  }

  async updateStatus(id: string, status: VendorRequestStatus, adminNotes?: string): Promise<VendorRequest> {
    const request = await this.findOne(id);
    request.status = status;
    if (adminNotes) {
      request.adminNotes = adminNotes;
    }
    return await this.vendorRequestRepository.save(request);
  }

  async getMyRequests(userId: string): Promise<VendorRequest[]> {
    return await this.vendorRequestRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
