/**
 * Seed script: Categories
 * Usage: npx ts-node -r tsconfig-paths/register src/database/seeds/02-categories.seed.ts
 *
 * Creates a rich two-level category tree with all fields populated.
 */

import 'reflect-metadata';
import { config } from 'dotenv';
config();

import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';

// ── Helpers ─────────────────────────────────────────────────────────────────
function slug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Data ─────────────────────────────────────────────────────────────────────
const rootCategories = [
  {
    name: 'Électronique & High-Tech',
    description: 'Smartphones, ordinateurs, TV, audio et tous les appareils électroniques du quotidien.',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80',
    customAttributes: [
      { name: 'Marque', key: 'brand', type: 'text', required: true },
      { name: 'Garantie (mois)', key: 'warranty_months', type: 'number', required: false },
      { name: 'Couleur', key: 'color', type: 'select', options: ['Noir', 'Blanc', 'Or', 'Argent', 'Bleu'], required: false },
    ],
    translations: { en: { name: 'Electronics & Tech', description: 'Smartphones, computers, TVs and more.' } },
    sortOrder: 1,
    isActive: true,
    children: [
      {
        name: 'Smartphones & Téléphonie',
        description: 'Téléphones Android, iPhone, accessoires téléphoniques et recharges.',
        image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80',
        customAttributes: [
          { name: 'OS', key: 'os', type: 'select', options: ['Android', 'iOS', 'Autre'], required: true },
          { name: 'Mémoire interne (Go)', key: 'storage_gb', type: 'number', required: true },
          { name: 'RAM (Go)', key: 'ram_gb', type: 'number', required: false },
          { name: 'Taille écran (pouces)', key: 'screen_size', type: 'number', required: false },
        ],
        translations: { en: { name: 'Smartphones & Phones' } },
        sortOrder: 1,
        isActive: true,
      },
      {
        name: 'Ordinateurs & Tablettes',
        description: 'PC portables, de bureau, tablettes tactiles et périphériques.',
        image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&q=80',
        customAttributes: [
          { name: 'Type', key: 'type', type: 'select', options: ['Laptop', 'Desktop', 'Tablette', 'Mini-PC'], required: true },
          { name: 'Processeur', key: 'cpu', type: 'text', required: false },
          { name: 'RAM (Go)', key: 'ram_gb', type: 'number', required: false },
          { name: 'Stockage (Go)', key: 'storage_gb', type: 'number', required: false },
        ],
        translations: { en: { name: 'Computers & Tablets' } },
        sortOrder: 2,
        isActive: true,
      },
      {
        name: 'TV & Audio',
        description: 'Télévisions, enceintes, casques audio, barres de son et home cinéma.',
        image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&q=80',
        customAttributes: [
          { name: 'Taille écran (pouces)', key: 'screen_size', type: 'number', required: false },
          { name: 'Résolution', key: 'resolution', type: 'select', options: ['HD', 'Full HD', '4K', '8K'], required: false },
          { name: 'Connectivité', key: 'connectivity', type: 'select', options: ['WiFi', 'Bluetooth', 'WiFi + BT'], required: false },
        ],
        translations: { en: { name: 'TV & Audio' } },
        sortOrder: 3,
        isActive: true,
      },
      {
        name: 'Accessoires & Câbles',
        description: 'Chargeurs, coques, protections, câbles USB, adaptateurs.',
        image: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&q=80',
        customAttributes: [
          { name: 'Compatibilité', key: 'compatibility', type: 'text', required: false },
          { name: 'Type de connecteur', key: 'connector_type', type: 'select', options: ['USB-C', 'Micro-USB', 'Lightning', 'USB-A', 'Jack 3.5mm'], required: false },
        ],
        translations: { en: { name: 'Accessories & Cables' } },
        sortOrder: 4,
        isActive: true,
      },
    ],
  },
  {
    name: 'Mode & Vêtements',
    description: 'Vêtements homme, femme, enfant. Chaussures, sacs, montres et bijoux de mode.',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&q=80',
    customAttributes: [
      { name: 'Taille', key: 'size', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'], required: true },
      { name: 'Couleur', key: 'color', type: 'text', required: true },
      { name: 'Matière', key: 'material', type: 'text', required: false },
      { name: 'Genre', key: 'gender', type: 'select', options: ['Homme', 'Femme', 'Mixte', 'Enfant'], required: true },
    ],
    translations: { en: { name: 'Fashion & Clothing', description: 'Men, women and children clothing, shoes and accessories.' } },
    sortOrder: 2,
    isActive: true,
    children: [
      {
        name: 'Vêtements Homme',
        description: 'Chemises, pantalons, t-shirts, costumes et vêtements décontractés pour homme.',
        image: 'https://images.unsplash.com/photo-1555069519-127aadecd955?w=400&q=80',
        customAttributes: [
          { name: 'Taille', key: 'size', type: 'select', options: ['S', 'M', 'L', 'XL', 'XXL'], required: true },
          { name: 'Type de vêtement', key: 'clothing_type', type: 'select', options: ['T-shirt', 'Chemise', 'Pantalon', 'Jean', 'Veste', 'Costume', 'Short'], required: false },
        ],
        translations: { en: { name: "Men's Clothing" } },
        sortOrder: 1,
        isActive: true,
      },
      {
        name: 'Vêtements Femme',
        description: 'Robes, tailleurs, tops, jupes et vêtements élégants ou casual pour femme.',
        image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80',
        customAttributes: [
          { name: 'Taille', key: 'size', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL'], required: true },
          { name: 'Type de vêtement', key: 'clothing_type', type: 'select', options: ['Robe', 'Top', 'Jupe', 'Tailleur', 'Combinaison', 'Jean', 'Blouse'], required: false },
        ],
        translations: { en: { name: "Women's Clothing" } },
        sortOrder: 2,
        isActive: true,
      },
      {
        name: 'Chaussures',
        description: 'Sneakers, escarpins, sandales, bottes et chaussures de ville pour tous.',
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
        customAttributes: [
          { name: 'Pointure', key: 'shoe_size', type: 'number', required: true },
          { name: 'Type', key: 'shoe_type', type: 'select', options: ['Sneakers', 'Sandales', 'Bottes', 'Escarpins', 'Mocassins', 'Ballerines'], required: true },
          { name: 'Genre', key: 'gender', type: 'select', options: ['Homme', 'Femme', 'Mixte'], required: true },
        ],
        translations: { en: { name: 'Shoes & Footwear' } },
        sortOrder: 3,
        isActive: true,
      },
    ],
  },
  {
    name: 'Maison & Cuisine',
    description: 'Mobilier, décoration intérieure, ustensiles de cuisine, électroménager et linge de maison.',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80',
    customAttributes: [
      { name: 'Matière', key: 'material', type: 'text', required: false },
      { name: 'Dimensions', key: 'dimensions', type: 'text', required: false },
      { name: 'Couleur', key: 'color', type: 'text', required: false },
    ],
    translations: { en: { name: 'Home & Kitchen', description: 'Furniture, decor, kitchen appliances and home accessories.' } },
    sortOrder: 3,
    isActive: true,
    children: [
      {
        name: 'Électroménager',
        description: 'Réfrigérateurs, micro-ondes, fers à repasser, machines à laver et petits électroménagers.',
        image: 'https://images.unsplash.com/photo-1556909190-eccf4a8bf97a?w=400&q=80',
        customAttributes: [
          { name: 'Capacité (L)', key: 'capacity_l', type: 'number', required: false },
          { name: 'Puissance (W)', key: 'power_w', type: 'number', required: false },
          { name: 'Classe énergie', key: 'energy_class', type: 'select', options: ['A+++', 'A++', 'A+', 'A', 'B', 'C'], required: false },
        ],
        translations: { en: { name: 'Home Appliances' } },
        sortOrder: 1,
        isActive: true,
      },
      {
        name: 'Décoration & Mobilier',
        description: 'Canapés, lits, tables, chaises, lampes et objets de décoration.',
        image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80',
        customAttributes: [
          { name: 'Matière principale', key: 'material', type: 'select', options: ['Bois', 'Métal', 'Tissu', 'Plastique', 'Verre', 'Marbre'], required: false },
          { name: 'Style', key: 'style', type: 'select', options: ['Moderne', 'Scandinave', 'Industriel', 'Classique', 'Bohème'], required: false },
        ],
        translations: { en: { name: 'Decor & Furniture' } },
        sortOrder: 2,
        isActive: true,
      },
    ],
  },
  {
    name: 'Beauté & Santé',
    description: 'Soins de la peau, maquillage, parfums, produits capillaires et compléments alimentaires.',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80',
    customAttributes: [
      { name: 'Type de peau', key: 'skin_type', type: 'select', options: ['Normale', 'Grasse', 'Sèche', 'Mixte', 'Sensible', 'Tous types'], required: false },
      { name: 'Contenance (ml)', key: 'volume_ml', type: 'number', required: false },
      { name: 'Convient pour', key: 'for_whom', type: 'select', options: ['Homme', 'Femme', 'Mixte', 'Enfant'], required: false },
    ],
    translations: { en: { name: 'Beauty & Health', description: 'Skincare, makeup, perfumes, haircare and supplements.' } },
    sortOrder: 4,
    isActive: true,
    children: [
      {
        name: 'Soins du Visage & Corps',
        description: 'Crèmes, sérums, nettoyants, hydratants et soins corps complets.',
        image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80',
        customAttributes: [
          { name: 'Type de soin', key: 'care_type', type: 'select', options: ['Hydratant', 'Anti-âge', 'Éclat', 'Purifiant', 'Nourrissant'], required: false },
          { name: 'Contenance (ml)', key: 'volume_ml', type: 'number', required: false },
        ],
        translations: { en: { name: 'Face & Body Care' } },
        sortOrder: 1,
        isActive: true,
      },
      {
        name: 'Maquillage',
        description: 'Fond de teint, rouges à lèvres, mascaras, palettes de fards et pinceaux.',
        image: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400&q=80',
        customAttributes: [
          { name: 'Nuance / Teinte', key: 'shade', type: 'text', required: false },
          { name: 'Finition', key: 'finish', type: 'select', options: ['Mat', 'Brillant', 'Satiné', 'Naturel'], required: false },
        ],
        translations: { en: { name: 'Makeup & Cosmetics' } },
        sortOrder: 2,
        isActive: true,
      },
    ],
  },
  {
    name: 'Sport & Loisirs',
    description: 'Matériel sportif, équipement de fitness, articles de sport collectif et loisirs créatifs.',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80',
    customAttributes: [
      { name: 'Sport', key: 'sport', type: 'text', required: false },
      { name: 'Niveau', key: 'level', type: 'select', options: ['Débutant', 'Intermédiaire', 'Avancé', 'Professionnel'], required: false },
    ],
    translations: { en: { name: 'Sports & Leisure', description: 'Sports equipment, fitness gear and leisure activities.' } },
    sortOrder: 5,
    isActive: true,
    children: [
      {
        name: 'Fitness & Musculation',
        description: 'Haltères, bancs de musculation, tapis de yoga, kettlebells et accessoires fitness.',
        image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80',
        customAttributes: [
          { name: 'Poids (kg)', key: 'weight_kg', type: 'number', required: false },
          { name: 'Matière', key: 'material', type: 'select', options: ['Fonte', 'Caoutchouc', 'Acier', 'Plastique'], required: false },
        ],
        translations: { en: { name: 'Fitness & Bodybuilding' } },
        sortOrder: 1,
        isActive: true,
      },
      {
        name: 'Sports Collectifs',
        description: 'Ballons, maillots, chaussures et accessoires de football, basketball, volleyball.',
        image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&q=80',
        customAttributes: [
          { name: 'Sport', key: 'sport', type: 'select', options: ['Football', 'Basketball', 'Volleyball', 'Rugby', 'Handball'], required: true },
          { name: 'Taille ballon', key: 'ball_size', type: 'select', options: ['3', '4', '5'], required: false },
        ],
        translations: { en: { name: 'Team Sports' } },
        sortOrder: 2,
        isActive: true,
      },
    ],
  },
  {
    name: 'Alimentation & Boissons',
    description: 'Produits alimentaires locaux et importés, boissons, épices, conserves et produits bio.',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
    customAttributes: [
      { name: 'Poids / Volume', key: 'weight_volume', type: 'text', required: false },
      { name: 'Date de péremption', key: 'expiry_date', type: 'date', required: false },
      { name: 'Bio / Naturel', key: 'is_organic', type: 'boolean', required: false },
      { name: 'Allergènes', key: 'allergens', type: 'text', required: false },
    ],
    translations: { en: { name: 'Food & Beverages' } },
    sortOrder: 6,
    isActive: true,
    children: [],
  },
];

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const dataSource = new DataSource(dataSourceOptions);

  try {
    await dataSource.initialize();
    console.log('✅ Base de données connectée');

    const repo = dataSource.getRepository('Category');

    let created = 0;
    let skipped = 0;

    for (const [i, cat] of rootCategories.entries()) {
      // Check if root category already exists
      const existingRoot = await repo.findOne({ where: { name: cat.name } });
      let rootId: string;

      if (existingRoot) {
        console.log(`⏭  Catégorie racine "${cat.name}" déjà existante, mise à jour...`);
        await repo.update(existingRoot.id, {
          description: cat.description,
          image: cat.image,
          customAttributes: cat.customAttributes,
          translations: cat.translations,
          sortOrder: cat.sortOrder,
          isActive: cat.isActive,
        });
        rootId = existingRoot.id;
        skipped++;
      } else {
        const rootEntity = repo.create({
          name: cat.name,
          slug: slug(cat.name),
          description: cat.description,
          image: cat.image,
          customAttributes: cat.customAttributes,
          translations: cat.translations,
          sortOrder: cat.sortOrder,
          isActive: cat.isActive,
          parentId: null,
        });
        const saved = await repo.save(rootEntity);
        rootId = saved.id;
        console.log(`✅ Catégorie racine créée: "${cat.name}"`);
        created++;
      }

      // Children
      const children = (cat as any).children || [];
      for (const [j, child] of children.entries()) {
        const existingChild = await repo.findOne({ where: { name: child.name, parentId: rootId } });
        if (existingChild) {
          await repo.update(existingChild.id, {
            description: child.description,
            image: child.image,
            customAttributes: child.customAttributes,
            translations: child.translations,
            sortOrder: child.sortOrder,
            isActive: child.isActive,
          });
          console.log(`  ⏭  Sous-catégorie "${child.name}" mise à jour`);
          skipped++;
        } else {
          const childEntity = repo.create({
            name: child.name,
            slug: slug(child.name),
            description: child.description,
            image: child.image,
            customAttributes: child.customAttributes,
            translations: child.translations,
            sortOrder: child.sortOrder,
            isActive: child.isActive,
            parentId: rootId,
          });
          await repo.save(childEntity);
          console.log(`  ✅ Sous-catégorie créée: "${child.name}"`);
          created++;
        }
      }
    }

    console.log(`\n🎉 Seeding terminé ! ${created} créées, ${skipped} mises à jour.`);
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await dataSource.destroy();
  }
}

main();
