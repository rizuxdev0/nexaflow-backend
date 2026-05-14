import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Testimonial } from './entities/testimonial.entity';
import { CreateTestimonialDto, UpdateTestimonialDto } from './dto/testimonial.dto';
import { TenantService } from '../../common/tenant/tenant.service';
import { AbstractTenantService } from '../../common/tenant/abstract-tenant.service';

@Injectable()
export class TestimonialsService extends AbstractTenantService<Testimonial> {
  constructor(
    @InjectRepository(Testimonial)
    private readonly testimonialRepository: Repository<Testimonial>,
    tenantService: TenantService,
  ) {
    super(testimonialRepository, tenantService, 'Testimonial');
  }

  async findAllActive() {
    return this.repo.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', createdAt: 'DESC' } as any,
    });
  }

  async findAll() {
    return this.repo.find({
      order: { displayOrder: 'ASC', createdAt: 'DESC' } as any,
    });
  }

  async findOne(id: string) {
    return super.findOne(id);
  }

  async create(createTestimonialDto: CreateTestimonialDto) {
    const testimonial = this.repo.create({
      ...createTestimonialDto,
      vendorId: this.tenantService.getVendorId() || undefined,
    });
    return this.repo.save(testimonial);
  }

  async update(id: string, updateTestimonialDto: UpdateTestimonialDto) {
    const testimonial = await this.findOne(id);
    this.repo.merge(testimonial, updateTestimonialDto);
    return this.repo.save(testimonial);
  }

  async remove(id: string) {
    return super.remove(id);
  }

  async toggleActive(id: string) {
    const testimonial = await this.findOne(id);
    testimonial.isActive = !testimonial.isActive;
    return this.repo.save(testimonial);
  }
}
