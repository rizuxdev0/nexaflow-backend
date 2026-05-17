import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, SelectQueryBuilder } from 'typeorm';
import { Order, PaymentStatus } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { Customer } from '../customers/entities/customer.entity';
import { StockMovement } from '../stock/entities/stock-movement.entity';
import { Expense, ExpenseStatus } from '../expenses/entities/expense.entity';
import { TenantService } from '../../common/tenant/tenant.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(StockMovement)
    private readonly movementRepository: Repository<StockMovement>,
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
    private readonly tenantService: TenantService,
  ) {}

  private get orderRepo() { return this.tenantService.tenantRepo(this.orderRepository); }
  private get productRepo() { return this.tenantService.tenantRepo(this.productRepository); }
  private get customerRepo() { return this.tenantService.tenantRepo(this.customerRepository); }
  private get movementRepo() { return this.tenantService.tenantRepo(this.movementRepository); }
  private get expenseRepo() { return this.tenantService.tenantRepo(this.expenseRepository); }

  async getSalesOverview(startDate?: Date | string, endDate?: Date | string, branchId?: string, sellerId?: string) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();

    const orderQuery = this.orderRepo.createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .where('o.createdAt BETWEEN :start AND :end', { start, end })
      .andWhere('o.paymentStatus = :status', { status: PaymentStatus.PAID });

    if (branchId) {
      orderQuery.andWhere('o.branchId = :branchId', { branchId });
    }
    if (sellerId) {
      orderQuery.andWhere('o.userId = :sellerId', { sellerId });
    }

    const orders = await orderQuery.getMany();

    const totalRevenue = orders.reduce((acc, o) => acc + Number(o.total), 0);
    const orderCount = orders.length;
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    let totalCogs = 0;
    orders.forEach(o => {
      o.items.forEach(item => {
        const costPrice = item.product?.costPrice ? Number(item.product.costPrice) : 0;
        totalCogs += costPrice * Number(item.quantity);
      });
    });

    const expenseQuery = this.expenseRepo.createQueryBuilder('e')
      .where('e.date BETWEEN :start AND :end', { start, end })
      .andWhere('e.status = :status', { status: ExpenseStatus.PAID });

    if (branchId) {
      expenseQuery.andWhere('e.branchId = :branchId', { branchId });
    }
    
    const expenses = await expenseQuery.getMany();
    const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount), 0);

    const netMargin = totalRevenue - totalCogs - totalExpenses;

    const dailyMap = new Map<string, number>();
    orders.forEach(o => {
      const date = o.createdAt.toISOString().split('T')[0];
      dailyMap.set(date, (dailyMap.get(date) || 0) + Number(o.total));
    });

    return {
      totalRevenue,
      orderCount,
      avgOrderValue,
      totalCogs,
      totalExpenses,
      netMargin,
      dailySales: Array.from(dailyMap.entries()).map(([date, total]) => ({ date, total }))
    };
  }

  async getTopProducts(limit = 10) {
    const result = await this.orderRepo
      .createQueryBuilder('o')
      .innerJoin('o.items', 'item')
      .select('item.productName', 'name')
      .addSelect('item.productSku', 'sku')
      .addSelect('SUM(item.quantity)', 'totalQuantity')
      .addSelect('SUM(item.totalPrice)', 'totalRevenue')
      .where('o.paymentStatus = :status', { status: PaymentStatus.PAID })
      .groupBy('item.productId')
      .addGroupBy('item.productName')
      .addGroupBy('item.productSku')
      .orderBy('SUM(item.totalPrice)', 'DESC')
      .limit(limit)
      .getRawMany();

    return result;
  }

  async getCustomerIntelligence() {
    const totalCustomers = await this.customerRepo.count();
    const activeCustomers = await this.orderRepo
      .createQueryBuilder('o')
      .select('DISTINCT(o.customerId)')
      .where('o.createdAt > :monthAgo', { monthAgo: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) })
      .getCount();

    const revenueSum = await this.orderRepo
      .createQueryBuilder('o')
      .select('SUM(o.total)', 'total')
      .where('o.paymentStatus = :status', { status: PaymentStatus.PAID })
      .getRawOne();

    const customerLTV = totalCustomers > 0 ? Number(revenueSum.total) / totalCustomers : 0;

    return {
      totalCustomers,
      activeCustomersLast30Days: activeCustomers,
      customerLTV
    };
  }

  async getInventoryAnalytics() {
    const products = await this.productRepo.find();
    
    const lowStock = products.filter(p => p.stock <= p.minStock).length;
    const outOfStock = products.filter(p => p.stock <= 0).length;
    const warehouseValue = products.reduce((acc, p) => acc + (p.stock * Number(p.costPrice || 0)), 0);

    return {
      totalProducts: products.length,
      lowStockCount: lowStock,
      outOfStockCount: outOfStock,
      estimatedInventoryValue: warehouseValue
    };
  }
}
