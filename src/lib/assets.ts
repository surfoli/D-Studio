// Asset Library for image management
// Stores metadata in localStorage, actual files in public/assets

export interface Asset {
  id: string;
  name: string;
  url: string; // Can be /assets/filename.ext or external URL
  type: "image" | "icon" | "video";
  width?: number;
  height?: number;
  size?: number; // bytes
  createdAt: number;
  isExternal: boolean;
}

const ASSETS_STORAGE_KEY = "d3studio_assets";

export function generateAssetId(): string {
  return `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function loadAssets(): Asset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ASSETS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAssets(assets: Asset[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(assets));
}

export function addAsset(asset: Omit<Asset, "id" | "createdAt">): Asset {
  const newAsset: Asset = {
    ...asset,
    id: generateAssetId(),
    createdAt: Date.now(),
  };
  const assets = loadAssets();
  assets.unshift(newAsset);
  saveAssets(assets);
  return newAsset;
}

export function removeAsset(id: string): void {
  const assets = loadAssets();
  const filtered = assets.filter((a) => a.id !== id);
  saveAssets(filtered);
}

export function getAssetById(id: string): Asset | undefined {
  return loadAssets().find((a) => a.id === id);
}

// ── Stock photo library (grouped by section) ─────────────────────────────
// Each image uses the reliable Unsplash photo-ID format.
// Helper to build url/preview from an Unsplash photo path.
function u(photoId: string) {
  const base = `https://images.unsplash.com/${photoId}`;
  return {
    url: `${base}?w=1200&q=80`,
    preview: `${base}?w=400&q=60`,
  };
}

export interface StockImage {
  id: string;
  name: string;
  url: string;
  preview: string;
}

export interface StockSection {
  id: string;
  label: string;
  images: StockImage[];
}

export const STOCK_SECTIONS: StockSection[] = [
  // ── Business & Office ──────────────────────────────────────────────────
  {
    id: "business",
    label: "Business & Office",
    images: [
      { id: "biz1", name: "Modernes Büro", ...u("photo-1497366216548-37526070297c") },
      { id: "biz2", name: "Team Meeting", ...u("photo-1552664730-d307ca884978") },
      { id: "biz3", name: "Workspace", ...u("photo-1498050108023-c5249f4df085") },
      { id: "biz4", name: "Startup Team", ...u("photo-1522071820081-009f0129c71c") },
      { id: "biz5", name: "Whiteboard Session", ...u("photo-1531545514256-b1400bc00f31") },
      { id: "biz6", name: "Analytics", ...u("photo-1551288049-bebda4e38f71") },
      { id: "biz7", name: "Konferenzraum", ...u("photo-1497366811353-6870744d04b2") },
      { id: "biz8", name: "Coworking Space", ...u("photo-1519389950473-47ba0277781c") },
      { id: "biz9", name: "Handshake", ...u("photo-1521791136064-7986c2920216") },
      { id: "biz10", name: "Büro-Flur", ...u("photo-1497215842964-222b430dc094") },
      { id: "biz11", name: "Laptop Arbeit", ...u("photo-1460925895917-afdab827c52f") },
      { id: "biz12", name: "Schreibtisch", ...u("photo-1542744173-8e7e53415bb0") },
      { id: "biz13", name: "Team Brainstorm", ...u("photo-1557804506-669a67965ba0") },
      { id: "biz14", name: "Büro Fenster", ...u("photo-1524758631624-e2822e304c36") },
      { id: "biz15", name: "Notizen", ...u("photo-1517842645767-c639042777db") },
    ],
  },

  // ── Technologie ────────────────────────────────────────────────────────
  {
    id: "tech",
    label: "Technologie",
    images: [
      { id: "tech1", name: "Code Editor", ...u("photo-1461749280684-dccba630e2f6") },
      { id: "tech2", name: "Laptop", ...u("photo-1496181133206-80ce9b88a853") },
      { id: "tech3", name: "Server Room", ...u("photo-1558494949-ef010cbdcc31") },
      { id: "tech4", name: "Smartphone", ...u("photo-1511707171634-5f897ff02aa9") },
      { id: "tech5", name: "Roboter", ...u("photo-1485827404703-89b55fcc595e") },
      { id: "tech6", name: "Platine", ...u("photo-1518770660439-4636190af475") },
      { id: "tech7", name: "Coding Setup", ...u("photo-1504639725590-34d0984388bd") },
      { id: "tech8", name: "Daten & Netzwerk", ...u("photo-1544197150-b99a580bb7a8") },
      { id: "tech9", name: "Tastatur", ...u("photo-1587829741301-dc798b83add3") },
      { id: "tech10", name: "Monitor Setup", ...u("photo-1547082299-de196ea013d6") },
      { id: "tech11", name: "Kabel & Hardware", ...u("photo-1558618666-fcd25c85f82e") },
      { id: "tech12", name: "App Design", ...u("photo-1512941937669-90a1b58e7e9c") },
      { id: "tech13", name: "Tablet", ...u("photo-1544244015-0df4b3ffc6b0") },
      { id: "tech14", name: "Cloud Server", ...u("photo-1451187580459-43490279c0fa") },
      { id: "tech15", name: "Drohne", ...u("photo-1473968512647-3e447244af8f") },
    ],
  },

  // ── Menschen & Portraits ───────────────────────────────────────────────
  {
    id: "people",
    label: "Menschen & Portraits",
    images: [
      { id: "ppl1", name: "Portrait Frau", ...u("photo-1494790108377-be9c29b29330") },
      { id: "ppl2", name: "Portrait Mann", ...u("photo-1507003211169-0a1dd7228f2d") },
      { id: "ppl3", name: "Lächeln", ...u("photo-1534528741775-53994a69daeb") },
      { id: "ppl4", name: "Business Frau", ...u("photo-1573496359142-b8d87734a5a2") },
      { id: "ppl5", name: "Kreatives Team", ...u("photo-1600880292203-757bb62b4baf") },
      { id: "ppl6", name: "Freunde", ...u("photo-1529156069898-49953e39b3ac") },
      { id: "ppl7", name: "Gespräch", ...u("photo-1543269865-cbf427effbad") },
      { id: "ppl8", name: "Happy Team", ...u("photo-1521737711867-e3b97375f902") },
      { id: "ppl9", name: "Junger Mann", ...u("photo-1500648767791-00dcc994a43e") },
      { id: "ppl10", name: "Frau Outdoor", ...u("photo-1531746020798-e6953c6e8e04") },
      { id: "ppl11", name: "Kreativ Arbeiten", ...u("photo-1522202176988-66273c2fd55f") },
      { id: "ppl12", name: "Studierende", ...u("photo-1523240795612-9a054b0db644") },
      { id: "ppl13", name: "Familie", ...u("photo-1511895426328-dc8714191300") },
      { id: "ppl14", name: "Profil Frau", ...u("photo-1438761681033-6461ffad8d80") },
      { id: "ppl15", name: "Profil Mann", ...u("photo-1472099645785-5658abf4ff4e") },
    ],
  },

  // ── Natur & Landschaft ─────────────────────────────────────────────────
  {
    id: "nature",
    label: "Natur & Landschaft",
    images: [
      { id: "nat1", name: "Berge", ...u("photo-1469474968028-56623f02e42e") },
      { id: "nat2", name: "Strand", ...u("photo-1507525428034-b723cf961d3e") },
      { id: "nat3", name: "Wald", ...u("photo-1448375240586-882707db888b") },
      { id: "nat4", name: "Sonnenuntergang", ...u("photo-1495616811223-4d98c6e9c869") },
      { id: "nat5", name: "See", ...u("photo-1439853949127-fa647821eba0") },
      { id: "nat6", name: "Wüste", ...u("photo-1509316785289-025f5b846b35") },
      { id: "nat7", name: "Blumen", ...u("photo-1490750967868-88aa4f44baee") },
      { id: "nat8", name: "Wasserfall", ...u("photo-1432405972618-c6b0cfba8cdf") },
      { id: "nat9", name: "Nordlichter", ...u("photo-1483347756197-71ef80e95f73") },
      { id: "nat10", name: "Tropischer Strand", ...u("photo-1506953823645-5e278e5db1e7") },
      { id: "nat11", name: "Nebel im Wald", ...u("photo-1418065460487-3e41a6c84dc5") },
      { id: "nat12", name: "Bergwiese", ...u("photo-1470071459604-3b5ec3a7fe05") },
      { id: "nat13", name: "Korallen", ...u("photo-1546026423-cc4642628d2b") },
      { id: "nat14", name: "Herbstwald", ...u("photo-1507003211169-0a1dd7228f2d") },
      { id: "nat15", name: "Sternenhimmel", ...u("photo-1519681393784-d120267933ba") },
    ],
  },

  // ── Architektur & Stadt ────────────────────────────────────────────────
  {
    id: "architecture",
    label: "Architektur & Stadt",
    images: [
      { id: "arch1", name: "Skyline", ...u("photo-1477959858617-67f85cf4f1df") },
      { id: "arch2", name: "Modernes Gebäude", ...u("photo-1486325212027-8081e485255e") },
      { id: "arch3", name: "Interior Design", ...u("photo-1618221195710-dd6b41faaea6") },
      { id: "arch4", name: "Glasfassade", ...u("photo-1518005020951-eccb494ad742") },
      { id: "arch5", name: "Brücke", ...u("photo-1474044159687-1ee9f3a51722") },
      { id: "arch6", name: "Nachtstadt", ...u("photo-1514565131-fce0801e5785") },
      { id: "arch7", name: "Wolkenkratzer", ...u("photo-1449157291145-7efd050a4d0e") },
      { id: "arch8", name: "Treppe", ...u("photo-1553877522-43269d4ea984") },
      { id: "arch9", name: "Altbau", ...u("photo-1555636222-cae831e670b3") },
      { id: "arch10", name: "Museum", ...u("photo-1533105079780-92b9be482077") },
      { id: "arch11", name: "Straßenflucht", ...u("photo-1480714378408-67cf0d13bc1b") },
      { id: "arch12", name: "Wohnzimmer", ...u("photo-1502672260266-1c1ef2d93688") },
      { id: "arch13", name: "Loft", ...u("photo-1536376072261-38c75010e6c9") },
      { id: "arch14", name: "Kirche", ...u("photo-1548625149-fc4a29cf7092") },
      { id: "arch15", name: "Parkhaus", ...u("photo-1545558014-8692077e9b5c") },
    ],
  },

  // ── Essen & Trinken ────────────────────────────────────────────────────
  {
    id: "food",
    label: "Essen & Trinken",
    images: [
      { id: "food1", name: "Kaffee", ...u("photo-1495474472287-4d71bcdd2085") },
      { id: "food2", name: "Gesunde Bowl", ...u("photo-1512621776951-a57141f2eefd") },
      { id: "food3", name: "Frisches Brot", ...u("photo-1509440159596-0249088772ff") },
      { id: "food4", name: "Restaurant", ...u("photo-1517248135467-4c7edcad34c4") },
      { id: "food5", name: "Brunch", ...u("photo-1504754524776-8f4f37790ca0") },
      { id: "food6", name: "Pasta", ...u("photo-1473093295043-cdd812d0e601") },
      { id: "food7", name: "Sushi", ...u("photo-1553621042-f6e147245754") },
      { id: "food8", name: "Burger", ...u("photo-1568901346375-23c9450c58cd") },
      { id: "food9", name: "Smoothie", ...u("photo-1505252585461-04db1eb84625") },
      { id: "food10", name: "Kuchen", ...u("photo-1488477181946-6428a0291777") },
      { id: "food11", name: "Pizza", ...u("photo-1565299624946-b28f40a0ae38") },
      { id: "food12", name: "Wein", ...u("photo-1510812431401-41d2bd2722f3") },
      { id: "food13", name: "Salat", ...u("photo-1540189549336-e6e99c3679fe") },
      { id: "food14", name: "Frühstück", ...u("photo-1533089860892-a7c6f0a88666") },
      { id: "food15", name: "Eiscreme", ...u("photo-1497034825429-c343d7c6a68f") },
    ],
  },

  // ── Lifestyle & Freizeit ───────────────────────────────────────────────
  {
    id: "lifestyle",
    label: "Lifestyle & Freizeit",
    images: [
      { id: "life1", name: "Yoga", ...u("photo-1544367567-0f2fcb009e0b") },
      { id: "life2", name: "Reisen", ...u("photo-1488646953014-85cb44e25828") },
      { id: "life3", name: "Fitness", ...u("photo-1517836357463-d25dfeac3438") },
      { id: "life4", name: "Lesen", ...u("photo-1506880018603-83d5b814b5a6") },
      { id: "life5", name: "Camping", ...u("photo-1504280390367-361c6d9f38f4") },
      { id: "life6", name: "Musik", ...u("photo-1511671782779-c97d3d27a1d4") },
      { id: "life7", name: "Laufen", ...u("photo-1461897104016-0b3b00b1ea56") },
      { id: "life8", name: "Surfen", ...u("photo-1502680390548-bdbac40ce065") },
      { id: "life9", name: "Fahrrad", ...u("photo-1471506480208-91b3a4cc78be") },
      { id: "life10", name: "Meditation", ...u("photo-1506126613408-eca07ce68773") },
      { id: "life11", name: "Hund", ...u("photo-1587300003388-59208cc962cb") },
      { id: "life12", name: "Katze", ...u("photo-1514888286974-6c03e2ca1dba") },
      { id: "life13", name: "Kochen", ...u("photo-1556909114-f6e7ad7d3136") },
      { id: "life14", name: "Garten", ...u("photo-1416879595882-3373a0480b5b") },
      { id: "life15", name: "Shopping", ...u("photo-1483985988355-763728e1935b") },
    ],
  },

  // ── Abstrakt & Hintergründe ────────────────────────────────────────────
  {
    id: "abstract",
    label: "Abstrakt & Hintergründe",
    images: [
      { id: "abs1", name: "Gradient", ...u("photo-1557683316-973673baf926") },
      { id: "abs2", name: "Geometrisch", ...u("photo-1618005182384-a83a8bd57fbe") },
      { id: "abs3", name: "Neon", ...u("photo-1550684376-efcbd6e3f031") },
      { id: "abs4", name: "Farbwelle", ...u("photo-1579546929518-9e396f3cc809") },
      { id: "abs5", name: "Rauch", ...u("photo-1557672172-298e090bd0f1") },
      { id: "abs6", name: "Marmor", ...u("photo-1558618666-fcd25c85f82e") },
      { id: "abs7", name: "Bokeh", ...u("photo-1530053969600-caed2596d242") },
      { id: "abs8", name: "Tintenkunst", ...u("photo-1549490349-8643362247b5") },
      { id: "abs9", name: "Holografie", ...u("photo-1550684848-fac1c5b4e853") },
      { id: "abs10", name: "Kristall", ...u("photo-1519681393784-d120267933ba") },
      { id: "abs11", name: "Weltraum", ...u("photo-1462331940025-496dfbfc7564") },
      { id: "abs12", name: "Farbtropfen", ...u("photo-1541701494587-cb58502866ab") },
      { id: "abs13", name: "Glitch Art", ...u("photo-1550859492-d5da9d8e45f3") },
      { id: "abs14", name: "Lichtstreifen", ...u("photo-1507400492013-162706c8c05e") },
      { id: "abs15", name: "Prisma", ...u("photo-1520262454473-a1a82276a574") },
    ],
  },

  // ── Minimal & Texturen ─────────────────────────────────────────────────
  {
    id: "minimal",
    label: "Minimal & Texturen",
    images: [
      { id: "min1", name: "Weißraum", ...u("photo-1507537297725-24a1c029d3ca") },
      { id: "min2", name: "Pflanze", ...u("photo-1459411552884-841db9b3cc2a") },
      { id: "min3", name: "Clean Desk", ...u("photo-1518455027359-f3f8164ba6bd") },
      { id: "min4", name: "Papiertextur", ...u("photo-1558591710-4b4a1ae0f04d") },
      { id: "min5", name: "Schatten", ...u("photo-1517483000871-1dbf64a6e1c6") },
      { id: "min6", name: "Beton", ...u("photo-1533628635777-112b2239b1c7") },
      { id: "min7", name: "Holz", ...u("photo-1558618666-fcd25c85f82e") },
      { id: "min8", name: "Stoff", ...u("photo-1528459105426-b9548367069b") },
      { id: "min9", name: "Sand", ...u("photo-1509316785289-025f5b846b35") },
      { id: "min10", name: "Wasser", ...u("photo-1500375592092-40eb2168fd21") },
      { id: "min11", name: "Blatt", ...u("photo-1507003211169-0a1dd7228f2d") },
      { id: "min12", name: "Stein", ...u("photo-1494438639946-1ebd1d20bf85") },
      { id: "min13", name: "Weiße Wand", ...u("photo-1558882224-dda166ffe594") },
      { id: "min14", name: "Geometrie", ...u("photo-1509475826633-fed577a2c71b") },
      { id: "min15", name: "Licht", ...u("photo-1507838153414-b4b713384a76") },
    ],
  },

  // ── Produkt & E-Commerce ───────────────────────────────────────────────
  {
    id: "product",
    label: "Produkt & E-Commerce",
    images: [
      { id: "prod1", name: "Verpackung", ...u("photo-1523275335684-37898b6baf30") },
      { id: "prod2", name: "Sneaker", ...u("photo-1542291026-7eec264c27ff") },
      { id: "prod3", name: "Kopfhörer", ...u("photo-1505740420928-5e560c06d30e") },
      { id: "prod4", name: "Parfum", ...u("photo-1541643600914-78b084683601") },
      { id: "prod5", name: "Uhr", ...u("photo-1524592094714-0f0654e20314") },
      { id: "prod6", name: "Sonnenbrillen", ...u("photo-1511499767150-a48a237f0083") },
      { id: "prod7", name: "Tasche", ...u("photo-1548036328-c9fa89d128fa") },
      { id: "prod8", name: "Kosmetik", ...u("photo-1522335789203-aabd1fc54bc9") },
      { id: "prod9", name: "Pflege", ...u("photo-1556228578-0d85b1a4d571") },
      { id: "prod10", name: "Kamera", ...u("photo-1516035069371-29a1b244cc32") },
      { id: "prod11", name: "Pflanze Topf", ...u("photo-1485955900006-10f4d324d411") },
      { id: "prod12", name: "Kerze", ...u("photo-1602607861018-80dab56f7e28") },
    ],
  },

  // ── Bildung & Wissen ───────────────────────────────────────────────────
  {
    id: "education",
    label: "Bildung & Wissen",
    images: [
      { id: "edu1", name: "Bibliothek", ...u("photo-1521587760476-6c12a4b040da") },
      { id: "edu2", name: "Bücher", ...u("photo-1524995997946-a1c2e315a42f") },
      { id: "edu3", name: "Klassenzimmer", ...u("photo-1580582932707-520aed937b7b") },
      { id: "edu4", name: "Studium", ...u("photo-1434030216411-0b793f4b4173") },
      { id: "edu5", name: "Labor", ...u("photo-1532094349884-543bc11b234d") },
      { id: "edu6", name: "Mikroskop", ...u("photo-1516339901601-2e1b62dc0c45") },
      { id: "edu7", name: "Globus", ...u("photo-1521295121783-8a321d551ad2") },
      { id: "edu8", name: "Notizbuch", ...u("photo-1501504905252-473c47e087f8") },
      { id: "edu9", name: "Tafel", ...u("photo-1503676260728-1c00da094a0b") },
      { id: "edu10", name: "Universität", ...u("photo-1562774053-701939374585") },
      { id: "edu11", name: "Abschluss", ...u("photo-1523050854058-8df90110c9f1") },
      { id: "edu12", name: "Stift & Papier", ...u("photo-1455390582262-044cdead277a") },
    ],
  },

  // ── Gesundheit & Wellness ──────────────────────────────────────────────
  {
    id: "health",
    label: "Gesundheit & Wellness",
    images: [
      { id: "health1", name: "Spa", ...u("photo-1540555700478-4be289fbec6d") },
      { id: "health2", name: "Meditation", ...u("photo-1506126613408-eca07ce68773") },
      { id: "health3", name: "Obst & Gemüse", ...u("photo-1512621776951-a57141f2eefd") },
      { id: "health4", name: "Laufen", ...u("photo-1461897104016-0b3b00b1ea56") },
      { id: "health5", name: "Wasser trinken", ...u("photo-1548839140-29a749e1cf4d") },
      { id: "health6", name: "Stretching", ...u("photo-1518611012118-696072aa579a") },
      { id: "health7", name: "Gesundes Essen", ...u("photo-1498837167922-ddd27525d352") },
      { id: "health8", name: "Massage", ...u("photo-1544161515-4ab6ce6db874") },
      { id: "health9", name: "Aromatherapie", ...u("photo-1519823551278-64ac92734fb1") },
      { id: "health10", name: "Schwimmen", ...u("photo-1530549387789-4c1017266635") },
      { id: "health11", name: "Achtsamkeit", ...u("photo-1447452001602-7090c7ab2db3") },
      { id: "health12", name: "Natur Spaziergang", ...u("photo-1551632811-561732d1e306") },
    ],
  },
];

// Flat list for backward compatibility (all stock images)
export const PLACEHOLDER_IMAGES = STOCK_SECTIONS.flatMap((s) => s.images);

// Convert file to base64 data URL (for localStorage storage of small images)
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Get image dimensions from URL
export function getImageDimensions(
  url: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = url;
  });
}

// Check if URL is valid image
export function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  // Data URLs
  if (url.startsWith("data:image/")) return true;
  // Common image extensions
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|avif|bmp)(\?.*)?$/i;
  if (imageExtensions.test(url)) return true;
  // Unsplash, etc.
  if (url.includes("unsplash.com") || url.includes("pexels.com")) return true;
  // Assume URLs with image in path are valid
  if (/image|photo|img|pic/i.test(url)) return true;
  return true; // Be lenient
}
