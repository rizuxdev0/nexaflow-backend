import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { Customer } from '../customers/entities/customer.entity';
import { StockMovement } from '../stock/entities/stock-movement.entity';

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
  ) {}

  async getSalesOverview(startDate?: Date, endDate?: Date) {
    const start = startDate || new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate || new Date();

    const orders = await this.orderRepository.find({
      where: {
        createdAt: Between(start, end),
        status: OrderStatus.COMPLETED
      }
    });

    const totalRevenue = orders.reduce((acc, o) => acc + Number(o.total), 0);
    const orderCount = orders.length;
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    // Group by day?
    const dailyMap = new Map<string, number>();
    orders.forEach(o => {
      const date = o.createdAt.toISOString().split('T')[0];
      dailyMap.set(date, (dailyMap.get(date) || 0) + Number(o.total));
    });

    return {
      totalRevenue,
      orderCount,
      avgOrderValue,
      dailySales: Array.from(dailyMap.entries()).map(([date, total]) => ({ date, total }))
    };
  }

  async getTopProducts(limit = 10) {
    // This requires joining with OrderItems
    const result = await this.orderRepository
      .createQueryBuilder('o')
      .innerJoin('o.items', 'item')
      .select('item.productName', 'name')
      .addSelect('item.sku', 'sku')
      .addSelect('SUM(item.quantity)', 'totalQuantity')
      .addSelect('SUM(item.total)', 'totalRevenue')
      .where('o.status = :status', { status: OrderStatus.COMPLETED })
      .groupBy('item.productId')
      .addGroupBy('item.productName')
      .addGroupBy('item.sku')
      .orderBy('totalRevenue', 'DESC')
      .limit(limit)
      .getRawMany();

    return result;
  }

  async getCustomerIntelligence() {
    const totalCustomers = await this.customerRepository.count();
    const activeCustomers = await this.orderRepository
      .createQueryBuilder('o')
      .select('DISTINCT(o.customerId)')
      .where('o.createdAt > :monthAgo', { monthAgo: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) })
      .getCount();

    // Average Customer Lifetime Value?
    const revenueSum = await this.orderRepository
      .createQueryBuilder('o')
      .select('SUM(o.total)', 'total')
      .where('o.status = :status', { status: OrderStatus.COMPLETED })
      .getRawOne();

    const customerLTV = totalCustomers > 0 ? Number(revenueSum.total) / totalCustomers : 0;

    return {
      totalCustomers,
      activeCustomersLast30Days: activeCustomers,
      customerLTV
    };
  }

  async getInventoryAnalytics() {
    const products = await this.productRepository.find();
    
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
