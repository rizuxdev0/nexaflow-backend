/**
 * Seed script: Products
 * Usage: npx ts-node -r tsconfig-paths/register src/database/seeds/03-products.seed.ts
 *
 * Creates ~15 rich products with realistic data, linked to the newly created categories.
 */

import 'reflect-metadata';
import { config } from 'dotenv';
config();

import { DataSource, In } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Category } from '../../modules/categories/entities/category.entity';

// ── Helpers ─────────────────────────────────────────────────────────────────
function generateSlug(name: string) {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function generateSKU(prefix: string) {
  return `${prefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

function generateBarcode() {
  return Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const dataSource = new DataSource(dataSourceOptions);

  try {
    await dataSource.initialize();
    console.log('✅ Base de données connectée');

    const categoryRepo = dataSource.getRepository(Category);
    const productRepo = dataSource.getRepository('Product'); // Using string fallback

    // Map of categories by name
    const cats = await categoryRepo.find();
    if (cats.length === 0) {
      console.log('❌ Aucune catégorie existante. Veuillez lancer le seed des catégories en premier.');
      return;
    }
    
    const getCatId = (name: string) => {
      const c = cats.find(c => c.name === name);
      if (!c) console.warn(`⚠️ Catégorie "${name}" introuvable. Les produits seront sans catégorie.`);
      return c?.id || null;
    };

    const productsData = [
      // ÉLECTRONIQUE (Smartphones)
      {
        name: 'iPhone 15 Pro Max',
        description: 'Le dernier smartphone d\'Apple avec puce A17 Pro et en titane.',
        price: 950000,
        costPrice: 800000,
        stock: 12,
        minStock: 3,
        categoryId: getCatId('Smartphones & Téléphonie'),
        brand: 'Apple',
        images: ['https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&q=80'],
        attributes: { os: 'iOS', storage_gb: 256, color: 'Titane Naturel' },
        taxRate: 18,
        tags: ['smartphone', 'apple', 'premium'],
      },
      {
        name: 'Samsung Galaxy S24 Ultra',
        description: 'Smartphone Android haut de gamme avec IA intégrée et S-Pen.',
        price: 880000,
        costPrice: 750000,
        stock: 8,
        minStock: 2,
        categoryId: getCatId('Smartphones & Téléphonie'),
        brand: 'Samsung',
        images: ['https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400&q=80'], // generic modern phone
        attributes: { os: 'Android', storage_gb: 512, color: 'Noir Onyx' },
        taxRate: 18,
        tags: ['smartphone', 'samsung', 'android'],
      },
      // ÉLECTRONIQUE (Ordinateurs)
      {
        name: 'MacBook Pro 16" M3 Max',
        description: 'Pour les créateurs de contenu exigeants. 36Go RAM, 1To SSD.',
        price: 2100000,
        costPrice: 1850000,
        stock: 5,
        minStock: 1,
        categoryId: getCatId('Ordinateurs & Tablettes'),
        brand: 'Apple',
        images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80'],
        attributes: { type: 'Laptop', cpu: 'M3 Max', ram_gb: 36, storage_gb: 1000 },
        taxRate: 18,
        tags: ['ordinateur', 'laptop', 'pro'],
      },
      // VÊTEMENTS (Hommes)
      {
        name: 'Chemise en Lin Coupe Droite',
        description: 'Chemise blanche 100% lin parfaite pour les journées d\'été.',
        price: 18000,
        costPrice: 8500,
        stock: 45,
        minStock: 10,
        categoryId: getCatId('Vêtements Homme'),
        brand: 'Zara',
        images: ['https://images.unsplash.com/photo-1596755094514-f87e32f85e2c?w=400&q=80'],
        attributes: { size: 'M', clothing_type: 'Chemise', material: 'Lin', color: 'Blanc' },
        taxRate: 18,
        tags: ['mode', 'chemise', 'été'],
      },
      {
        name: 'Costume Bleu Nuit Slim Fit',
        description: 'Ensemble élégant 2 pièces pour les cérémonies et mariages.',
        price: 85000,
        costPrice: 40000,
        stock: 15,
        minStock: 3,
        categoryId: getCatId('Vêtements Homme'),
        brand: 'Hugo Boss',
        images: ['https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=400&q=80'],
        attributes: { size: 'L', clothing_type: 'Costume', color: 'Bleu Nuit' },
        taxRate: 18,
        tags: ['costume', 'mariage', 'chic'],
      },
      // VÊTEMENTS (Femmes)
      {
        name: 'Robe de Soirée Rouge Satin',
        description: 'Robe longue fendue avec une couleur rouge passion et texture satinée.',
        price: 35000,
        costPrice: 15000,
        stock: 20,
        minStock: 5,
        categoryId: getCatId('Vêtements Femme'),
        brand: 'Mango',
        images: ['https://images.unsplash.com/photo-1515347619152-47db6a72e796?w=400&q=80'],
        attributes: { size: 'S', clothing_type: 'Robe', color: 'Rouge', material: 'Satin' },
        taxRate: 18,
        tags: ['robe', 'soirée', 'femme'],
      },
      // VÊTEMENTS (Chaussures)
      {
        name: 'Sneakers Nike Air Max 2024',
        description: 'Confort absolu pour vos entrainements ou balades citadines.',
        price: 65000,
        costPrice: 38000,
        stock: 32,
        minStock: 8,
        categoryId: getCatId('Chaussures'),
        brand: 'Nike',
        images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80'],
        attributes: { shoe_size: 42, shoe_type: 'Sneakers', gender: 'Homme' },
        taxRate: 18,
        tags: ['sneakers', 'nike', 'sport'],
      },
      // MAISON (Électroménager)
      {
        name: 'Machine à laver LG TurboWash',
        description: 'Lave-linge frontal 9kg avec moteur Inverter Direct Drive super silencieux.',
        price: 250000,
        costPrice: 190000,
        stock: 6,
        minStock: 2,
        categoryId: getCatId('Électroménager'),
        brand: 'LG',
        images: ['https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=400&q=80'],
        attributes: { capacity_l: 9, energy_class: 'A+++' },
        taxRate: 18,
        tags: ['maison', 'lg', 'lavage'],
      },
      {
        name: 'Réfrigérateur Américain Samsung',
        description: 'Frigo double porte avec distributeur d\'eau et glaçons.',
        price: 520000,
        costPrice: 400000,
        stock: 3,
        minStock: 1,
        categoryId: getCatId('Électroménager'),
        brand: 'Samsung',
        images: ['https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=400&q=80'],
        attributes: { capacity_l: 550, energy_class: 'A++' },
        taxRate: 18,
        tags: ['cuisine', 'frigo'],
      },
      // MAISON (Décoration & Mobilier)
      {
        name: 'Canapé d\'angle Velours Gris',
        description: 'Sofa généreux 5 places en velours premium, très confortable.',
        price: 450000,
        costPrice: 280000,
        stock: 4,
        minStock: 1,
        categoryId: getCatId('Décoration & Mobilier'),
        brand: 'IKEA',
        images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80'],
        attributes: { material: 'Tissu', style: 'Scandinave', color: 'Gris' },
        taxRate: 18,
        tags: ['mobilier', 'salon'],
      },
      // BEAUTÉ (Soins Visage)
      {
        name: 'Sérum Hydratant Acide Hyaluronique',
        description: 'Sérum ultra-concentré pour lisser la peau et repulper les ridules.',
        price: 22500,
        costPrice: 9000,
        stock: 80,
        minStock: 15,
        categoryId: getCatId('Soins du Visage & Corps'),
        brand: 'The Ordinary',
        images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&q=80'],
        attributes: { care_type: 'Hydratant', volume_ml: 30, skin_type: 'Tous types' },
        taxRate: 18,
        tags: ['soin', 'sérum', 'visage'],
      },
      // BEAUTÉ (Maquillage)
      {
        name: 'Rouge à Lèvres Mat Intense',
        description: 'Tenue 24h, couleur riche et vibrante sans assécher les lèvres.',
        price: 15000,
        costPrice: 5500,
        stock: 120,
        minStock: 20,
        categoryId: getCatId('Maquillage'),
        brand: 'MAC',
        images: ['https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&q=80'],
        attributes: { shade: 'Ruby Woo', finish: 'Mat' },
        taxRate: 18,
        tags: ['maquillage', 'lèvres'],
      },
      // SPORT (Fitness)
      {
        name: 'Haltères Ajustables 24kg',
        description: 'Remplacez 15 paires d\'haltères classiques par un seul système ajustable très ingénieux.',
        price: 110000,
        costPrice: 65000,
        stock: 10,
        minStock: 2,
        categoryId: getCatId('Fitness & Musculation'),
        brand: 'Bowflex',
        images: ['https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=400&q=80'],
        attributes: { weight_kg: 24, material: 'Acier' },
        taxRate: 18,
        tags: ['musculation', 'fitness', 'haltère'],
      },
      // SPORT (Collectifs)
      {
        name: 'Ballon de Football Officiel Ligue des Champions',
        description: 'Ballon match certifié FIFA hautement résistant, taille 5 standard.',
        price: 35000,
        costPrice: 16000,
        stock: 50,
        minStock: 10,
        categoryId: getCatId('Sports Collectifs'),
        brand: 'Adidas',
        images: ['https://images.unsplash.com/photo-1614632537190-23e4146777db?w=400&q=80'],
        attributes: { sport: 'Football', ball_size: '5' },
        taxRate: 18,
        tags: ['sport', 'football', 'ballon'],
      },
      // ALIMENTATION
      {
        name: 'Miel Miel 100% Naturel - 1kg',
        description: 'Miel cru de la région savane, non pasteurisé pour conserver ses vertus naturelles.',
        price: 8500,
        costPrice: 5000,
        stock: 150,
        minStock: 30,
        categoryId: getCatId('Alimentation & Boissons'),
        brand: 'Terroir Bio',
        images: ['https://images.unsplash.com/photo-1587049352847-4d4b1ed4990e?w=400&q=80'],
        attributes: { weight_volume: '1kg', is_organic: true, expiry_date: '2028-12-31' },
        taxRate: 0,
        tags: ['miel', 'bio', 'alimentation'],
      },
    ];

    let created = 0;
    let skipped = 0;

    for (const prod of productsData) {
      if (!prod.categoryId) {
        skipped++;
        continue; // skip if category couldn't be linked
      }

      const existingProd = await productRepo.findOne({ where: { name: prod.name } });
      
      const pData: any = {
        name: prod.name,
        slug: generateSlug(prod.name),
        description: prod.description,
        price: prod.price,
        costPrice: prod.costPrice,
        stock: prod.stock,
        minStock: prod.minStock,
        categoryId: prod.categoryId,
        brand: prod.brand,
        images: prod.images,
        attributes: prod.attributes,
        taxRate: prod.taxRate,
        tags: prod.tags,
        isActive: true,
      };

      if (!existingProd) {
        pData.sku = generateSKU('PN');
        pData.barcode = generateBarcode();
        const entity = productRepo.create(pData);
        await productRepo.save(entity);
        console.log(`✅ Produit créé: "${prod.name}"`);
        created++;
      } else {
        await productRepo.update(existingProd.id, pData);
        console.log(`⏭  Produit "${prod.name}" déjà existant, mis à jour`);
        skipped++;
      }
    }

    console.log(`\n🎉 Seeding Produits terminé ! ${created} créés, ${skipped} mis à jour.`);
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await dataSource.destroy();
  }
}

main();
