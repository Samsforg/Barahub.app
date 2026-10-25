import { and, eq } from "drizzle-orm";
import { categories, services, zones } from "../drizzle/schema";
import { getDb } from "./db";

const categorySeed = [
  { slug: "plomberie", name: "Plomberie", description: "Fuites, robinets et évacuations.", sortOrder: 1 },
  { slug: "electricite", name: "Électricité", description: "Diagnostic et petites interventions électriques.", sortOrder: 2 },
  { slug: "climatisation", name: "Climatisation", description: "Entretien et contrôle de climatiseurs.", sortOrder: 3 },
  { slug: "menage", name: "Ménage et entretien", description: "Entretien courant de la maison.", sortOrder: 4 },
  { slug: "reparations", name: "Petites réparations", description: "Réparations domestiques du quotidien.", sortOrder: 5 },
];

const zoneSeed = [
  ["Cocody", "Deux-Plateaux"],
  ["Cocody", "Riviera"],
  ["Plateau", "Centre"],
  ["Marcory", "Zone 4"],
  ["Treichville", "Arras"],
];

async function seed() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is not available");

  for (const category of categorySeed) {
    await db.insert(categories).values(category).onDuplicateKeyUpdate({ set: { name: category.name, description: category.description, active: true, sortOrder: category.sortOrder } });
  }
  for (const [commune, quartier] of zoneSeed) {
    await db.insert(zones).values({ commune, quartier, active: true }).onDuplicateKeyUpdate({ set: { active: true } });
  }

  const categoryRows = await db.select().from(categories);
  const categoryId = Object.fromEntries(categoryRows.map((category) => [category.slug, category.id]));
  const serviceSeed = [
    { categoryId: categoryId.plomberie, slug: "depannage-plomberie", name: "Dépannage plomberie", description: "Fuite, robinet ou évacuation à diagnostiquer.", pricingMode: "quote" as const, diagnosticRequired: true, travelTerms: "Déplacement confirmé après échange.", sortOrder: 1 },
    { categoryId: categoryId.electricite, slug: "diagnostic-electrique", name: "Diagnostic électrique", description: "Un professionnel pour sécuriser votre installation.", pricingMode: "quote" as const, diagnosticRequired: true, travelTerms: "La zone doit être confirmée avant affectation.", sortOrder: 2 },
    { categoryId: categoryId.climatisation, slug: "entretien-climatisation", name: "Entretien climatisation", description: "Nettoyage et contrôle avant la prochaine chaleur.", pricingMode: "fixed" as const, fixedPriceXof: "15000.00", diagnosticRequired: false, durationMinutes: 90, travelTerms: "Hors fournitures et réparations supplémentaires.", sortOrder: 3 },
  ];
  for (const service of serviceSeed) {
    await db.insert(services).values(service).onDuplicateKeyUpdate({ set: { name: service.name, description: service.description, active: true } });
  }
  console.log(`[seed] ${categoryRows.length} categories and ${serviceSeed.length} services ready`);
  process.exit(0);
}

seed().catch((error) => {
  console.error("[seed] failed", error);
  process.exitCode = 1;
});
