import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreConfig } from './entities/store-config.entity';
import { UpdateStoreConfigDto } from './dto/update-store-config.dto';

@Injectable()
export class StoreConfigService {
  constructor(
    @InjectRepository(StoreConfig)
    private readonly configRepository: Repository<StoreConfig>,
  ) {}

  // Sanitize partners: ensure each element is a plain object, not an array or primitive
  private sanitizePartners(raw: any[]): any[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter(p => p && typeof p === 'object' && !Array.isArray(p));
  }

  async get(): Promise<StoreConfig> {
    const defaultFeatures = [
      { id: 'deferred_payments', label: 'Paiements différés', description: 'Permettre aux clients de payer en plusieurs fois avec échéancier', enabled: true, category: 'finance', icon: 'Building2' },
      { id: 'custom_packs', label: 'Packs personnalisés', description: 'Les clients peuvent créer des packs produits avec remise automatique', enabled: true, category: 'commerce', icon: 'Sparkles' },
      { id: 'promotions', label: 'Promotions & codes promo', description: 'Gérer des promotions, codes de réduction et offres spéciales', enabled: true, category: 'marketing', icon: 'Tag' },
      { id: 'loyalty', label: 'Programme de fidélité', description: 'Récompenser les clients fidèles avec des points et avantages', enabled: true, category: 'customer', icon: 'Crown' },
      { id: 'wishlist', label: 'Liste de souhaits', description: 'Permettre aux clients de sauvegarder des produits favoris', enabled: true, category: 'customer', icon: 'Heart' },
      { id: 'delivery', label: 'Gestion des livraisons', description: 'Zones de livraison, frais calculés et suivi des expéditions', enabled: true, category: 'logistics', icon: 'Truck' },
      { id: 'invoices', label: 'Facturation', description: 'Génération et gestion des factures clients', enabled: true, category: 'finance', icon: 'Receipt' },
      { id: 'currencies', label: 'Multi-devises', description: 'Gérer plusieurs devises et taux de change', enabled: true, category: 'finance', icon: 'Coins' },
      { id: 'banners', label: 'Bannières publicitaires', description: 'Gérer les bannières et visuels promotionnels', enabled: true, category: 'marketing', icon: 'Image' },
      { id: 'product_compare', label: 'Comparaison de produits', description: 'Permettre aux clients de comparer des produits côte à côte', enabled: true, category: 'customer', icon: 'ArrowLeftRight' },
      { id: 'reviews', label: 'Avis clients', description: 'Permettre aux clients de noter et commenter les produits', enabled: true, category: 'customer', icon: 'Star' },
      { id: 'saved_carts', label: 'Paniers sauvegardés', description: 'Sauvegarder des paniers pour les clients récurrents', enabled: true, category: 'commerce', icon: 'ShoppingBag' },
      { id: 'marketplace', label: 'Marketplace', description: 'Activer les outils de place de marché multi-vendeurs', enabled: false, category: 'commerce', icon: 'Building2' },
      { id: 'subscriptions', label: 'Abonnements', description: 'Vendre des abonnements et paiements récurrents', enabled: false, category: 'finance', icon: 'Receipt' },
      { id: 'b2b_portal', label: 'Portail B2B', description: 'Interface de vente en gros avec prix sur mesure', enabled: false, category: 'commerce', icon: 'Building' }
    ];

    let config = await this.configRepository.findOne({ where: { id: 'default' } });
    
    if (!config) {
      config = this.configRepository.create({
        id: 'default',
        identity: {
          storeName: 'NexaFlow Store',
          storeSlogan: 'Votre solution de gestion innovante',
          contactEmail: 'contact@nexaflow.com',
          contactPhone: '+228 90 00 00 00',
          contactAddress: 'Quartier Administratif, Lomé',
          city: 'Lomé',
          country: 'Togo',
          logoUrl: '',
          faviconUrl: '',
          socialLinks: {
            facebook: 'https://facebook.com',
            instagram: 'https://instagram.com',
            whatsapp: '+22890000000',
            twitter: 'https://x.com',
            tiktok: 'https://tiktok.com'
          }
        },
        checkout: {
          guestCheckoutEnabled: true,
          minimumOrderAmount: 0,
          paymentMethods: [
            { id: 'mobile_money', name: 'Mobile Money', description: 'Paiement via TMoney ou Moov Money', enabled: true, instructions: 'Veuillez effectuer le transfert au numéro ci-dessous puis validez votre commande.', details: { number: '+228 90 00 00 00', owner: 'NexaFlow SARL' } },
            { id: 'bank_transfer', name: 'Virement Bancaire', description: 'Virement sur notre compte bancaire', enabled: true, instructions: 'Veuillez effectuer le virement sur le compte suivant. Votre commande sera traitée après réception.', details: { bank: 'UTB Togo', iban: 'TG12 0000 0000 0000 0000 00', owner: 'NexaFlow SARL' } },
            { id: 'cash', name: 'Paiement à la livraison', description: 'Payez en espèces lors de la réception', enabled: true, instructions: 'Veuillez préparer le montant exact pour faciliter la remise par le livreur.', details: {} }
          ],
          tax: { defaultTaxRate: 18, taxLabel: 'TVA', pricesIncludeTax: false, taxId: '' }
        },
        content: {
          welcomeTitle: 'Bienvenue sur NexaFlow',
          announcementBar: { enabled: true, message: '🚚 Livraison gratuite!' }
        },
        partners: [],
        features: defaultFeatures,
        appearance: { theme: 'blue', darkMode: false, language: 'fr' },
        security: { jwtExpiresIn: '24h', idleTimeoutMinutes: 30, autoLockEnabled: true }
      });
      return this.configRepository.save(config);
    }

    // Upgrade logic: ensure all required fields exist
    let changed = false;
    if (!config.features || config.features.length < defaultFeatures.length) {
      const existingIds = new Set((config.features || []).map(f => f.id));
      const missing = defaultFeatures.filter(f => !existingIds.has(f.id));
      if (missing.length > 0) {
        config.features = [...(config.features || []), ...missing];
        changed = true;
      }
    }
    if (config.identity && !config.identity.socialLinks) {
      config.identity = { ...config.identity, socialLinks: { facebook: '', instagram: '', whatsapp: '', twitter: '', tiktok: '' } };
      changed = true;
    }
    
    // Upgrade payment methods if they are empty
    if (!config.checkout.paymentMethods || config.checkout.paymentMethods.length === 0) {
      config.checkout.paymentMethods = [
        { id: 'mobile_money', name: 'Mobile Money', description: 'Paiement via TMoney ou Moov Money', enabled: true, instructions: 'Veuillez effectuer le transfert au numéro ci-dessous puis validez votre commande.', details: { number: '+228 90 00 00 00', owner: 'NexaFlow SARL' } },
        { id: 'bank_transfer', name: 'Virement Bancaire', description: 'Virement sur notre compte bancaire', enabled: true, instructions: 'Veuillez effectuer le virement sur le compte suivant. Votre commande sera traitée après réception.', details: { bank: 'UTB Togo', iban: 'TG12 0000 0000 0000 0000 00', owner: 'NexaFlow SARL' } },
        { id: 'cash', name: 'Paiement à la livraison', description: 'Payez en espèces lors de la réception', enabled: true, instructions: 'Veuillez préparer le montant exact pour faciliter la remise par le livreur.', details: {} }
      ];
      changed = true;
    }

    if (!config.appearance) {
      config.appearance = { theme: 'blue', darkMode: false, language: 'fr' };
      changed = true;
    }

    if (!config.security) {
      config.security = { jwtExpiresIn: '24h', idleTimeoutMinutes: 30, autoLockEnabled: true };
      changed = true;
    }

    if (changed) {
      return this.configRepository.save(config);
    }
    
    return config;
  }

  async update(updateStoreConfigDto: UpdateStoreConfigDto): Promise<StoreConfig> {
    const config = await this.get();
    
    if (updateStoreConfigDto.identity) {
      config.identity = { ...config.identity, ...updateStoreConfigDto.identity };
    }
    if (updateStoreConfigDto.checkout) {
      config.checkout = { ...config.checkout, ...updateStoreConfigDto.checkout };
    }
    if (updateStoreConfigDto.content) {
      config.content = { ...config.content, ...updateStoreConfigDto.content };
    }
    if (updateStoreConfigDto.partners !== undefined) {
      config.partners = updateStoreConfigDto.partners;
    }
    if (updateStoreConfigDto.features) {
      config.features = updateStoreConfigDto.features;
    }
    if (updateStoreConfigDto.appearance) {
      config.appearance = { ...config.appearance, ...updateStoreConfigDto.appearance };
    }
    if (updateStoreConfigDto.security) {
      config.security = { ...config.security, ...updateStoreConfigDto.security };
    }

    // Setting the WHOLE object/array ensures TypeORM detects the change on JSONB columns
    return this.configRepository.save(config);
  }
}
  