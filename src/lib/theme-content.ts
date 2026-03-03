// ── Theme Content — Themed images + text per template category ──
// Used by WireframePreview and CanvasPreview to show realistic, themed content

export interface ThemeContent {
  brandName: string;
  heroTitle: string;
  heroTitleBreak?: string; // second line
  heroSubtitle: string;
  heroCtaPrimary: string;
  heroCtaSecondary: string;
  navLinks: string[];
  features: { icon: string; title: string; desc: string }[];
  stats: { num: string; label: string }[];
  testimonials: { name: string; role: string; quote: string }[];
  bigText: string;
  bigTextHighlight: string;
  galleryTitle: string;
  galleryCaptions: string[];
  pricingPlans: { name: string; price: string; features: string[]; popular: boolean }[];
  ctaTitle: string;
  ctaSubtitle: string;
  ctaCta: string;
  contactTitle: string;
  footerTagline: string;
  marqueeItems: string[];
  contentTitle: string;
  contentDesc: string;
  // Premium / Luxury extensions (optional)
  aboutText?: string;
  aboutHighlight?: string;
  heroSplitCtas?: [string, string]; // e.g. ["Rent a car", "Buy a car"]
  featuredBrand?: string; // e.g. "JAGUAR"
  featuredModel?: string; // e.g. "F-TYPE R"
  featuredSubtitle?: string;
  featuredImage?: string; // URL for featured vehicle/product
  brandLogos?: string[]; // e.g. ["Bugatti", "Ferrari", ...]
  // Editorial / Athletic extensions (optional)
  isEditorial?: boolean; // enables editorial layout rendering
  missionTitle?: string;
  missionDesc?: string;
  trainingCategories?: string[]; // e.g. ["Personal Training", "Group Classes", ...]
  images: {
    hero: string;
    office: string;
    product: string;
    work1: string;
    work2: string;
    work3: string;
    team1: string;
    team2: string;
    team3: string;
    abstract: string;
    city: string;
    nature: string;
  };
}

// ── Unsplash helper ──
function u(id: string, w = 800, h = 600): string {
  return `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop`;
}
function face(id: string): string {
  return `https://images.unsplash.com/${id}?w=120&h=120&fit=crop&crop=face`;
}

// ══════════════════════════════════════════════════
// ── Theme definitions ──
// ══════════════════════════════════════════════════

const THEMES: Record<string, ThemeContent> = {
  // ── Default / SaaS ──
  saas: {
    brandName: "NovaTech",
    heroTitle: "Design trifft",
    heroTitleBreak: "Performance",
    heroSubtitle: "Erstelle beeindruckende Websites in Minuten — nicht Wochen.",
    heroCtaPrimary: "Kostenlos starten",
    heroCtaSecondary: "Demo ansehen",
    navLinks: ["Produkte", "Features", "Preise"],
    features: [
      { icon: "⚡", title: "Blitzschnell", desc: "Optimierte Performance für jedes Gerät." },
      { icon: "🔒", title: "Sicher", desc: "Enterprise-grade Sicherheit & Compliance." },
      { icon: "🎨", title: "Flexibel", desc: "Passe jedes Detail an deine Marke an." },
    ],
    stats: [
      { num: "10M+", label: "Downloads" },
      { num: "99.9%", label: "Uptime" },
      { num: "150+", label: "Länder" },
      { num: "+456k", label: "Nutzer" },
    ],
    testimonials: [
      { name: "Anna Müller", role: "CEO, TechFlow", quote: "Die beste Plattform die wir je genutzt haben." },
      { name: "Max Weber", role: "CTO, DataVault", quote: "Hat unsere Entwicklungszeit um 60% reduziert." },
      { name: "Lisa Schmidt", role: "Lead Designer", quote: "Intuitiv und wunderschön gestaltet." },
    ],
    bigText: "Wir glauben an",
    bigTextHighlight: "gutes Design.",
    galleryTitle: "Unsere Arbeiten",
    galleryCaptions: ["Dashboard Redesign", "Mobile App", "Brand Identity"],
    pricingPlans: [
      { name: "Free", price: "€0", features: ["5 Projekte", "1 GB Speicher"], popular: false },
      { name: "Pro", price: "€29", features: ["Unbegrenzt", "100 GB", "Priority Support"], popular: true },
      { name: "Team", price: "€79", features: ["Alles aus Pro", "SSO", "Admin Panel"], popular: false },
    ],
    ctaTitle: "Bereit loszulegen?",
    ctaSubtitle: "Starte noch heute kostenlos — kein Kreditkarte nötig.",
    ctaCta: "Jetzt starten →",
    contactTitle: "Lass uns reden",
    footerTagline: "Die Plattform für moderne Teams.",
    marqueeItems: ["Stripe", "Vercel", "GitHub", "Figma", "Notion", "Slack"],
    contentTitle: "Intuitives Design",
    contentDesc: "Erstelle Layouts per Drag & Drop — ohne Code.",
    images: {
      hero: u("photo-1504384308090-c894fdcc538d", 1400, 800),
      office: u("photo-1497366216548-37526070297c"),
      product: u("photo-1523275335684-37898b6baf30", 600, 600),
      work1: u("photo-1460925895917-afdab827c52f"),
      work2: u("photo-1551434678-e076c223a692"),
      work3: u("photo-1498050108023-c5249f4df085"),
      team1: face("photo-1494790108377-be9c29b29330"),
      team2: face("photo-1507003211169-0a1dd7228f2d"),
      team3: face("photo-1438761681033-6461ffad8d80"),
      abstract: u("photo-1557682250-33bd709cbe85"),
      city: u("photo-1477959858617-67f85cf4f1df", 1400, 800),
      nature: u("photo-1501854140801-50d01698950b"),
    },
  },

  // ── Automotive / Luxury ──
  automotive: {
    brandName: "KARZONE",
    heroTitle: "Rent the Luxury.",
    heroTitleBreak: "Own the Thrill.",
    heroSubtitle: "From exotic sports cars to luxury sedans and SUVs, Karzone's Exotic Car Collection offers an exceptional selection and trusted, personalised service.",
    heroCtaPrimary: "Contact Us",
    heroCtaSecondary: "View Fleet",
    heroSplitCtas: ["Rent a car", "Buy a car"],
    navLinks: ["Reservations", "Vehicles", "Locations", "Car Sales", "For Business"],
    aboutText: "From exotic sports cars to luxury sedans and SUVs, Karzone's Exotic Car Collection",
    aboutHighlight: "offers an exceptional selection and Karzone's trusted, personalised service.",
    featuredBrand: "JAGUAR",
    featuredModel: "F-TYPE R",
    featuredSubtitle: "Every detail of the new alloy wheels is a gold standard that is specially molded for vehicles that exude sophistication and style.",
    featuredImage: u("photo-1609521263047-f8f205293f24", 1200, 700),
    brandLogos: ["Bugatti", "Ferrari", "Lamborghini", "Jaguar", "Bentley", "Rolls-Royce"],
    features: [
      { icon: "🏎️", title: "Premium Fleet", desc: "From Porsche to Lamborghini — over 200 luxury vehicles ready." },
      { icon: "🔑", title: "Instant Access", desc: "Book online, pick up in 30 minutes." },
      { icon: "🛡️", title: "Fully Insured", desc: "Comprehensive cover & 24/7 roadside assistance included." },
    ],
    stats: [
      { num: "450", label: "Models" },
      { num: "200", label: "Dealers" },
      { num: "2024", label: "Fleet" },
      { num: "50k+", label: "Rides" },
    ],
    testimonials: [
      { name: "Robert Keller", role: "Entrepreneur", quote: "The Lamborghini Urus was a dream. Absolutely world-class service." },
      { name: "Sophia Lang", role: "Creative Director", quote: "Every drive feels like an experience — not just transportation." },
      { name: "Thomas Braun", role: "CEO, Apex Group", quote: "My first choice for business meetings. Always impeccable." },
    ],
    bigText: "Arrive in",
    bigTextHighlight: "Style.",
    galleryTitle: "Our Fleet",
    galleryCaptions: ["Porsche 911 GT3", "Mercedes-AMG GT", "Lamborghini Huracán"],
    pricingPlans: [
      { name: "Classic", price: "€199", features: ["Mercedes C-Class", "200 km/day", "Basic Insurance"], popular: false },
      { name: "Premium", price: "€499", features: ["Porsche 911", "Unlimited km", "Full Cover"], popular: true },
      { name: "Elite", price: "€999", features: ["Lamborghini", "Concierge Service", "VIP Handover"], popular: false },
    ],
    ctaTitle: "Ready for the Experience?",
    ctaSubtitle: "Choose your dream car and start today.",
    ctaCta: "Book Now →",
    contactTitle: "Get in Touch",
    footerTagline: "Exotic sports cars. World-class service.",
    marqueeItems: ["Porsche", "Lamborghini", "Ferrari", "Mercedes-AMG", "BMW M", "Bentley"],
    contentTitle: "Superior Customer Service",
    contentDesc: "Experience exotic car rental where the brand is our care for every client's extraordinary journey. Our goal is to meet your needs and exceed expectations.",
    images: {
      hero: u("photo-1503376780353-7e6692767b70", 1400, 800),
      office: u("photo-1544636331-e26879cd4d9b"),
      product: u("photo-1618843479313-40f8afb4b4d8", 600, 600),
      work1: u("photo-1580273916550-e323be2ae537"),
      work2: u("photo-1494976388531-d1058494ceb8"),
      work3: u("photo-1503736334956-4c8f8e92946d"),
      team1: face("photo-1472099645785-5658abf4ff4e"),
      team2: face("photo-1500648767791-00dcc994a43e"),
      team3: face("photo-1534528741775-53994a69daeb"),
      abstract: u("photo-1492144534655-ae79c964c9d7", 1400, 800),
      city: u("photo-1514316703755-dca7d7d9d882", 1400, 800),
      nature: u("photo-1605559424843-9e4c228bf1c2"),
    },
  },

  // ── Fitness / Gym (ZONIXX Editorial) ──
  fitness: {
    brandName: "ZONIXX",
    isEditorial: true,
    heroTitle: "Find Your",
    heroTitleBreak: "Strength.",
    heroSubtitle: "We are dedicated to help you achieve your fitness goals and improve your overall health and well-being.",
    heroCtaPrimary: "Join Today",
    heroCtaSecondary: "View Trainings",
    navLinks: ["About", "Trainings", "Testimonials", "Contacts"],
    aboutText: "Fitness should be accessible to everyone.",
    aboutHighlight: "Whether you're a seasoned athlete or just starting out, we have a variety of equipment and classes to suit your needs.",
    missionTitle: "FITNESS SHOULD BE ACCESSIBLE TO EVERYONE.",
    missionDesc: "Whether you're a seasoned athlete or just starting out, we have a variety of equipment and classes to suit your needs. Our cardio machines, weight lifting equipment, and functional training areas provide a comprehensive workout experience.",
    trainingCategories: ["Personal Training", "Group Fitness Classes", "Functional Training"],
    features: [
      { icon: "✦", title: "Personal Training", desc: "1:1 coaching from certified trainers tailored to your goals." },
      { icon: "✦", title: "Group Classes", desc: "HIIT, Yoga, CrossFit, Pilates and more — every day." },
      { icon: "✦", title: "Functional Training", desc: "Full-body programs for strength, endurance and mobility." },
    ],
    stats: [
      { num: "50+", label: "Trainers" },
      { num: "15k+", label: "Members" },
      { num: "98%", label: "Satisfaction" },
      { num: "30+", label: "Classes/Week" },
    ],
    testimonials: [
      { name: "Sarah König", role: "Member since 2023", quote: "I absolutely love this gym! The trainers are amazing and the atmosphere is incredible." },
      { name: "Marco Diaz", role: "CrossFit Athlete", quote: "Great place to work out. Best equipment and coaching in the city." },
      { name: "Elena Fischer", role: "Yoga Enthusiast", quote: "Love it, no difference from a premium boutique studio. This is the place for you." },
    ],
    bigText: "Your Body Is",
    bigTextHighlight: "Your Temple.",
    galleryTitle: "Trainings",
    galleryCaptions: ["Strength Area", "Group Room", "Recovery Zone"],
    pricingPlans: [
      { name: "Basic", price: "€29", features: ["Equipment Access", "Locker", "App Access"], popular: false },
      { name: "Premium", price: "€59", features: ["All Basic", "All Classes", "Sauna"], popular: true },
      { name: "Elite", price: "€99", features: ["All Premium", "Personal Trainer", "Nutrition Plan"], popular: false },
    ],
    ctaTitle: "Your Body Is Your Temple.",
    ctaSubtitle: "Whether you're a seasoned athlete or just starting out, we have a variety of equipment and classes to suit your needs.",
    ctaCta: "Join Today",
    contactTitle: "Come Visit",
    footerTagline: "Fitness for everyone. Results for all.",
    marqueeItems: ["I absolutely love this gym!", "Great place to work out", "Love it, no difference!", "This is the place for you."],
    contentTitle: "Inside and Out.",
    contentDesc: "We are dedicated to help you achieve your fitness goals and improve your overall health and well-being.",
    images: {
      hero: u("photo-1534438327276-14e5300c3a48", 1400, 800),
      office: u("photo-1571019614242-c5c5dee9f50a"),
      product: u("photo-1576678927484-cc907957088c", 600, 600),
      work1: u("photo-1517836357463-d25dfeac3438"),
      work2: u("photo-1574680096145-d05b474e2155"),
      work3: u("photo-1518611012118-696072aa579a"),
      team1: face("photo-1548690312-e3b507d8c110"),
      team2: face("photo-1567013127542-490d757e51fc"),
      team3: face("photo-1544005313-94ddf0286df2"),
      abstract: u("photo-1476480862126-209bfaa8edc8", 1400, 800),
      city: u("photo-1593079831268-3381b0db4a77", 1400, 800),
      nature: u("photo-1552674605-db6ffd4facb5"),
    },
  },

  // ── Portfolio / Minimal ──
  portfolio: {
    brandName: "Studio M",
    heroTitle: "Kreativität",
    heroTitleBreak: "ohne Grenzen.",
    heroSubtitle: "Digitales Design, Branding und interaktive Erlebnisse.",
    heroCtaPrimary: "Projekte ansehen",
    heroCtaSecondary: "Kontakt",
    navLinks: ["Arbeiten", "Über mich", "Kontakt"],
    features: [
      { icon: "🎯", title: "UI/UX Design", desc: "Nutzerzentrierte Interfaces die begeistern." },
      { icon: "✏️", title: "Brand Identity", desc: "Markenauftritte die im Gedächtnis bleiben." },
      { icon: "💻", title: "Web Development", desc: "Performante Websites mit modernem Stack." },
    ],
    stats: [
      { num: "120+", label: "Projekte" },
      { num: "8", label: "Jahre" },
      { num: "40+", label: "Kunden" },
      { num: "15", label: "Awards" },
    ],
    testimonials: [
      { name: "Jan Becker", role: "Gründer, TechBrew", quote: "Unser Rebranding hat die Conversion um 40% gesteigert." },
      { name: "Nina Kraft", role: "Marketing Lead", quote: "Kreativ, zuverlässig und immer pünktlich." },
      { name: "Felix Roth", role: "Startup Founder", quote: "Der beste Designer mit dem ich je gearbeitet habe." },
    ],
    bigText: "Design ist",
    bigTextHighlight: "Haltung.",
    galleryTitle: "Selected Work",
    galleryCaptions: ["Brand Refresh", "App Design", "Website Launch"],
    pricingPlans: [
      { name: "Starter", price: "€2.500", features: ["Logo + Basics", "2 Revisionen"], popular: false },
      { name: "Standard", price: "€7.500", features: ["Full Branding", "Website", "5 Revisionen"], popular: true },
      { name: "Premium", price: "€15.000", features: ["Alles + Motion", "Unbegrenzte Revisionen"], popular: false },
    ],
    ctaTitle: "Projekt im Kopf?",
    ctaSubtitle: "Lass uns darüber reden.",
    ctaCta: "Schreib mir →",
    contactTitle: "Sag Hallo",
    footerTagline: "Design mit Substanz.",
    marqueeItems: ["Awwwards", "Dribbble", "Behance", "FWA", "CSS Design Awards", "Webby"],
    contentTitle: "Durchdachtes Design",
    contentDesc: "Jedes Projekt beginnt mit einem tiefen Verständnis für die Marke.",
    images: {
      hero: u("photo-1558618666-fcd25c85f82e", 1400, 800),
      office: u("photo-1542744094-3a31f272c490"),
      product: u("photo-1586717791821-3f44a563fa4c", 600, 600),
      work1: u("photo-1561070791-2526d30994b5"),
      work2: u("photo-1558655146-9f40138edfeb"),
      work3: u("photo-1559028012-481c04fa702d"),
      team1: face("photo-1494790108377-be9c29b29330"),
      team2: face("photo-1507003211169-0a1dd7228f2d"),
      team3: face("photo-1438761681033-6461ffad8d80"),
      abstract: u("photo-1557682250-33bd709cbe85"),
      city: u("photo-1486406146926-c627a92ad1ab", 1400, 800),
      nature: u("photo-1494438639946-1ebd1d20bf85"),
    },
  },

  // ── Agency ──
  agency: {
    brandName: "BLACKPINE",
    heroTitle: "We Craft Digital",
    heroTitleBreak: "Experiences.",
    heroSubtitle: "Strategie, Design und Technologie für Marken die führen wollen.",
    heroCtaPrimary: "Projekt starten",
    heroCtaSecondary: "Case Studies",
    navLinks: ["Services", "Arbeiten", "Team"],
    features: [
      { icon: "📐", title: "Strategie", desc: "Datengetriebene Markenstrategie." },
      { icon: "🖌️", title: "Design", desc: "Award-winning Digital Design." },
      { icon: "⚙️", title: "Development", desc: "Skalierbare Web-Applikationen." },
    ],
    stats: [
      { num: "150+", label: "Projekte" },
      { num: "12", label: "Jahre" },
      { num: "3x", label: "ROI Durchschnitt" },
      { num: "45", label: "Team" },
    ],
    testimonials: [
      { name: "Dr. Eva Hartmann", role: "CMO, AutoGroup", quote: "BLACKPINE hat unsere digitale Präsenz komplett transformiert." },
      { name: "Stefan Meier", role: "CEO, FinTech AG", quote: "Strategisch, kreativ und technisch auf höchstem Niveau." },
      { name: "Julia Weiß", role: "Brand Director", quote: "Die Zusammenarbeit war exzellent — vom Briefing bis zum Launch." },
    ],
    bigText: "Ideas that",
    bigTextHighlight: "move markets.",
    galleryTitle: "Case Studies",
    galleryCaptions: ["AutoGroup Digital", "FinTech Rebrand", "Luxury E-Commerce"],
    pricingPlans: [
      { name: "Sprint", price: "€15k", features: ["4 Wochen", "Design + Dev", "1 Deliverable"], popular: false },
      { name: "Partnership", price: "€40k", features: ["3 Monate", "Full Team", "Strategie + Execution"], popular: true },
      { name: "Retainer", price: "€12k/m", features: ["Ongoing", "Dediziertes Team", "Priority Support"], popular: false },
    ],
    ctaTitle: "Let's Build Something Great.",
    ctaSubtitle: "Wir freuen uns auf dein Projekt.",
    ctaCta: "Kontakt aufnehmen →",
    contactTitle: "Get in Touch",
    footerTagline: "Digital Agency for ambitious brands.",
    marqueeItems: ["BMW", "Siemens", "Bosch", "SAP", "Deutsche Bank", "Adidas"],
    contentTitle: "Strategic Thinking",
    contentDesc: "Wir verbinden Markenverständnis mit technischer Exzellenz.",
    images: {
      hero: u("photo-1497366216548-37526070297c", 1400, 800),
      office: u("photo-1497215842964-222b430dc094"),
      product: u("photo-1460925895917-afdab827c52f", 600, 600),
      work1: u("photo-1551434678-e076c223a692"),
      work2: u("photo-1460925895917-afdab827c52f"),
      work3: u("photo-1553877522-43269d4ea984"),
      team1: face("photo-1560250097-0b93528c311a"),
      team2: face("photo-1573497019940-1c28c88b4f3e"),
      team3: face("photo-1580489944761-15a19d654956"),
      abstract: u("photo-1557683316-973673baf926"),
      city: u("photo-1486406146926-c627a92ad1ab", 1400, 800),
      nature: u("photo-1497366811353-6870744d04b2"),
    },
  },

  // ── E-Commerce ──
  ecommerce: {
    brandName: "Lumière",
    heroTitle: "Entdecke",
    heroTitleBreak: "deinen Stil.",
    heroSubtitle: "Kuratierte Produkte für den modernen Lifestyle.",
    heroCtaPrimary: "Jetzt shoppen",
    heroCtaSecondary: "Kollektion ansehen",
    navLinks: ["Shop", "Kollektion", "Sale"],
    features: [
      { icon: "📦", title: "Kostenloser Versand", desc: "Ab €50 Bestellwert versandkostenfrei." },
      { icon: "↩️", title: "30 Tage Rückgabe", desc: "Einfach und kostenlos zurücksenden." },
      { icon: "💳", title: "Sicher bezahlen", desc: "Apple Pay, Klarna, Kreditkarte." },
    ],
    stats: [
      { num: "50k+", label: "Kunden" },
      { num: "2.000+", label: "Produkte" },
      { num: "4.8★", label: "Bewertung" },
      { num: "24h", label: "Versand" },
    ],
    testimonials: [
      { name: "Maria Vogt", role: "Kundin", quote: "Die Qualität ist hervorragend — ich bestelle immer wieder." },
      { name: "Leon Krüger", role: "Kunde", quote: "Schneller Versand, tolle Verpackung, super Produkte." },
      { name: "Hannah Schreiber", role: "Stammkundin", quote: "Mein Go-to Shop für besondere Geschenke." },
    ],
    bigText: "Quality over",
    bigTextHighlight: "Quantity.",
    galleryTitle: "Bestseller",
    galleryCaptions: ["Minimal Watch", "Leder Tasche", "Keramik Set"],
    pricingPlans: [
      { name: "Basic", price: "Gratis", features: ["Standard Versand", "Newsletter"], popular: false },
      { name: "Member", price: "€9.99/m", features: ["Gratis Versand", "Early Access", "10% Rabatt"], popular: true },
      { name: "VIP", price: "€24.99/m", features: ["Alles + Exklusiv", "Personal Shopper", "Geschenke"], popular: false },
    ],
    ctaTitle: "Werde Teil der Community",
    ctaSubtitle: "Melde dich an und erhalte 15% auf deine erste Bestellung.",
    ctaCta: "Anmelden →",
    contactTitle: "Kundenservice",
    footerTagline: "Kuratierter Lifestyle, geliefert an deine Tür.",
    marqueeItems: ["Vogue", "GQ", "Elle", "Monocle", "Wallpaper*", "Highsnobiety"],
    contentTitle: "Handverlesene Qualität",
    contentDesc: "Jedes Produkt wird sorgfältig ausgewählt und geprüft.",
    images: {
      hero: u("photo-1441986300917-64674bd600d8", 1400, 800),
      office: u("photo-1523275335684-37898b6baf30"),
      product: u("photo-1560343090-f0409e92791a", 600, 600),
      work1: u("photo-1491637639811-60e2756cc1c7"),
      work2: u("photo-1505740420928-5e560c06d30e"),
      work3: u("photo-1572635196237-14b3f281503f"),
      team1: face("photo-1534528741775-53994a69daeb"),
      team2: face("photo-1506794778202-cad84cf45f1d"),
      team3: face("photo-1544005313-94ddf0286df2"),
      abstract: u("photo-1558618666-fcd25c85f82e"),
      city: u("photo-1441986300917-64674bd600d8", 1400, 800),
      nature: u("photo-1494438639946-1ebd1d20bf85"),
    },
  },

  // ── Corporate ──
  corporate: {
    brandName: "BlueVault",
    heroTitle: "Digitale Lösungen",
    heroTitleBreak: "die bewegen.",
    heroSubtitle: "Enterprise Software und Beratung für den deutschen Mittelstand.",
    heroCtaPrimary: "Beratungsgespräch",
    heroCtaSecondary: "Referenzen",
    navLinks: ["Lösungen", "Referenzen", "Über uns"],
    features: [
      { icon: "📊", title: "Data Analytics", desc: "Echtzeit-Dashboards für fundierte Entscheidungen." },
      { icon: "☁️", title: "Cloud Migration", desc: "Sichere Migration in die Cloud." },
      { icon: "🤖", title: "KI-Integration", desc: "Intelligente Automatisierung Ihrer Prozesse." },
    ],
    stats: [
      { num: "500+", label: "Kunden" },
      { num: "15", label: "Jahre" },
      { num: "€2.5B", label: "Verwaltetes Volumen" },
      { num: "99.9%", label: "SLA" },
    ],
    testimonials: [
      { name: "Dr. Klaus Richter", role: "CIO, Mittelstand AG", quote: "BlueVault hat unsere IT-Infrastruktur zukunftssicher gemacht." },
      { name: "Petra Hoffmann", role: "CFO, IndustrieWerk", quote: "ROI innerhalb von 6 Monaten erreicht." },
      { name: "Michael Berg", role: "Vorstand, FinanzGruppe", quote: "Professionell, kompetent und verlässlich." },
    ],
    bigText: "Innovation für den",
    bigTextHighlight: "Mittelstand.",
    galleryTitle: "Referenzen",
    galleryCaptions: ["Industrie 4.0", "Cloud Platform", "Analytics Suite"],
    pricingPlans: [
      { name: "Starter", price: "€2.999/m", features: ["Bis 50 Nutzer", "Standard Support"], popular: false },
      { name: "Business", price: "€7.999/m", features: ["Unbegrenzt", "Premium Support", "SLA 99.9%"], popular: true },
      { name: "Enterprise", price: "Individuell", features: ["Dedicated Team", "On-Premise", "24/7"], popular: false },
    ],
    ctaTitle: "Bereit für die digitale Transformation?",
    ctaSubtitle: "Vereinbaren Sie ein kostenloses Beratungsgespräch.",
    ctaCta: "Termin vereinbaren →",
    contactTitle: "Kontakt",
    footerTagline: "Enterprise Solutions. Made in Germany.",
    marqueeItems: ["SAP", "Microsoft", "AWS", "Google Cloud", "Salesforce", "ServiceNow"],
    contentTitle: "Ganzheitliche Beratung",
    contentDesc: "Von der Strategie bis zur Implementierung — alles aus einer Hand.",
    images: {
      hero: u("photo-1486406146926-c627a92ad1ab", 1400, 800),
      office: u("photo-1497366216548-37526070297c"),
      product: u("photo-1551288049-bebda4e38f71", 600, 600),
      work1: u("photo-1460925895917-afdab827c52f"),
      work2: u("photo-1504868584819-f8e8b4b6d7e3"),
      work3: u("photo-1553877522-43269d4ea984"),
      team1: face("photo-1560250097-0b93528c311a"),
      team2: face("photo-1573497019940-1c28c88b4f3e"),
      team3: face("photo-1580489944761-15a19d654956"),
      abstract: u("photo-1557683316-973673baf926"),
      city: u("photo-1486406146926-c627a92ad1ab", 1400, 800),
      nature: u("photo-1497366811353-6870744d04b2"),
    },
  },

  // ── Startup ──
  startup: {
    brandName: "LaunchPad",
    heroTitle: "Ship Faster.",
    heroTitleBreak: "Scale Smarter.",
    heroSubtitle: "Die Developer-Plattform die dein Team 10x produktiver macht.",
    heroCtaPrimary: "Free starten",
    heroCtaSecondary: "GitHub →",
    navLinks: ["Features", "Docs", "Pricing"],
    features: [
      { icon: "🚀", title: "Instant Deploy", desc: "Push to Git, live in Sekunden." },
      { icon: "🔄", title: "Auto-Scaling", desc: "Von 0 auf 1M Requests ohne Config." },
      { icon: "📡", title: "Edge Network", desc: "Global in unter 50ms." },
    ],
    stats: [
      { num: "100k+", label: "Developers" },
      { num: "<50ms", label: "Latenz" },
      { num: "99.99%", label: "Uptime" },
      { num: "40+", label: "Regionen" },
    ],
    testimonials: [
      { name: "Alex Chen", role: "CTO, YCombinator Startup", quote: "Wir haben in 2 Wochen gelaunched statt 2 Monaten." },
      { name: "Sarah Park", role: "Solo Founder", quote: "Als Solo-Founder ist LaunchPad wie ein ganzes DevOps-Team." },
      { name: "David Kim", role: "Lead Engineer", quote: "Die DX ist unschlagbar. Bester Stack den wir je hatten." },
    ],
    bigText: "Build. Ship.",
    bigTextHighlight: "Repeat.",
    galleryTitle: "Built with LaunchPad",
    galleryCaptions: ["AI Dashboard", "Commerce API", "Analytics Engine"],
    pricingPlans: [
      { name: "Hobby", price: "$0", features: ["3 Projekte", "100k Requests", "Community Support"], popular: false },
      { name: "Pro", price: "$20/m", features: ["Unbegrenzt", "1M Requests", "Priority Support"], popular: true },
      { name: "Enterprise", price: "Custom", features: ["SSO", "SLA 99.99%", "Dedicated Infra"], popular: false },
    ],
    ctaTitle: "Ready to launch?",
    ctaSubtitle: "Deploy your first project in under 60 seconds.",
    ctaCta: "Get Started Free →",
    contactTitle: "Talk to Sales",
    footerTagline: "The platform for modern developers.",
    marqueeItems: ["Vercel", "Supabase", "PlanetScale", "Clerk", "Resend", "Neon"],
    contentTitle: "Developer Experience First",
    contentDesc: "Intuitive APIs, excellent docs, zero boilerplate.",
    images: {
      hero: u("photo-1518770660439-4636190af475", 1400, 800),
      office: u("photo-1504384308090-c894fdcc538d"),
      product: u("photo-1555066931-4365d14bab8c", 600, 600),
      work1: u("photo-1551434678-e076c223a692"),
      work2: u("photo-1498050108023-c5249f4df085"),
      work3: u("photo-1461749280684-dccba630e2f6"),
      team1: face("photo-1472099645785-5658abf4ff4e"),
      team2: face("photo-1534528741775-53994a69daeb"),
      team3: face("photo-1506794778202-cad84cf45f1d"),
      abstract: u("photo-1451187580459-43490279c0fa"),
      city: u("photo-1451187580459-43490279c0fa", 1400, 800),
      nature: u("photo-1518770660439-4636190af475"),
    },
  },

  // ── Restaurant / Culinary ──
  restaurant: {
    brandName: "Bella Cucina",
    heroTitle: "Genuss neu",
    heroTitleBreak: "erleben.",
    heroSubtitle: "Authentische italienische Küche mit regionalen Zutaten — seit 1985.",
    heroCtaPrimary: "Tisch reservieren",
    heroCtaSecondary: "Speisekarte",
    navLinks: ["Speisekarte", "Reservierung", "Über uns"],
    features: [
      { icon: "🍝", title: "Frische Pasta", desc: "Täglich handgemacht nach Familienrezept." },
      { icon: "🍷", title: "Weinkarte", desc: "Über 200 erlesene Weine aus Italien." },
      { icon: "👨‍🍳", title: "Sternekoch", desc: "Küche unter Leitung von Chef Marco Rossi." },
    ],
    stats: [
      { num: "38", label: "Jahre" },
      { num: "1★", label: "Michelin Stern" },
      { num: "200+", label: "Weine" },
      { num: "4.9", label: "Google Rating" },
    ],
    testimonials: [
      { name: "Christina Wolf", role: "Stammgast", quote: "Jeder Besuch ist wie eine kleine Reise nach Italien." },
      { name: "Prof. Andreas Müller", role: "Weinkritiker", quote: "Die Weinkarte ist eine der besten außerhalb Italiens." },
      { name: "Laura Bianchi", role: "Food Bloggerin", quote: "Die Trüffel-Tagliatelle sind ein Gedicht." },
    ],
    bigText: "La dolce",
    bigTextHighlight: "Vita.",
    galleryTitle: "Impressionen",
    galleryCaptions: ["Trüffel Risotto", "Unser Garten", "Weinabend"],
    pricingPlans: [
      { name: "Lunch Menü", price: "€35", features: ["3 Gänge", "Wasser inkl.", "Mo–Fr"], popular: false },
      { name: "Dinner Menü", price: "€75", features: ["5 Gänge", "Weinbegleitung", "Amuse Bouche"], popular: true },
      { name: "Chef's Table", price: "€120", features: ["7 Gänge", "Exklusiv", "Meet the Chef"], popular: false },
    ],
    ctaTitle: "Reservieren Sie Ihren Tisch",
    ctaSubtitle: "Wir freuen uns auf Ihren Besuch.",
    ctaCta: "Jetzt reservieren →",
    contactTitle: "Besuchen Sie uns",
    footerTagline: "Authentisch italienisch seit 1985.",
    marqueeItems: ["Michelin", "Gault&Millau", "Falstaff", "Feinschmecker", "GQ Best Restaurants", "Varta"],
    contentTitle: "Tradition & Handwerk",
    contentDesc: "Unsere Pasta wird täglich frisch von Hand gefertigt.",
    images: {
      hero: u("photo-1517248135467-4c7edcad34c4", 1400, 800),
      office: u("photo-1414235077428-338989a2e8c0"),
      product: u("photo-1504674900247-0877df9cc836", 600, 600),
      work1: u("photo-1555396273-367ea4eb4db5"),
      work2: u("photo-1504674900247-0877df9cc836"),
      work3: u("photo-1577219491135-ce391730fb2c"),
      team1: face("photo-1577219491135-ce391730fb2c"),
      team2: face("photo-1560250097-0b93528c311a"),
      team3: face("photo-1534528741775-53994a69daeb"),
      abstract: u("photo-1506368249639-73a05d6f6488"),
      city: u("photo-1517248135467-4c7edcad34c4", 1400, 800),
      nature: u("photo-1416339306562-f3d12fefd36f"),
    },
  },

  // ── Creative Studio ──
  creative: {
    brandName: "PRISM",
    heroTitle: "Make It",
    heroTitleBreak: "Loud.",
    heroSubtitle: "Branding, Motion Design und digitale Erlebnisse die auffallen.",
    heroCtaPrimary: "Projekte ansehen",
    heroCtaSecondary: "Kontakt",
    navLinks: ["Work", "About", "Contact"],
    features: [
      { icon: "🎬", title: "Motion Design", desc: "Animationen die Geschichten erzählen." },
      { icon: "🎨", title: "Branding", desc: "Identitäten die Aufmerksamkeit erregen." },
      { icon: "🌐", title: "Web Experiences", desc: "Interaktive Websites mit Wow-Effekt." },
    ],
    stats: [
      { num: "80+", label: "Projekte" },
      { num: "5", label: "Awwwards" },
      { num: "100%", label: "Leidenschaft" },
      { num: "∞", label: "Ideen" },
    ],
    testimonials: [
      { name: "Kai Müller", role: "Creative Director, Nike", quote: "PRISM denkt größer als alle anderen." },
      { name: "Lena Park", role: "Head of Brand, Spotify", quote: "Die Motion-Arbeit war atemberaubend." },
      { name: "Tom Richards", role: "Founder, Hyper", quote: "Unser Relaunch war ein voller Erfolg dank PRISM." },
    ],
    bigText: "Break the",
    bigTextHighlight: "Rules.",
    galleryTitle: "Selected Work",
    galleryCaptions: ["Nike Campaign", "Spotify Visual", "Hyper Launch"],
    pricingPlans: [
      { name: "Quick", price: "€5k", features: ["2 Wochen", "1 Deliverable", "2 Revisionen"], popular: false },
      { name: "Standard", price: "€15k", features: ["6 Wochen", "Full Package", "Unbegrenzt"], popular: true },
      { name: "Epic", price: "€30k+", features: ["12 Wochen", "Everything", "Dedicated Team"], popular: false },
    ],
    ctaTitle: "Got an Idea?",
    ctaSubtitle: "Wir machen es real.",
    ctaCta: "Let's Talk →",
    contactTitle: "Say Hello",
    footerTagline: "Creative Studio for bold brands.",
    marqueeItems: ["Awwwards", "D&AD", "Cannes Lions", "FWA", "CSS Awards", "Red Dot"],
    contentTitle: "Unkonventionelles Denken",
    contentDesc: "Wir brechen Regeln — strategisch und mit Absicht.",
    images: {
      hero: u("photo-1558618666-fcd25c85f82e", 1400, 800),
      office: u("photo-1542744094-3a31f272c490"),
      product: u("photo-1561070791-2526d30994b5", 600, 600),
      work1: u("photo-1558655146-9f40138edfeb"),
      work2: u("photo-1559028012-481c04fa702d"),
      work3: u("photo-1550745165-9bc0b252726f"),
      team1: face("photo-1506794778202-cad84cf45f1d"),
      team2: face("photo-1544005313-94ddf0286df2"),
      team3: face("photo-1472099645785-5658abf4ff4e"),
      abstract: u("photo-1550745165-9bc0b252726f"),
      city: u("photo-1558618666-fcd25c85f82e", 1400, 800),
      nature: u("photo-1557682250-33bd709cbe85"),
    },
  },

  // ── Blog / Magazine ──
  editorial: {
    brandName: "The Journal",
    heroTitle: "Stories That",
    heroTitleBreak: "Matter.",
    heroSubtitle: "Unabhängiger Journalismus, tiefgreifende Analysen und neue Perspektiven.",
    heroCtaPrimary: "Lesen",
    heroCtaSecondary: "Newsletter",
    navLinks: ["Magazin", "Themen", "Über uns"],
    features: [
      { icon: "📝", title: "Investigativ", desc: "Tiefgreifende Recherche ohne Kompromisse." },
      { icon: "🎙️", title: "Podcast", desc: "Wöchentliche Gespräche mit Experten." },
      { icon: "📩", title: "Newsletter", desc: "Die wichtigsten Stories, jeden Morgen." },
    ],
    stats: [
      { num: "500k+", label: "Leser" },
      { num: "2.000+", label: "Artikel" },
      { num: "15", label: "Journalisten" },
      { num: "48", label: "Awards" },
    ],
    testimonials: [
      { name: "Prof. Maria Engel", role: "Medienwissenschaftlerin", quote: "The Journal setzt Maßstäbe im digitalen Journalismus." },
      { name: "Stefan Bauer", role: "Leser seit Tag 1", quote: "Die einzige Quelle der ich noch voll vertraue." },
      { name: "Anna Lindgren", role: "Autorin", quote: "Brillante Redaktion, faire Zusammenarbeit." },
    ],
    bigText: "Truth Has",
    bigTextHighlight: "No Agenda.",
    galleryTitle: "Aktuelle Stories",
    galleryCaptions: ["Die Zukunft der KI", "Klimawandel Report", "Tech & Gesellschaft"],
    pricingPlans: [
      { name: "Free", price: "€0", features: ["5 Artikel/Monat", "Newsletter"], popular: false },
      { name: "Digital", price: "€9.99/m", features: ["Unbegrenzt", "Podcast", "Archiv"], popular: true },
      { name: "Print+Digital", price: "€19.99/m", features: ["Alles + Print", "Sonderausgaben"], popular: false },
    ],
    ctaTitle: "Bleib informiert.",
    ctaSubtitle: "Abonniere unseren Newsletter — kostenlos und werbefrei.",
    ctaCta: "Jetzt abonnieren →",
    contactTitle: "Redaktion",
    footerTagline: "Unabhängiger Journalismus seit 2018.",
    marqueeItems: ["Pulitzer", "Grimme", "dpa", "Reuters", "AP", "DJV"],
    contentTitle: "Hintergrund & Analyse",
    contentDesc: "Wir nehmen uns Zeit für die Geschichte hinter der Geschichte.",
    images: {
      hero: u("photo-1504711434969-e33886168d1c", 1400, 800),
      office: u("photo-1521791136064-7986c2920216"),
      product: u("photo-1504711434969-e33886168d1c", 600, 600),
      work1: u("photo-1457369804613-52c61a468e7d"),
      work2: u("photo-1486312338219-ce68d2c6f44d"),
      work3: u("photo-1504711434969-e33886168d1c"),
      team1: face("photo-1438761681033-6461ffad8d80"),
      team2: face("photo-1507003211169-0a1dd7228f2d"),
      team3: face("photo-1494790108377-be9c29b29330"),
      abstract: u("photo-1457369804613-52c61a468e7d"),
      city: u("photo-1504711434969-e33886168d1c", 1400, 800),
      nature: u("photo-1432821596592-e2c18b78144f"),
    },
  },

  // ── Real Estate ──
  realestate: {
    brandName: "Prime Properties",
    heroTitle: "Finde dein",
    heroTitleBreak: "Traumzuhause.",
    heroSubtitle: "Exklusive Immobilien in den besten Lagen Deutschlands.",
    heroCtaPrimary: "Immobilien suchen",
    heroCtaSecondary: "Beratung anfragen",
    navLinks: ["Immobilien", "Verkaufen", "Über uns"],
    features: [
      { icon: "🏡", title: "Premium Lagen", desc: "Handverlesene Objekte in Top-Locations." },
      { icon: "📋", title: "Full Service", desc: "Von der Besichtigung bis zum Notar." },
      { icon: "💰", title: "Finanzierung", desc: "Individuelle Finanzierungsberatung." },
    ],
    stats: [
      { num: "€850M+", label: "Vermittelt" },
      { num: "1.200+", label: "Verkäufe" },
      { num: "25", label: "Jahre" },
      { num: "98%", label: "Empfehlungsrate" },
    ],
    testimonials: [
      { name: "Familie Schneider", role: "Käufer, München", quote: "Den perfekten Makler und das perfekte Haus gefunden." },
      { name: "Herr Dr. Braun", role: "Verkäufer, Berlin", quote: "Professionelle Vermarktung — Verkauf in 3 Wochen." },
      { name: "Frau Weber", role: "Käuferin, Hamburg", quote: "Erstklassige Beratung und immer erreichbar." },
    ],
    bigText: "Home is where",
    bigTextHighlight: "the heart is.",
    galleryTitle: "Ausgewählte Objekte",
    galleryCaptions: ["Villa am See", "Penthouse Berlin", "Altbau München"],
    pricingPlans: [
      { name: "Beratung", price: "Kostenlos", features: ["Erstgespräch", "Marktanalyse"], popular: false },
      { name: "Standard", price: "3.57%", features: ["Vermarktung", "Besichtigungen", "Verhandlung"], popular: true },
      { name: "Premium", price: "4.76%", features: ["Alles + Home Staging", "Video Tour", "Premium Listing"], popular: false },
    ],
    ctaTitle: "Ihr Traumhaus wartet.",
    ctaSubtitle: "Vereinbaren Sie jetzt ein unverbindliches Beratungsgespräch.",
    ctaCta: "Beratung anfragen →",
    contactTitle: "Kontakt",
    footerTagline: "Ihr Partner für exklusive Immobilien.",
    marqueeItems: ["ImmoScout24", "Engel & Völkers", "von Poll", "Dahler", "Savills", "JLL"],
    contentTitle: "Lokale Expertise",
    contentDesc: "Wir kennen jeden Stadtteil und finden die perfekte Lage für Sie.",
    images: {
      hero: u("photo-1600596542815-ffad4c1539a9", 1400, 800),
      office: u("photo-1600585154340-be6161a56a0c"),
      product: u("photo-1600607687939-ce8a6c25118c", 600, 600),
      work1: u("photo-1600596542815-ffad4c1539a9"),
      work2: u("photo-1600585154340-be6161a56a0c"),
      work3: u("photo-1600607687939-ce8a6c25118c"),
      team1: face("photo-1560250097-0b93528c311a"),
      team2: face("photo-1573497019940-1c28c88b4f3e"),
      team3: face("photo-1580489944761-15a19d654956"),
      abstract: u("photo-1600596542815-ffad4c1539a9"),
      city: u("photo-1600596542815-ffad4c1539a9", 1400, 800),
      nature: u("photo-1600585154340-be6161a56a0c"),
    },
  },
};

// ── Public API ──

export function getThemeContent(contentTheme?: string): ThemeContent {
  if (contentTheme && THEMES[contentTheme]) return THEMES[contentTheme];
  return THEMES.saas;
}

export const THEME_KEYS = Object.keys(THEMES);
