require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const MenuItem = require('./models/MenuItem');
const Settings = require('./models/Settings');
const Review = require('./models/Review');
const GalleryImage = require('./models/GalleryImage');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/secret-garden';

const menuItems = [
  // Drinks
  {
    name: "Himalayan Mint Iced Tea",
    description: "Brewed with handpicked organic mint leaves from the hills of Mustang, served chilled with a hint of lemon.",
    price: 320,
    category: "Drinks",
    image: "",
    available: true,
    order: 1
  },
  {
    name: "Secret Garden Mojito",
    description: "A refreshing blend of white rum, fresh lime juice, crushed mint sprigs, and a secret garden syrup infusion.",
    price: 550,
    category: "Drinks",
    image: "",
    available: true,
    order: 2
  },
  {
    name: "Golden Turmeric Latte",
    description: "A nourishing blend of local organic turmeric, warm almond milk, cinnamon, and wild honey.",
    price: 380,
    category: "Drinks",
    image: "",
    available: true,
    order: 3
  },
  
  // Food
  {
    name: "Kathmandu Fusion MoMo",
    description: "Steamed chicken or vegetable dumplings, served in a rich, warm, gold-colored roasted sesame and tomato soup.",
    price: 480,
    category: "Food",
    image: "",
    available: true,
    order: 1
  },
  {
    name: "Charcoal Grilled Chicken Bowl",
    description: "Juicy tenders marinated in local mustard oil and Nepalese herbs, served with avocado, quinoa, and green leaves.",
    price: 780,
    category: "Food",
    image: "",
    available: true,
    order: 2
  },
  {
    name: "Golden Butter Pan-Seared Salmon",
    description: "Fresh salmon filet seared to perfection, finished with a rich lemon-gold butter sauce, served on asparagus bed.",
    price: 980,
    category: "Food",
    image: "",
    available: true,
    order: 3
  },
  {
    name: "Kathmandu Valley Salad",
    description: "Organic garden greens, sliced radishes, goat cheese, glazed walnuts, dressed in a local honey mustard vinaigrette.",
    price: 550,
    category: "Food",
    image: "",
    available: true,
    order: 4
  },

  // Snacks
  {
    name: "Garden Bruschetta",
    description: "Crispy garlic-rubbed baguette slices topped with tomatoes, fresh basil from our garden, and extra virgin olive oil.",
    price: 380,
    category: "Snacks",
    image: "",
    available: true,
    order: 1
  },
  {
    name: "Herbed Truffle Potato Wedges",
    description: "Hand-cut crispy wedges seasoned with fresh garden rosemary and drizzled with premium black truffle oil.",
    price: 420,
    category: "Snacks",
    image: "",
    available: true,
    order: 2
  },
  {
    name: "Cheesy Avocado Nachos",
    description: "Crisp tortilla chips baked with a blend of cheeses, topped with fresh avocado salsa, jalapeños, and sour cream.",
    price: 520,
    category: "Snacks",
    image: "",
    available: true,
    order: 3
  }
];

const reviews = [
  {
    name: "Aarav Sharma",
    rating: 5,
    text: "The ambiance is absolutely magical! It feels like escaping into a mystical garden in the middle of busy Kathmandu. The chicken MoMo in sesame soup was extraordinary. Highly recommended!",
    approved: true,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  },
  {
    name: "Elena Rostova",
    rating: 5,
    text: "Outstanding service and breathtaking decor. The golden-gold accents merge with the green foliage so beautifully. The Secret Garden Mojito is the best cocktail I had in Nepal.",
    approved: true,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
  },
  {
    name: "Pranish Shrestha",
    rating: 4,
    text: "Great food, beautiful vibe, and really helpful staff. It was fully booked on Friday evening, but they managed to find us a spot. The herbed potato wedges are delicious.",
    approved: true,
    createdAt: new Date()
  },
  {
    name: "John Doe",
    rating: 2,
    text: "Wait time was a bit long, but the food is decent.",
    approved: false, // Pending approval
    createdAt: new Date()
  }
];

const galleryImages = [
  {
    url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=600&auto=format&fit=crop",
    caption: "Our signature drinks crafted with passion",
    uploadedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
  },
  {
    url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600&auto=format&fit=crop",
    caption: "The peaceful garden ambiance inside",
    uploadedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
  },
  {
    url: "https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=600&auto=format&fit=crop",
    caption: "Freshly prepared local and fusion cuisine",
    uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
  },
  {
    url: "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=600&auto=format&fit=crop",
    caption: "Cozy evenings illuminated by warm lights",
    uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  }
];

async function runSeed() {
  try {
    console.log('Connecting to database:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    // 1. Clear Existing Collections
    console.log('Clearing old collections...');
    await Admin.deleteMany({});
    await MenuItem.deleteMany({});
    await Settings.deleteMany({});
    await Review.deleteMany({});
    await GalleryImage.deleteMany({});

    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH || '$2a$10$sYncyAPrn6WDoB5WhqQwKOnYz7om1MEEOUQ6j8d1F2k3RSv5zSmvS';
    const defaultAdmin = new Admin({
      username: adminUsername,
      passwordHash: adminPasswordHash
    });
    await defaultAdmin.save();
    console.log(`Seeded Admin account (username: ${adminUsername}).`);

    // 3. Seed Settings
    const defaultSettings = new Settings({
      phone: '982-3002449',
      facebook: 'https://facebook.com',
      instagram: 'https://instagram.com',
      address: 'P884+3PW, Jogin Pakha Marg, Kathmandu 44600',
      openingHours: 'Opens 9 AM'
    });
    await defaultSettings.save();
    console.log('Seeded default restaurant settings.');

    // 4. Seed Menu Items
    await MenuItem.insertMany(menuItems);
    console.log(`Seeded ${menuItems.length} menu items.`);

    // 5. Seed Reviews
    await Review.insertMany(reviews);
    console.log(`Seeded ${reviews.length} reviews.`);

    // 6. Seed Gallery
    await GalleryImage.insertMany(galleryImages);
    console.log(`Seeded ${galleryImages.length} gallery images.`);

    console.log('Seeding process completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding process failed:', error);
    process.exit(1);
  }
}

runSeed();
