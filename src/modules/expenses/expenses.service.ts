import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Expense, ExpenseStatus } from './entities/expense.entity';
import { ExpenseCategory } from './entities/expense-category.entity';
import { CreateExpenseDto, UpdateExpenseDto, CreateExpenseCategoryDto } from './dto/expense.dto';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
    @InjectRepository(ExpenseCategory)
    private readonly categoryRepo: Repository<ExpenseCategory>,
  ) {}

  // Categories
  async createCategory(dto: CreateExpenseCategoryDto) {
    const cat = this.categoryRepo.create(dto);
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

    const [data, total] = await this.expenseRepo.findAndCount({
      where,
      relations: ['category', 'branch'],
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { date: 'DESC' }
    });

    return { data, total, page, pageSize };
  }

  async findOne(id: string) {
    const exp = await this.expenseRepo.findOne({ where: { id }, relations: ['category', 'branch'] });
    if (!exp) throw new NotFoundException('Dépense non trouvée');
    return exp;
  }

  async create(dto: CreateExpenseDto, userId: string) {
    const exp = this.expenseRepo.create({ ...dto, recordedById: userId });
    return this.expenseRepo.save(exp);
  }

  async update(id: string, dto: UpdateExpenseDto) {
    const exp = await this.findOne(id);
    Object.assign(exp, dto);
    return this.expenseRepo.save(exp);
  }

  async remove(id: string) {
    const exp = await this.findOne(id);
    return this.expenseRepo.remove(exp);
  }

  async getSummary(branchId?: string, startDate?: string, endDate?: string) {
    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (startDate && endDate) where.date = Between(new Date(startDate), new Date(endDate));

    const expenses = await this.expenseRepo.find({ where, relations: ['category'] });
    
    const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const byCategory = expenses.reduce((acc, e) => {
      const name = e.category.name;
      acc[name] = (acc[name] || 0) + Number(e.amount);
      return acc;
    }, {});

    return { total, byCategory };
  }
}
