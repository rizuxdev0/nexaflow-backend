import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreConfig } from './entities/store-config.entity';
import { UpdateStoreConfigDto } from './dto/update-store-config.dto';
import { PLAN_QUOTAS, SubscriptionPlan } from './subscription-plans';

@Injectable()
export class StoreConfigService {
  private readonly DEFAULT_FEATURES = [
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
    { id: 'b2b_portal', label: 'Portail B2B', description: 'Interface de vente en gros avec prix sur mesure', enabled: false, category: 'commerce', icon: 'Building' },
    { id: 'chat', label: 'Chat Support', description: 'Activer le système de chat en temps réel pour le support client', enabled: true, category: 'customer', icon: 'MessageSquare' }
  ];

  constructor(
    @InjectRepository(StoreConfig)
    private readonly configRepository: Repository<StoreConfig>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getPlanQuotas(plan: SubscriptionPlan) {
    return PLAN_QUOTAS[plan];
  }

  // Sanitize partners: ensure each element is a plain object, not an array or primitive
  private sanitizePartners(raw: any[]): any[] {
    if (!raw) return [];
    if (!Array.isArray(raw)) {
       console.warn('Partners is not an array:', typeof raw);
       return [];
    }
    return raw.filter(p => p && typeof p === 'object' && !Array.isArray(p));
  }

  async get(): Promise<StoreConfig> {
    const defaultPasswordPolicy = {
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
      preventCommonPasswords: true,
      expirationDays: 0,
    };

    const defaultFeatures = this.DEFAULT_FEATURES;

    let config = await this.configRepository.findOne({ where: { id: 'default' } });
    
    if (!config) {
      config = this.configRepository.create({
        id: 'default',
        subscriptionPlan: SubscriptionPlan.STARTER,
        subscriptionStatus: 'active',
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
        security: { 
          jwtExpiresIn: '24h', 
          idleTimeoutMinutes: 30, 
          autoLockEnabled: true,
          passwordPolicy: defaultPasswordPolicy
        }
      });
      const saved = await this.configRepository.save(config);
      await (this.cacheManager as any).clear();
      return saved;
    }

    // Upgrade & Integrity logic: ensure all required fields exist
    let changed = false;
    
    // 1. Ensure count and basic structure
    if (!config.features || !Array.isArray(config.features)) {
      config.features = defaultFeatures;
      changed = true;
    } else {
      // 2. Clear duplicates (MANDATORY FIX)
      const uniqueFeatures: any[] = [];
      const seenIds = new Set();
      
      // We iterate to find real duplicates
      for (const f of config.features) {
        if (!f || !f.id) {
          changed = true; // Malformed item
          continue;
        }
        if (!seenIds.has(f.id)) {
          uniqueFeatures.push(f);
          seenIds.add(f.id);
        } else {
          changed = true; // Duplicate ID found
        }
      }

      // 3. Deep Integrity Check: restore metadata for all 15 features
      const correctedFeatures: any[] = uniqueFeatures.map(f => {
        const def = defaultFeatures.find(d => d.id === f.id);
        if (def) {
          // Check if any critical field is missing
          const isMissingData = !f.label || !f.category || !f.icon || !f.description;
          if (isMissingData) {
            changed = true;
            return { ...def, enabled: !!f.enabled };
          }
        }
        return f;
      });

      // 4. Missing Features Check
      const finalIds = new Set(correctedFeatures.map(f => f.id));
      const missing = defaultFeatures.filter(f => !finalIds.has(f.id));
      
      if (missing.length > 0) {
        config.features = [...correctedFeatures, ...missing];
        changed = true;
      } else if (changed || correctedFeatures.length !== config.features.length) {
        config.features = correctedFeatures;
        changed = true;
      }
    }
    if (config.identity && !config.identity.socialLinks) {
      config.identity = { ...config.identity, socialLinks: { facebook: '', instagram: '', whatsapp: '', twitter: '', tiktok: '' } };
      changed = true;
    }

    // 5. Sanitize Partners
    const sanitizedPartners = this.sanitizePartners(config.partners || []);
    if (sanitizedPartners.length !== (config.partners || []).length) {
      config.partners = sanitizedPartners;
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
      config.security = { 
        jwtExpiresIn: '24h', 
        idleTimeoutMinutes: 30, 
        autoLockEnabled: true,
        passwordPolicy: defaultPasswordPolicy
      };
      changed = true;
    } else if (!config.security.passwordPolicy) {
      config.security.passwordPolicy = defaultPasswordPolicy;
      changed = true;
    }

    if (changed) {
      console.log('Force-syncing store configuration because changes were detected...');
      await this.configRepository.query(
        `UPDATE store_config 
         SET identity = $1::jsonb, 
             checkout = $2::jsonb, 
             content = $3::jsonb, 
             partners = $4::jsonb, 
             features = $5::jsonb, 
             appearance = $6::jsonb, 
             security = $7::jsonb,
             pixels = $8::jsonb,
             seo = $9::jsonb,
             social = $10::jsonb,
             "updatedAt" = NOW()
         WHERE id = 'default'`,
        [
          JSON.stringify(config.identity || {}),
          JSON.stringify(config.checkout || {}),
          JSON.stringify(config.content || {}),
          JSON.stringify(config.partners || []),
          JSON.stringify(config.features || []),
          JSON.stringify(config.appearance || {}),
          JSON.stringify(config.security || {}),
          JSON.stringify(config.pixels || {}),
          JSON.stringify(config.seo || {}),
          JSON.stringify(config.social || {}),
        ],
      );
      await (this.cacheManager as any).clear();
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
      let partnersPayload = updateStoreConfigDto.partners;
      
      // LOG TRÈS PRÉCIS POUR DÉBOGUER
      console.log('--- PARTNERS UPDATE DEBUG ---');
      console.log('Raw Payload Type:', typeof partnersPayload);
      console.log('Is Array:', Array.isArray(partnersPayload));
      console.log('Content JSON:', JSON.stringify(partnersPayload));

      // Sécurité : si on reçoit [ [partners] ], on aplatit
      if (Array.isArray(partnersPayload) && partnersPayload.length === 1 && Array.isArray(partnersPayload[0])) {
        console.log('DETECTED NESTED ARRAY [[]] - Flattening...');
        partnersPayload = partnersPayload[0];
      }

      config.partners = Array.isArray(partnersPayload) ? partnersPayload : [];
      console.log('Final partners to save count:', config.partners.length);
      console.log('-----------------------------');
    }
    if (updateStoreConfigDto.features) {
      const defaultFeatures = this.DEFAULT_FEATURES;

      // Robust merge: prioritize static data from defaults, take 'enabled' from DTO
      config.features = updateStoreConfigDto.features.map(f => {
        const def = defaultFeatures.find(d => d.id === f.id);
        if (def) {
          return { ...def, enabled: !!f.enabled };
        }
        return f; // Keep as is if not in defaults (shouldn't happen)
      });
    }
    if (updateStoreConfigDto.appearance) {
      config.appearance = { ...config.appearance, ...updateStoreConfigDto.appearance };
    }
    if (updateStoreConfigDto.security) {
      config.security = { ...config.security, ...updateStoreConfigDto.security };
    }

    // 👈 FORCED SYNC: Use a more direct update method with explicit casts
    // We use raw SQL with ::jsonb to ensure Postgres correctly interprets the strings
    const debug = {
      received: !!updateStoreConfigDto.partners,
      count: updateStoreConfigDto.partners?.length || 0,
      sanitized: config.partners?.length || 0,
      timestamp: new Date().toISOString()
    };

    await this.configRepository.query(
      `UPDATE store_config 
       SET identity = $1::jsonb, 
           checkout = $2::jsonb, 
           content = $3::jsonb, 
           partners = $4::jsonb, 
           features = $5::jsonb, 
           appearance = $6::jsonb, 
           security = $7::jsonb,
           pixels = $8::jsonb,
           seo = $9::jsonb,
           social = $10::jsonb,
           "updatedAt" = NOW()
       WHERE id = 'default'`,
      [
        JSON.stringify(config.identity || {}),
        JSON.stringify(config.checkout || {}),
        JSON.stringify(config.content || {}),
        JSON.stringify(config.partners || []),
        JSON.stringify(config.features || []),
        JSON.stringify(config.appearance || {}),
        JSON.stringify(config.security || {}),
        JSON.stringify(config.pixels || {}),
        JSON.stringify(config.seo || {}),
        JSON.stringify(config.social || {}),
      ],
    );
    
    await (this.cacheManager as any).clear();

    return { ...config, _debug: debug } as any;
  }
}
  