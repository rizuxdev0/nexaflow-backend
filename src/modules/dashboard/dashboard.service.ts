import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { Customer } from '../customers/entities/customer.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Order)
    private ordersRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private itemsRepo: Repository<OrderItem>,
    @InjectRepository(Product)
    private productsRepo: Repository<Product>,
    @InjectRepository(Customer)
    private customersRepo: Repository<Customer>,
  ) {}

  async getStats() {
    const totalOrders = await this.ordersRepo.count();
    const totalProducts = await this.productsRepo.count();
    const totalCustomers = await this.customersRepo.count();

    const revenueResult = await this.ordersRepo
      .createQueryBuilder('o')
      .select('SUM(o.total)', 'total')
      .where("o.paymentStatus = 'paid'")
      .getRawOne();
    const totalRevenue = parseFloat(revenueResult?.total || '0');

    // Previous month for change calculation
    const now = new Date();
    const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const thisMonthRevenue = await this.ordersRepo
      .createQueryBuilder('o')
      .select('SUM(o.total)', 'total')
      .where("o.paymentStatus = 'paid'")
      .andWhere('o.createdAt >= :start', { start: startThisMonth })
      .getRawOne();

    const lastMonthRevenue = await this.ordersRepo
      .createQueryBuilder('o')
      .select('SUM(o.total)', 'total')
      .where("o.paymentStatus = 'paid'")
      .andWhere('o.createdAt >= :start AND o.createdAt < :end', { start: startLastMonth, end: startThisMonth })
      .getRawOne();

    const thisRev = parseFloat(thisMonthRevenue?.total || '0');
    const lastRev = parseFloat(lastMonthRevenue?.total || '1');
    const revenueChange = lastRev > 0 ? Math.round(((thisRev - lastRev) / lastRev) * 100 * 10) / 10 : 0;

    const lowStockProducts = await this.productsRepo
      .createQueryBuilder('p')
      .where('p.stock > 0 AND p.stock <= p."minStock"')
      .getCount();

    const outOfStockProducts = await this.productsRepo
      .createQueryBuilder('p')
      .where('p.stock = 0')
      .getCount();

    return {
      totalRevenue,
      totalOrders,
      totalProducts,
      totalCustomers,
      revenueChange,
      ordersChange: 0,
      lowStockProducts,
      outOfStockProducts,
    };
  }

  async getSalesData(days = 30) {
    const result: { date: string; revenue: number; orders: number }[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

      const dayStart = new Date(dateStr + 'T00:00:00.000Z');
      const dayEnd = new Date(dateStr + 'T23:59:59.999Z');

      const dayResult = await this.ordersRepo
        .createQueryBuilder('o')
        .select('SUM(o.total)', 'revenue')
        .addSelect('COUNT(o.id)', 'cnt')
        .where("o.paymentStatus = 'paid'")
        .andWhere('o.createdAt >= :start AND o.createdAt <= :end', { start: dayStart, end: dayEnd })
        .getRawOne();

      result.push({
        date: dateStr,
        revenue: parseFloat(dayResult?.revenue || '0'),
        orders: parseInt(dayResult?.cnt || '0', 10),
      });
    }

    return result;
  }

  async getTopProducts(limit = 5) {
    const raw = await this.itemsRepo
      .createQueryBuilder('oi')
      .select('oi.productId', 'productId')
      .addSelect('oi.productName', 'productName')
      .addSelect('SUM(oi.quantity)', 'totalSold')
      .addSelect('SUM(oi.totalPrice)', 'revenue')
      .innerJoin('oi.order', 'o')
      .where("o.paymentStatus = 'paid'")
      .groupBy('oi.productId')
      .addGroupBy('oi.productName')
      .orderBy('revenue', 'DESC')
      .limit(limit)
      .getRawMany();

    return raw.map(r => ({
      productId: r.productId,
      productName: r.productName,
      totalSold: parseInt(r.totalSold || '0', 10),
      revenue: parseFloat(r.revenue || '0'),
    }));
  }

  async getRevenueByCategory() {
    const raw = await this.itemsRepo
      .createQueryBuilder('oi')
      .select('p.categoryId', 'categoryId')
      .addSelect('c.name', 'categoryName')
      .addSelect('SUM(oi.totalPrice)', 'revenue')
      .innerJoin('oi.order', 'o')
      .innerJoin('products', 'p', 'p.id = oi."productId"')
      .leftJoin('categories', 'c', 'c.id = p."categoryId"')
      .where("o.paymentStatus = 'paid'")
      .groupBy('p.categoryId')
      .addGroupBy('c.name')
      .orderBy('revenue', 'DESC')
      .getRawMany();

    return raw.map(r => ({
      category: r.categoryName || 'Sans catégorie',
      revenue: parseFloat(r.revenue || '0'),
    }));
  }
}
