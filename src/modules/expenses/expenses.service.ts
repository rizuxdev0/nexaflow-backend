import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Expense, ExpenseStatus } from './entities/expense.entity';
import { ExpenseCategory } from './entities/expense-category.entity';
import { CreateExpenseDto, UpdateExpenseDto, CreateExpenseCategoryDto } from './dto/expense.dto';
import { TenantService } from '../../common/tenant/tenant.service';
import { AbstractTenantService } from '../../common/tenant/abstract-tenant.service';

@Injectable()
export class ExpensesService extends AbstractTenantService<Expense> {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
    @InjectRepository(ExpenseCategory)
    private readonly categoryRepository: Repository<ExpenseCategory>,
    tenantService: TenantService,
  ) {
    super(expenseRepository, tenantService, 'Expense');
  }

  private get categoryRepo() {
    return this.tenantService.tenantRepo(this.categoryRepository);
  }

  // Categories
  async createCategory(dto: CreateExpenseCategoryDto) {
    const cat = this.categoryRepo.create({
      ...dto,
      vendorId: this.tenantService.getVendorId() || undefined,
    });
    return this.categoryRepo.save(cat);
  }

  async findAllCategories() {
    return this.categoryRepo.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }

  // Expenses
  async findAll(query: { branchId?: string; categoryId?: string; startDate?: string; endDate?: string; page?: number; pageSize?: number }) {
    const { branchId, categoryId, startDate, endDate, page = 1, pageSize = 20 } = query;
    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (categoryId) where.categoryId = categoryId;
    if (startDate && endDate) where.date = Between(new Date(startDate), new Date(endDate));

    const [data, total] = await this.repo.findAndCount({
      where,
      relations: ['category', 'branch'],
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { date: 'DESC' }
    });

    return { data, total, page, pageSize };
  }

  async findOne(id: string) {
    const exp = await this.repo.findOne({ where: { id }, relations: ['category', 'branch'] });
    if (!exp) throw new NotFoundException('Dépense non trouvée');
    return exp;
  }

  async create(dto: CreateExpenseDto, userId: string) {
    const exp = this.repo.create({ 
      ...dto, 
      recordedById: userId,
      vendorId: this.tenantService.getVendorId() || undefined,
    });
    return this.repo.save(exp);
  }

  async update(id: string, dto: UpdateExpenseDto) {
    const exp = await this.findOne(id);
    Object.assign(exp, dto);
    return this.repo.save(exp);
  }

  async remove(id: string) {
    const exp = await this.findOne(id);
    return this.repo.remove(exp);
  }

  async getSummary(branchId?: string, startDate?: string, endDate?: string) {
    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (startDate && endDate) where.date = Between(new Date(startDate), new Date(endDate));

    const expenses = await this.repo.find({ where, relations: ['category'] });
    
    const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const byCategory = expenses.reduce((acc, e) => {
      const name = e.category?.name || 'Inconnue';
      acc[name] = (acc[name] || 0) + Number(e.amount);
      return acc;
    }, {});

    return { total, byCategory };
  }
}
