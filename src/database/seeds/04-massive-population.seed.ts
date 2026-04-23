/**
 * Seed script: Massive Population
 * Usage: npx ts-node -r tsconfig-paths/register src/database/seeds/04-massive-population.seed.ts
 *
 * Adds 5 products to each category with full data, variants and suppliers.
 */

import 'reflect-metadata';
import { config } from 'dotenv';
config();

import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Category } from '../../modules/categories/entities/category.entity';
import { Product } from '../../modules/products/entities/product.entity';
import { ProductVariant } from '../../modules/products/entities/product-variant.entity';
import { Supplier } from '../../modules/suppliers/entities/supplier.entity';

// ── Helpers ─────────────────────────────────────────────────────────────────
function slug(name: string) {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function sku(prefix: string) {
  return `${prefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

const randomRange = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const dataSource = new DataSource(dataSourceOptions);

  try {
    await dataSource.initialize();
    console.log('✅ Base de données connectée');

    const catRepo = dataSource.getRepository(Category);
    const prodRepo = dataSource.getRepository(Product);
    const variantRepo = dataSource.getRepository(ProductVariant);
    const supplierRepo = dataSource.getRepository(Supplier);

    // 1. Create Suppliers
    const suppliersData = [
      { name: 'Elite Tech Distribution', code: 'SUP-TECH-01', contactName: 'Jean Tech', email: 'contact@elitetech.com', city: 'Dakar', country: 'Sénégal' },
      { name: 'Luxe Fashion Wholesale', code: 'SUP-FASH-01', contactName: 'Marie Mode', email: 'sales@luxefashion.com', city: 'Paris', country: 'France' },
      { name: 'Global Home Solutions', code: 'SUP-HOME-01', contactName: 'Paul Maison', email: 'info@globalsolutions.com', city: 'Casablanca', country: 'Maroc' },
    ];

    const suppliers: Supplier[] = [];
    for (const s of suppliersData) {
      let existing = await supplierRepo.findOne({ where: { code: s.code } });
      if (!existing) {
        existing = await supplierRepo.save(supplierRepo.create({ ...s, address: 'ZAC Zone Industrielle', phone: '+221338000000' }));
        console.log(`✅ Fournisseur créé: ${s.name}`);
      }
      suppliers.push(existing);
    }

    // 2. Get Categories
    const allCategories = await catRepo.find();
    const subCategories = allCategories.filter(c => c.parentId !== null);
    
    if (subCategories.length === 0) {
      console.log('❌ Aucune sous-catégorie trouvée. Lancez d\'abord le seed des catégories.');
      return;
    }

    // 3. Populate each category
    const productsToAdd = [
      // Electronics
      { cat: 'Smartphones & Téléphonie', names: ['Google Pixel 8', 'Xiaomi 13 Pro', 'OnePlus 12', 'Nothing Phone 2', 'Infinix Note 40'], tags: ['smartphone', 'android'], colors: ['Noir', 'Blanc', 'Bleu'], supplier: suppliers[0] },
      { cat: 'Ordinateurs & Tablettes', names: ['Dell XPS 13', 'HP Spectre x360', 'iPad Air M2', 'ASUS Zenbook', 'Lenovo ThinkPad X1'], tags: ['laptop', 'pc'], colors: ['Gris', 'Argent'], supplier: suppliers[0] },
      // Fashion
      { cat: 'Vêtements Homme', names: ['Jean Slim Brut', 'Pull Cachemire', 'Veste Cuir Bomber', 'T-shirt Graphic', 'Polo Sport'], tags: ['mode', 'homme'], sizes: ['S', 'M', 'L', 'XL'], colors: ['Bleu', 'Noir', 'Gris'], supplier: suppliers[1] },
      { cat: 'Vêtements Femme', names: ['Jupe Plissée', 'Chemisier Soie', 'Manteau Laine', 'Pull Mohair', 'Top Dentelle'], tags: ['mode', 'femme'], sizes: ['XS', 'S', 'M', 'L'], colors: ['Rose', 'Beige', 'Noir'], supplier: suppliers[1] },
      { cat: 'Chaussures', names: ['Baskets Run Fast', 'Bottines Cuir', 'Sandales Été', 'Mocassins Daim', 'Escarpins Soirée'], tags: ['chaussures'], sizes: ['38', '40', '42', '44'], colors: ['Brun', 'Noir'], supplier: suppliers[1] },
      // Home
      { cat: 'Électroménager', names: ['Micro-ondes Digital', 'Aspirateur Robot', 'Machine Espresso', 'Bouilloire Design', 'Mélangeur Pro'], tags: ['cuisine', 'maison'], colors: ['Inox', 'Noir'], supplier: suppliers[2] },
      { cat: 'Décoration & Mobilier', names: ['Table Basse Chêne', 'Lampe Trépied', 'Miroir Mural Or', 'Étagère Industrielle', 'Fauteuil Relax'], tags: ['déco', 'maison'], colors: ['Naturel', 'Noir'], supplier: suppliers[2] },
    ];

    for (const group of productsToAdd) {
      const cat = subCategories.find(c => c.name === group.cat);
      if (!cat) continue;

      console.log(`\n📦 Peuplement de la catégorie: ${cat.name}`);

      for (const name of group.names) {
        let existing = await prodRepo.findOne({ where: { name, categoryId: cat.id } });
        if (existing) {
          console.log(`  ⏭  Produit "${name}" existe déjà.`);
          continue;
        }

        const basePrice = randomRange(15000, 500000);
        const product = await prodRepo.save(prodRepo.create({
          name,
          slug: slug(name),
          description: `Description détaillée pour ${name}. Qualité supérieure et garantie complète.`,
          price: basePrice,
          costPrice: basePrice * 0.7,
          stock: randomRange(20, 100),
          minStock: 5,
          categoryId: cat.id,
          supplierId: group.supplier.id,
          brand: 'NexaBrand',
          isActive: true,
          images: [`https://picsum.photos/seed/${slug(name)}/600/600`],
          tags: group.tags,
          taxRate: 18,
          sku: sku('PRD'),
          barcode: Math.floor(Math.random() * 1000000000000).toString(),
        }));

        console.log(`  ✅ Produit créé: ${name}`);

        // Create variants
        const sizes = (group as any).sizes || [null];
        const colors = (group as any).colors || [null];

        for (const size of sizes) {
          for (const color of colors) {
            if (!size && !color) continue;
            
            const vName = `${name}${color ? ' ' + color : ''}${size ? ' ' + size : ''}`;
            await variantRepo.save(variantRepo.create({
              productId: product.id,
              name: vName,
              sku: sku('VAR'),
              size,
              color,
              stock: randomRange(5, 20),
              priceModifier: size === 'XL' ? 2000 : 0,
              isActive: true,
            }));
          }
        }
        if (sizes.length > 1 || colors.length > 1) {
          console.log(`    🔹 Variations créées pour ${name}`);
        }
      }
    }

    console.log('\n🎉 Population massive terminée avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error);
  } finally {
    await dataSource.destroy();
  }
}

main();
