import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VendorRequest, VendorRequestStatus } from './entities/vendor-request.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { VendorsService } from '../vendors/vendors.service';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';
import { VendorStatus } from '../vendors/entities/vendor.entity';

@Injectable()
export class VendorRequestsService {
  constructor(
    @InjectRepository(VendorRequest)
    private readonly vendorRequestRepository: Repository<VendorRequest>,
    private readonly notificationsService: NotificationsService,
    private readonly vendorsService: VendorsService,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
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
    const oldStatus = request.status;
    request.status = status;
    if (adminNotes) {
      request.adminNotes = adminNotes;
    }
    
    const saved = await this.vendorRequestRepository.save(request);

    // Logic for newly approved vendors
    if (status === VendorRequestStatus.APPROVED && oldStatus !== VendorRequestStatus.APPROVED) {
      try {
        // 1. Create the vendor profile
        await this.vendorsService.create({
          userId: request.userId,
          name: request.storeName,
          email: request.email,
          phone: request.phone,
          description: request.description,
          address: request.address,
          city: request.city,
          country: request.country,
          contactPerson: request.contactPerson,
          website: request.website,
          taxId: request.taxId,
          bankName: request.bankName,
          bankAccount: request.bankAccount,
          mobileMoney: request.mobileMoney,
          notes: `Approuvé le ${new Date().toLocaleDateString()}\nNotes admin: ${adminNotes || 'R.A.S'}`,
          status: VendorStatus.ACTIVE,
        });

        // 2. Update user role to 'vendor'
        const vendorRole = await this.rolesService.findByName('vendor');
        if (vendorRole) {
          await this.usersService.update(request.userId, { roleId: vendorRole.id });
        }
      } catch (err) {
        console.error('Error during vendor creation after approval:', err);
        // We don't throw here to avoid rolling back the request status update, 
        // but in a production app we might want a transaction.
      }
    }

    return saved;
  }

  async getMyRequests(userId: string): Promise<VendorRequest[]> {
    return await this.vendorRequestRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
