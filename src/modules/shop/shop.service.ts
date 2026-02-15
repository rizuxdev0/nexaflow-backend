import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan, Like, Between } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import {
  Order,
  OrderStatus,
  PaymentStatus,
} from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CreateShopOrderDto } from './dto/shop-order.dto';
import { ShopProductResponseDto } from './dto/shop-product-response.dto';
import { ShopOrderResponseDto } from './dto/shop-order-response.dto';
import { CustomersService } from '../customers/customers.service';
import { ProductsService } from '../products/products.service';
import { InvoicesService } from '../invoices/invoices.service';
import {
  PaginatedResponse,
  PaginatedResponseBuilder,
} from '../../common/interfaces/paginated-response.interface';
import { DataSource } from 'typeorm';

@Injectable()
export class ShopService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(Customer)
    private customersRepository: Repository<Customer>,
    private customersService: CustomersService,
    private productsService: ProductsService,
    @Inject(forwardRef(() => InvoicesService))
    private invoicesService: InvoicesService,
    private dataSource: DataSource,
  ) {}

  // ============ CATALOGUE PUBLIC ============

  async getPublicProducts(
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    categoryId?: string,
    minPrice?: number,
    maxPrice?: number,
    inStock?: boolean,
    sortBy: 'price_asc' | 'price_desc' | 'newest' | 'popular' = 'newest',
  ): Promise<PaginatedResponse<ShopProductResponseDto>> {
    const queryBuilder = this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.isActive = :isActive', { isActive: true })
      .andWhere('product.stock > 0'); // Seulement les produits en stock

    if (search) {
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.description ILIKE :search OR product.brand ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (categoryId) {
      queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    if (minPrice !== undefined) {
      queryBuilder.andWhere('product.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      queryBuilder.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    if (inStock === true) {
      queryBuilder.andWhere('product.stock > 0');
    }

    // Tri
    switch (sortBy) {
      case 'price_asc':
        queryBuilder.orderBy('product.price', 'ASC');
        break;
      case 'price_desc':
        queryBuilder.orderBy('product.price', 'DESC');
        break;
      case 'newest':
        queryBuilder.orderBy('product.createdAt', 'DESC');
        break;
      case 'popular':
        // À implémenter avec un compteur de ventes
        queryBuilder.orderBy('product.createdAt', 'DESC');
        break;
    }

    const [data, total] = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const productsWithStockStatus = data.map((product) => ({
      ...product,
      categoryName: product.category?.name,
      categorySlug: product.category?.slug,
      inStock: product.stock > 0,
    }));

    return PaginatedResponseBuilder.build(
      productsWithStockStatus,
      total,
      page,
      pageSize,
    );
  }

  async getPublicProduct(idOrSlug: string): Promise<ShopProductResponseDto> {
    let product: Product | null;

    // Vérifier si c'est un UUID ou un slug
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrSlug,
      );

    if (isUuid) {
      product = await this.productsRepository.findOne({
        where: { id: idOrSlug, isActive: true },
        relations: ['category', 'variants'],
      });
    } else {
      product = await this.productsRepository.findOne({
        where: { slug: idOrSlug, isActive: true },
        relations: ['category', 'variants'],
      });
    }

    if (!product) {
      throw new NotFoundException('Produit non trouvé');
    }

    return {
      ...product,
      categoryName: product.category?.name,
      categorySlug: product.category?.slug,
      inStock: product.stock > 0,
    };
  }

  async getPublicCategories(): Promise<Category[]> {
    return await this.categoriesRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async getProductsByCategory(
    categorySlug: string,
  ): Promise<ShopProductResponseDto[]> {
    const category = await this.categoriesRepository.findOne({
      where: { slug: categorySlug, isActive: true },
    });

    if (!category) {
      throw new NotFoundException('Catégorie non trouvée');
    }

    const products = await this.productsRepository.find({
      where: { categoryId: category.id, isActive: true, stock: MoreThan(0) },
      relations: ['category'],
      order: { createdAt: 'DESC' },
      take: 20,
    });

    return products.map((product) => ({
      ...product,
      categoryName: product.category?.name,
      categorySlug: product.category?.slug,
      inStock: product.stock > 0,
    }));
  }

  async searchProducts(query: string): Promise<ShopProductResponseDto[]> {
    const products = await this.productsRepository.find({
      where: [
        { name: Like(`%${query}%`), isActive: true },
        { description: Like(`%${query}%`), isActive: true },
        { brand: Like(`%${query}%`), isActive: true },
      ],
      relations: ['category'],
      take: 10,
    });

    return products.map((product) => ({
      ...product,
      categoryName: product.category?.name,
      categorySlug: product.category?.slug,
      inStock: product.stock > 0,
    }));
  }

  // ============ GESTION DES COMMANDES E-COMMERCE ============

  async createShopOrder(
    createOrderDto: CreateShopOrderDto,
  ): Promise<ShopOrderResponseDto> {
    // Utiliser une transaction pour garantir l'intégrité des données
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // ✅ Extraire les items du DTO
      const { items: orderItems } = createOrderDto;

      // 1. Valider les produits et calculer les montants
      const {
        items: validatedItems,
        total,
        subtotal,
        taxTotal,
      } = await this.validateAndCalculateOrder(orderItems);
      console.log('Validated Items:', validatedItems);
      // 2. Vérifier le stock pour chaque produit
      await this.checkStockAvailability(orderItems);

      // 3. Gérer le client
      let customerId = createOrderDto.customerId;
      if (!customerId && createOrderDto.customerEmail) {
        const customer = await this.customersService.findOrCreateByEmail(
          createOrderDto.customerEmail,
          {
            firstName: createOrderDto.customerName.split(' ')[0],
            lastName:
              createOrderDto.customerName.split(' ').slice(1).join(' ') ||
              'Client',
            phone: createOrderDto.customerPhone,
          },
        );
        customerId = customer.id;
      }

      // 4. Générer le numéro de commande
      const orderNumber = await this.generateOrderNumber();

      // 5. Créer la commande
      const order = this.ordersRepository.create({
        orderNumber,
        customerId,
        customerName: createOrderDto.customerName,
        customerEmail: createOrderDto.customerEmail,
        customerPhone: createOrderDto.customerPhone,
        shippingAddress: createOrderDto.shippingAddress,
        shippingCity: createOrderDto.shippingCity,
        shippingCountry: createOrderDto.shippingCountry,
        notes: createOrderDto.notes,
        subtotal,
        taxTotal,
        total,
        status: OrderStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: createOrderDto.paymentMethod,
        orderDate: new Date(),
      });

      const savedOrder = await queryRunner.manager.save(order);

      // 6. Créer les items de commande et décrémenter le stock
      for (const item of orderItems) {
        const product = await this.productsRepository.findOne({
          where: { id: item.productId },
        });

        if (!product) {
          throw new BadRequestException(
            `Produit avec l'ID ${item.productId} non trouvé`,
          );
        }

        // Créer l'item
        const orderItem = this.orderItemsRepository.create({
          orderId: savedOrder.id,
          productId: item.productId,
          productName: product.name,
          productSku: product.sku,
          quantity: item.quantity,
          unitPrice: product.price,
          totalPrice: product.price * item.quantity,
          taxRate: product.taxRate,
          taxAmount: (product.price * item.quantity * product.taxRate) / 100,
        });
        await queryRunner.manager.save(orderItem);

        // Décrémenter le stock
        product.stock -= item.quantity;
        await queryRunner.manager.save(product);
      }

      // 7. Mettre à jour les statistiques du client
      if (customerId) {
        await this.customersService.updateCustomerStats(customerId, total);
      }

      // 8. Générer la facture automatiquement
      const invoice = await this.invoicesService.generateFromOrder(
        savedOrder.id,
      );

      // Mettre à jour la commande avec l'ID de la facture
      savedOrder.invoiceId = invoice.id;
      await queryRunner.manager.save(savedOrder);

      // Valider la transaction
      await queryRunner.commitTransaction();

      // Retourner la commande avec les détails
      return await this.getOrderDetails(savedOrder.id);
    } catch (error) {
      // En cas d'erreur, annuler la transaction
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Libérer le queryRunner
      await queryRunner.release();
    }
  }
  private async validateAndCalculateOrder(
    items: { productId: string; quantity: number }[],
  ) {
    const productIds = items.map((item) => item.productId);
    const products = await this.productsRepository.findBy({
      id: In(productIds),
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException("Un ou plusieurs produits n'existent pas");
    }

    let subtotal = 0;
    let taxTotal = 0;

    const validatedItems = items.map((item) => {
      const product = products.find((p) => p.id === item.productId);

      if (!product) {
        throw new BadRequestException(
          `Produit avec l'ID ${item.productId} non trouvé`,
        );
      }

      const itemTotal = product.price * item.quantity;
      const itemTax = (itemTotal * product.taxRate) / 100;

      subtotal += itemTotal;
      taxTotal += itemTax;

      return {
        ...item,
        product,
        total: itemTotal,
        tax: itemTax,
      };
    });

    const total = subtotal + taxTotal;

    return { items: validatedItems, subtotal, taxTotal, total };
  }

  private async checkStockAvailability(
    items: { productId: string; quantity: number }[],
  ) {
    for (const item of items) {
      const product = await this.productsRepository.findOne({
        where: { id: item.productId },
      });

      if (!product) {
        throw new BadRequestException(
          `Produit avec l'ID ${item.productId} non trouvé`,
        );
      }

      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Stock insuffisant pour le produit ${product.name}. Disponible: ${product.stock}, demandé: ${item.quantity}`,
        );
      }
    }
  }

  private async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    // Compter les commandes du jour
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const count = await this.ordersRepository.count({
      where: {
        orderDate: Between(startOfDay, endOfDay),
      },
    });

    const sequence = (count + 1).toString().padStart(4, '0');
    return `CMD-${year}${month}${day}-${sequence}`;
  }

  async getOrderDetails(orderId: string): Promise<ShopOrderResponseDto> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'customer', 'invoice'],
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      shippingAddress: order.shippingAddress,
      subtotal: order.subtotal,
      taxTotal: order.taxTotal,
      total: order.total,
      paymentMethod: order.paymentMethod,
      status: order.status,
      paymentStatus: order.paymentStatus,
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
      orderDate: order.orderDate,
      invoiceId: order.invoiceId,
    };
  }

  async getOrderByNumber(orderNumber: string): Promise<ShopOrderResponseDto> {
    const order = await this.ordersRepository.findOne({
      where: { orderNumber },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    return this.getOrderDetails(order.id);
  }

  async getCustomerOrders(customerId: string): Promise<ShopOrderResponseDto[]> {
    const orders = await this.ordersRepository.find({
      where: { customerId },
      relations: ['items'],
      order: { orderDate: 'DESC' },
    });

    return Promise.all(orders.map((order) => this.getOrderDetails(order.id)));
  }

  // ============ UTILITAIRES ============

  async checkStock(productId: string, quantity: number): Promise<boolean> {
    const product = await this.productsRepository.findOne({
      where: { id: productId, isActive: true },
    });

    if (!product) {
      throw new NotFoundException('Produit non trouvé');
    }

    return product.stock >= quantity;
  }

  calculateShipping(address: string, city: string, country: string): number {
    // Logique de calcul des frais de livraison
    // À implémenter selon vos besoins
    return 0; // Pour l'instant, livraison gratuite
  }
}
