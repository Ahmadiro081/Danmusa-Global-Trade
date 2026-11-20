export interface CategoryDirectoryItem {
  slug: string;
  name: string;
  shortDescription: string;
  imageUrl: string;
  imageAlt: string;
  subcategories: string[];
  specProfile: 'vehicle' | 'smartphone' | 'electronics' | 'computer' | 'home' | 'fashion' | 'shoes' | 'sportswear';
}

export const HERO_SHOWCASE_IMAGE =
  '/src/assets/images/hero_dgt_showcase_1795153731455.jpg';

export const WHOLESALE_BANNER_IMAGE =
  '/src/assets/images/hero_dgt_logistics_1795010675268.jpg';

export const STOREFRONT_CATEGORY_DIRECTORY: readonly CategoryDirectoryItem[] = [
  {
    slug: 'cars-vehicles',
    name: 'Cars & Vehicles',
    shortDescription: 'Sedans, executive SUVs, commercial trucks, and motorcycles imported to specification.',
    imageUrl: '/src/assets/images/product_truck_cargo_1795010674636.jpg',
    imageAlt: 'Commercial and passenger vehicles sourced by Danmusa Global Trade',
    subcategories: ['Executive SUVs', 'Sedans', 'Commercial Trucks', 'Motorcycles'],
    specProfile: 'vehicle',
  },
  {
    slug: 'smartphones',
    name: 'Smartphones',
    shortDescription: 'Flagship and commercial mobile devices from verified manufacturers and distributors.',
    imageUrl: '/src/assets/images/product_smartphone_pro_1795010675337.jpg',
    imageAlt: 'Modern smartphones sourced through Danmusa Global Trade',
    subcategories: ['5G Smartphones', 'Dual-SIM Devices', 'Tablets', 'Mobile Accessories'],
    specProfile: 'smartphone',
  },
  {
    slug: 'electronics',
    name: 'Electronics',
    shortDescription: 'Audio systems, smart displays, power backup units, and commercial consumer electronics.',
    imageUrl: '/src/assets/images/cat_electronics_hub_1795153730521.jpg',
    imageAlt: 'Consumer electronics and smart audio devices',
    subcategories: ['Audio & Headphones', 'Smart Home', 'Power Solutions', 'Displays'],
    specProfile: 'electronics',
  },
  {
    slug: 'computers',
    name: 'Computers',
    shortDescription: 'Business laptops, workstations, monitors, and enterprise IT accessories.',
    imageUrl: '/src/assets/images/product_laptop_workstation_1795010675676.jpg',
    imageAlt: 'Business laptops and computing accessories',
    subcategories: ['Laptops', 'Desktops', 'Monitors', 'Networking & Peripherals'],
    specProfile: 'computer',
  },
  {
    slug: 'home-kitchen',
    name: 'Home & Kitchen',
    shortDescription: 'Modern kitchen appliances, cookware, lighting, and dependable household equipment.',
    imageUrl: '/src/assets/images/product_kitchen_appliance_1795010676548.jpg',
    imageAlt: 'Modern kitchen appliances and home products',
    subcategories: ['Kitchen Appliances', 'Home Cooling', 'Lighting', 'Living Essentials'],
    specProfile: 'home',
  },
  {
    slug: 'fashion',
    name: 'Fashion',
    shortDescription: 'Curated men’s and women’s apparel, outerwear, and wholesale boutique collections.',
    imageUrl: '/src/assets/images/cat_fashion_apparel_1795153730748.jpg',
    imageAlt: 'Curated men and women fashion apparel',
    subcategories: ['Men’s Apparel', 'Women’s Apparel', 'Corporate Wear', 'Accessories'],
    specProfile: 'fashion',
  },
  {
    slug: 'shoes',
    name: 'Shoes',
    shortDescription: 'Formal leather footwear, everyday sneakers, and bulk retail footwear lots.',
    imageUrl: '/src/assets/images/product_mens_footwear_1795010676376.jpg',
    imageAlt: 'Quality footwear and shoes',
    subcategories: ['Formal Leather', 'Casual Sneakers', 'Boots', 'Wholesale Lots'],
    specProfile: 'shoes',
  },
  {
    slug: 'sportswear',
    name: 'Sportswear',
    shortDescription: 'Performance athletic apparel, training kits, and active lifestyle gear.',
    imageUrl: '/src/assets/images/cat_sportswear_gear_1795153731964.jpg',
    imageAlt: 'Performance sportswear and athletic training apparel',
    subcategories: ['Training Jackets', 'Team Kits', 'Activewear', 'Fitness Gear'],
    specProfile: 'sportswear',
  },
] as const;

export function findDirectoryCategory(slugOrName: string): CategoryDirectoryItem | undefined {
  const normalized = slugOrName.trim().toLowerCase();
  return STOREFRONT_CATEGORY_DIRECTORY.find(
    (item) =>
      item.slug === normalized ||
      item.name.toLowerCase() === normalized ||
      normalized.includes(item.slug.split('-')[0]),
  );
}
