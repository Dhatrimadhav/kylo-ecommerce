import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const IMG = (seed: string) => `https://placehold.co/800x1000/1A1A1D/F5F2EC?text=${encodeURIComponent(seed)}`;

async function main() {
  console.log('Seeding KYLO database...');

  // --- Admin user ---
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@kylo.in';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const adminHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { name: 'KYLO Admin', email: adminEmail, passwordHash: adminHash, role: 'ADMIN' }
  });

  // --- Sample customer (handy for testing reviews/orders) ---
  const customerHash = await bcrypt.hash('Customer123!', 12);
  await prisma.user.upsert({
    where: { email: 'customer@kylo.in' },
    update: {},
    create: { name: 'Test Customer', email: 'customer@kylo.in', passwordHash: customerHash, role: 'CUSTOMER' }
  });

  // --- Categories ---
  const categoryDefs = [
    { name: 'Shirts', slug: 'shirts' },
    { name: 'T-Shirts', slug: 't-shirts' },
    { name: 'Pants', slug: 'pants' },
    { name: 'Jeans', slug: 'jeans' }
  ];
  const categories: Record<string, string> = {};
  for (const c of categoryDefs) {
    const cat = await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
    categories[c.slug] = cat.id;
  }

  // --- Coupon ---
  await prisma.coupon.upsert({
    where: { code: 'KYLO10' },
    update: {},
    create: {
      code: 'KYLO10',
      discountPercent: 10,
      maxDiscount: 500,
      minOrderValue: 999,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
      usageLimit: 1000,
      isActive: true
    }
  });

  // --- Products ---
  const products = [
    {
      name: 'KYLO Classic Black Shirt', slug: 'kylo-classic-black-shirt', sku: 'KYLO-SH-001',
      category: 'shirts', price: 1499, discountPrice: 1299,
      description: 'A wardrobe essential — the KYLO Classic Black Shirt is tailored from breathable cotton for an easy, all-day fit.',
      material: '100% Premium Cotton', careInstructions: 'Machine wash cold, do not bleach.',
      isNewArrival: true, isBestSeller: true, colors: ['Black', 'White'], sizes: ['S', 'M', 'L', 'XL', 'XXL']
    },
    {
      name: 'KYLO Oversized White T-Shirt', slug: 'kylo-oversized-white-tshirt', sku: 'KYLO-TS-001',
      category: 't-shirts', price: 999, discountPrice: 899,
      description: 'Relaxed, oversized fit in soft heavyweight cotton jersey. Effortless streetwear staple.',
      material: '220 GSM Cotton', careInstructions: 'Machine wash cold, inside out.',
      isNewArrival: true, isBestSeller: false, colors: ['White', 'Black', 'Beige'], sizes: ['S', 'M', 'L', 'XL']
    },
    {
      name: 'KYLO Relaxed Fit Blue Jeans', slug: 'kylo-relaxed-fit-blue-jeans', sku: 'KYLO-JN-001',
      category: 'jeans', price: 1999, discountPrice: 1799,
      description: 'Relaxed-fit denim with a touch of stretch for everyday comfort. Fades beautifully with wear.',
      material: '98% Cotton, 2% Elastane', careInstructions: 'Wash inside out in cold water.',
      isNewArrival: false, isBestSeller: true, colors: ['Blue'], sizes: ['S', 'M', 'L', 'XL', 'XXL']
    },
    {
      name: 'KYLO Premium Beige Pants', slug: 'kylo-premium-beige-pants', sku: 'KYLO-PT-001',
      category: 'pants', price: 1599, discountPrice: 1499,
      description: 'Tailored straight-fit chinos in a warm beige tone — smart enough for the office, relaxed enough for the weekend.',
      material: 'Cotton Twill', careInstructions: 'Machine wash cold, iron on reverse.',
      isNewArrival: false, isBestSeller: false, colors: ['Beige', 'Grey'], sizes: ['S', 'M', 'L', 'XL']
    },
    {
      name: 'KYLO Casual Checked Shirt', slug: 'kylo-casual-checked-shirt', sku: 'KYLO-SH-002',
      category: 'shirts', price: 1399, discountPrice: null,
      description: 'A relaxed checked shirt in a soft cotton blend — layer it open over a tee or wear it buttoned up.',
      material: 'Cotton Blend', careInstructions: 'Machine wash cold.',
      isNewArrival: true, isBestSeller: false, colors: ['Blue', 'Grey'], sizes: ['M', 'L', 'XL', 'XXL']
    },
    {
      name: 'KYLO Graphic Crew T-Shirt', slug: 'kylo-graphic-crew-tshirt', sku: 'KYLO-TS-002',
      category: 't-shirts', price: 899, discountPrice: 749,
      description: 'Soft-hand screen print on a classic crew neck tee. Regular fit, everyday wear.',
      material: '180 GSM Cotton', careInstructions: 'Machine wash cold, inside out.',
      isNewArrival: false, isBestSeller: true, colors: ['Black', 'White'], sizes: ['S', 'M', 'L', 'XL']
    }
  ];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        description: p.description,
        categoryId: categories[p.category],
        price: p.price,
        discountPrice: p.discountPrice ?? undefined,
        material: p.material,
        careInstructions: p.careInstructions,
        isNewArrival: p.isNewArrival,
        isBestSeller: p.isBestSeller,
        isFeatured: true,
        tags: [p.category, 'kylo'],
        images: {
          create: [
            { url: IMG(p.name), altText: p.name, position: 0 },
            { url: IMG(p.name + ' 2'), altText: p.name, position: 1 }
          ]
        },
        variants: {
          create: p.sizes.flatMap((size) =>
            p.colors.map((color) => ({ size, color, stock: Math.floor(Math.random() * 40) + 5 }))
          )
        }
      }
    });
    console.log(`Seeded: ${product.name}`);
  }

  console.log('\nDone.');
  console.log(`Admin login:    ${adminEmail} / ${adminPassword}`);
  console.log(`Customer login: customer@kylo.in / Customer123!`);
  console.log(`Coupon:         KYLO10 (10% off, max ₹500, min order ₹999)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

