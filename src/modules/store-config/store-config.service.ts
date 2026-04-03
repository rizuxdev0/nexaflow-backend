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
            { id: 'cash', name: 'Espèces', enabled: true, icon: 'Banknote', description: 'Paiement à la livraison' },
            { id: 'card', name: 'Carte bancaire', enabled: true, icon: 'CreditCard', description: 'Visa, Mastercard' },
            { id: 'transfer', name: 'Virement bancaire', enabled: true, icon: 'Building', description: 'Transfert direct' },
            { id: 'mobile', name: 'Mobile Money', enabled: true, icon: 'Smartphone', description: 'T-Money, Flooz, Wave' }
          ],
          tax: {
            defaultTaxRate: 18,
            taxLabel: 'TVA',
            pricesIncludeTax: false,
            taxId: ''
          },
          orderPrefix: 'NXF',
          termsRequired: true,
          notesEnabled: true
        },
        content: {
          welcomeTitle: 'Bienvenue sur NexaFlow',
          welcomeSubtitle: 'Découvrez notre catalogue de produits exceptionnels',
          sections: [
            { id: 'hero', label: 'Bannière Hero', enabled: true },
            { id: 'featured', label: 'Produits vedettes', enabled: true },
            { id: 'categories', label: 'Catégories', enabled: true },
            { id: 'best-sellers', label: 'Meilleures ventes', enabled: true }
          ],
          legalPages: [
            { id: 'terms', title: 'Conditions Générales de Vente', content: '## CGV\n\nBienvenue...', enabled: true, updatedAt: new Date().toISOString() },
            { id: 'privacy', title: 'Politique de Confidentialité', content: '## Confidentialité\n\nNous respectons...', enabled: true, updatedAt: new Date().toISOString() },
            { id: 'legal', title: 'Mentions Légales', content: '## Mentions Légales\n\nRaison sociale...', enabled: true, updatedAt: new Date().toISOString() }
          ],
          footerText: '© 2026 NexaFlow Store. Tous droits réservés.',
          announcementBar: {
            enabled: true,
            message: '🚚 Livraison gratuite à partir de 50 000 FCFA !'
          }
        },
        partners: [
          { id: 'p1', name: 'Samsung', logoUrl: '', website: 'https://samsung.com', enabled: true },
          { id: 'p2', name: 'Apple', logoUrl: '', website: 'https://apple.com', enabled: true }
        ],
        features: defaultFeatures,
        appearance: {
          theme: 'blue',
          darkMode: false,
          language: 'fr'
        }
      });
      await this.configRepository.save(config);
    } else {
      // Sanitize partners on read to auto-fix any corrupted data (e.g. [[], []])
      if (Array.isArray(config.partners)) {
        const clean = this.sanitizePartners(config.partners);
        if (clean.length !== config.partners.length) {
          config.partners = clean;
        }
      }
      // Sync missing features into existing config (Upgrade logic)
      let changed = false;
      // Clean sync logic: Rebuild the features list based on ID to prevent duplicates and data corruption
      const existingFeatures = Array.isArray(config.features) ? config.features : [];
      const updatedFeatures = defaultFeatures.map(def => {
        const existing = existingFeatures.find(f => f && f.id === def.id);
        return existing ? { ...def, ...existing } : def;
      });

      // If lengths differ or missing IDs, update the entry.
      // Do a simple check instead of JSON.stringify to avoid key order issues
      const needsUpdate = existingFeatures.length !== updatedFeatures.length || 
                          updatedFeatures.some((uf, i) => !existingFeatures[i] || existingFeatures[i].id !== uf.id);
      
      if (needsUpdate) {
        config.features = updatedFeatures;
        changed = true;
      }
      
      // Ensure identity has socialLinks even in old configs
      if (config.identity && !config.identity.socialLinks) {
        config.identity.socialLinks = {
          facebook: 'https://facebook.com',
          instagram: 'https://instagram.com',
          whatsapp: '+22890000000',
          twitter: 'https://x.com',
          tiktok: 'https://tiktok.com'
        };
        changed = true;
      }

      // Ensure appearance exists for old configs
      if (!config.appearance) {
        config.appearance = {
          theme: 'blue',
          darkMode: false,
          language: 'fr'
        };
        changed = true;
      }

      if (changed) {
        // Use raw SQL to avoid TypeORM JSONB tracking bugs that would overwrite other columns
        await this.configRepository.query(
          `UPDATE store_config SET
            identity  = $1::jsonb,
            checkout  = $2::jsonb,
            content   = $3::jsonb,
            seo       = $4::jsonb,
            social    = $5::jsonb,
            partners  = $6::jsonb,
            features  = $7::jsonb,
            appearance = $8::jsonb,
            "updatedAt" = NOW()
           WHERE id = 'default'`,
          [
            JSON.stringify(config.identity || {}),
            JSON.stringify(config.checkout || {}),
            JSON.stringify(config.content || {}),
            JSON.stringify(config.seo || {}),
            JSON.stringify(config.social || {}),
            JSON.stringify(Array.isArray(config.partners) ? config.partners : []),
            JSON.stringify(Array.isArray(config.features) ? config.features : []),
            JSON.stringify(config.appearance || {}),
          ]
        );
        // Reload fresh from DB so we return the true persisted state
        config = (await this.configRepository.findOne({ where: { id: 'default' } }))!;
      }
    }
    
    return config;
  }

  async update(updateStoreConfigDto: UpdateStoreConfigDto): Promise<StoreConfig> {
    const config = await this.get();
    
    // Deep merge for nested objects to prevent data loss on partial updates
    if (updateStoreConfigDto.identity) {
      config.identity = { ...config.identity, ...updateStoreConfigDto.identity };
    }
    if (updateStoreConfigDto.checkout) {
      config.checkout = { ...config.checkout, ...updateStoreConfigDto.checkout };
      if (updateStoreConfigDto.checkout.tax) {
        config.checkout.tax = { ...config.checkout.tax, ...updateStoreConfigDto.checkout.tax };
      }
    }
    if (updateStoreConfigDto.content) {
      config.content = { ...config.content, ...updateStoreConfigDto.content };
      if (updateStoreConfigDto.content.announcementBar) {
        config.content.announcementBar = { ...config.content.announcementBar, ...updateStoreConfigDto.content.announcementBar };
      }
    }
    
    // Overwrite arrays entirely — sanitize to prevent corrupted [[], []] from entering DB
    if (updateStoreConfigDto.partners !== undefined) {
      config.partners = this.sanitizePartners(
        JSON.parse(JSON.stringify(updateStoreConfigDto.partners))
      );
    }
    if (updateStoreConfigDto.features) {
      config.features = JSON.parse(JSON.stringify(updateStoreConfigDto.features));
    }
    if (updateStoreConfigDto.appearance) {
      config.appearance = { ...config.appearance, ...updateStoreConfigDto.appearance };
    }

    // Use raw SQL to 100% guarantee JSONB columns are written correctly,
    // bypassing all TypeORM entity tracking and serialization issues.
    await this.configRepository.query(
      `UPDATE store_config SET
        identity  = $1::jsonb,
        checkout  = $2::jsonb,
        content   = $3::jsonb,
        seo       = $4::jsonb,
        social    = $5::jsonb,
        partners  = $6::jsonb,
        features  = $7::jsonb,
        appearance = $8::jsonb,
        "updatedAt" = NOW()
       WHERE id = 'default'`,
      [
        JSON.stringify(config.identity || {}),
        JSON.stringify(config.checkout || {}),
        JSON.stringify(config.content || {}),
        JSON.stringify(config.seo || {}),
        JSON.stringify(config.social || {}),
        JSON.stringify(Array.isArray(config.partners) ? config.partners : []),
        JSON.stringify(Array.isArray(config.features) ? config.features : []),
        JSON.stringify(config.appearance || {}),
      ]
    );

    // Read fresh from DB to return the true persisted state
    return this.configRepository.findOne({ where: { id: 'default' } }).then(c => c!);
  }
}
  