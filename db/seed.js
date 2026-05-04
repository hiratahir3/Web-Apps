require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./index');

const products = [
  {
    slug: 'midnight-oud',
    name: 'Midnight Oud',
    note: 'Dark Rose · Oud · Amber',
    description: 'A bold, smoky composition layered with rare oud and a velvet rose heart. Hand-poured in small batches.',
    price: 3200,
    image: '/images/mahroon.png',
    badge: 'Bestseller',
    card_class: 'card-bg-1',
    glow_class: 'glow-1',
    stock: 50,
  },
  {
    slug: 'noir-essence',
    name: 'Noir Essence',
    note: 'Black Musk · Vetiver · Incense',
    description: 'Mysterious and grounding — a midnight ritual of black musk, smoked vetiver, and slow-burning incense.',
    price: 3500,
    image: '/images/black.jpeg',
    badge: 'New',
    card_class: 'card-bg-2',
    glow_class: 'glow-2',
    stock: 40,
  },
  {
    slug: 'vanilla-veil',
    name: 'Vanilla Veil',
    note: 'Warm Vanilla · Sandalwood · Honey',
    description: 'Soft, golden, and utterly comforting. Madagascan vanilla wrapped in sandalwood with a whisper of wild honey.',
    price: 2800,
    image: '/images/beige.jpeg',
    badge: 'Limited',
    card_class: 'card-bg-3',
    glow_class: 'glow-3',
    stock: 30,
  },
  {
    slug: 'signature-set',
    name: 'The Signature Set',
    note: 'Candle + Fragrance Oil',
    description: 'Our most-loved candle paired with a matching pure fragrance oil — gift-wrapped in our signature box.',
    price: 4800,
    image: '/images/luxury.png',
    badge: 'Gift',
    card_class: 'card-bg-1',
    glow_class: 'glow-3',
    stock: 25,
  },
];

const insertProduct = db.prepare(`
INSERT INTO products (slug,name,note,description,price,image,badge,card_class,glow_class,stock)
VALUES (@slug,@name,@note,@description,@price,@image,@badge,@card_class,@glow_class,@stock)
ON CONFLICT(slug) DO UPDATE SET
  name=excluded.name, note=excluded.note, description=excluded.description,
  price=excluded.price, image=excluded.image, badge=excluded.badge,
  card_class=excluded.card_class, glow_class=excluded.glow_class
`);

const seed = db.transaction(() => {
  for (const p of products) insertProduct.run(p);
});
seed();

const adminEmail = (process.env.ADMIN_BOOTSTRAP_EMAIL || 'yasra@lumiere.local').toLowerCase();
const adminPass = process.env.ADMIN_BOOTSTRAP_PASSWORD || 'ChangeMe!2026';
const existingAdmin = db.prepare('SELECT id FROM admins WHERE email = ?').get(adminEmail);
if (!existingAdmin) {
  const hash = bcrypt.hashSync(adminPass, 10);
  db.prepare('INSERT INTO admins (email,password_hash,name) VALUES (?,?,?)').run(adminEmail, hash, 'Yasra');
  console.log(`Bootstrap admin created: ${adminEmail} / ${adminPass}`);
} else {
  console.log(`Admin ${adminEmail} already exists.`);
}

console.log('Seed complete:', db.prepare('SELECT COUNT(*) as c FROM products').get());
