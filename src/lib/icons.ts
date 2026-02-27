// ── Icon Library ─────────────────────────────────────────────────────────
// Curated Lucide icon names grouped into sections for the IconPicker.
// Lucide is MIT-licensed — free to use, modify, and resell.

export interface IconSection {
  id: string;
  label: string;
  icons: string[]; // Lucide icon component names (PascalCase)
}

export const ICON_SECTIONS: IconSection[] = [
  // ── Allgemein & UI ─────────────────────────────────────────────────────
  {
    id: "general",
    label: "Allgemein & UI",
    icons: [
      "Home", "Search", "Settings", "Menu", "X", "Check", "Plus", "Minus",
      "ChevronDown", "ChevronUp", "ChevronLeft", "ChevronRight",
      "ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown",
      "ExternalLink", "Link", "Copy", "Clipboard", "Download", "Upload",
      "Filter", "SlidersHorizontal", "MoreHorizontal", "MoreVertical",
      "Eye", "EyeOff", "Maximize", "Minimize", "RefreshCw", "RotateCcw",
      "Loader", "Clock", "Calendar", "Info", "AlertCircle", "HelpCircle",
      "Ban", "Trash2", "Edit", "Pencil", "Save", "Undo", "Redo",
    ],
  },

  // ── Kommunikation ──────────────────────────────────────────────────────
  {
    id: "communication",
    label: "Kommunikation",
    icons: [
      "Mail", "MessageSquare", "MessageCircle", "Send", "Inbox", "Phone",
      "PhoneCall", "Video", "Mic", "MicOff", "Volume2", "VolumeX",
      "Bell", "BellRing", "BellOff", "AtSign", "Hash", "Globe",
      "Languages", "Share", "Share2", "Forward", "Reply", "Megaphone",
      "Radio", "Podcast", "Rss", "Newspaper", "BookOpen",
    ],
  },

  // ── Business & Finanzen ────────────────────────────────────────────────
  {
    id: "business",
    label: "Business & Finanzen",
    icons: [
      "Briefcase", "Building", "Building2", "Landmark", "Store",
      "ShoppingCart", "ShoppingBag", "CreditCard", "Wallet",
      "DollarSign", "Euro", "TrendingUp", "TrendingDown", "BarChart",
      "BarChart3", "PieChart", "LineChart", "Target", "Award",
      "Trophy", "Medal", "Crown", "Gem", "Receipt", "Calculator",
      "Percent", "BadgeCheck", "BadgeDollarSign", "Banknote",
      "CircleDollarSign", "HandCoins", "Handshake",
    ],
  },

  // ── Menschen & Nutzer ──────────────────────────────────────────────────
  {
    id: "people",
    label: "Menschen & Nutzer",
    icons: [
      "User", "UserPlus", "UserMinus", "UserCheck", "UserX",
      "Users", "UserCircle", "Contact", "Baby", "Accessibility",
      "Heart", "HeartHandshake", "ThumbsUp", "ThumbsDown", "Hand",
      "Smile", "Frown", "Meh", "Laugh", "PartyPopper",
      "PersonStanding", "Fingerprint", "ScanFace",
    ],
  },

  // ── Technologie & Entwicklung ──────────────────────────────────────────
  {
    id: "tech",
    label: "Technologie & Code",
    icons: [
      "Laptop", "Monitor", "Smartphone", "Tablet", "Watch",
      "Cpu", "HardDrive", "Server", "Database", "Cloud",
      "CloudUpload", "CloudDownload", "Wifi", "WifiOff", "Bluetooth",
      "Code", "Code2", "Terminal", "FileCode", "GitBranch",
      "GitCommit", "GitPullRequest", "GitMerge", "Bug", "Blocks",
      "Component", "Puzzle", "Webhook", "Binary", "Braces",
      "CircuitBoard", "Usb", "Nfc", "Radar",
    ],
  },

  // ── Medien & Kreativ ───────────────────────────────────────────────────
  {
    id: "media",
    label: "Medien & Kreativ",
    icons: [
      "Image", "Camera", "Film", "Play", "Pause", "SquarePlay",
      "SkipForward", "SkipBack", "Rewind", "FastForward",
      "Music", "Music2", "Headphones", "Speaker", "Palette",
      "Paintbrush", "PenTool", "Figma", "Layers", "Layout",
      "LayoutGrid", "LayoutList", "GalleryHorizontal", "GalleryVertical",
      "Crop", "Scissors", "Wand2", "Sparkles", "Brush", "Eraser",
      "Type", "Bold", "Italic", "Underline", "AlignLeft",
      "AlignCenter", "AlignRight", "List", "ListOrdered",
    ],
  },

  // ── Dateien & Dokumente ────────────────────────────────────────────────
  {
    id: "files",
    label: "Dateien & Dokumente",
    icons: [
      "File", "FileText", "FilePlus", "FileMinus", "FileCheck",
      "FileX", "FileSearch", "FileUp", "FileDown", "Files",
      "Folder", "FolderOpen", "FolderPlus", "FolderMinus",
      "Archive", "Package", "Box", "Boxes", "ClipboardList",
      "ClipboardCheck", "NotebookPen", "BookMarked", "Bookmark",
      "Tag", "Tags", "Label", "Paperclip", "ScrollText",
      "FileSpreadsheet", "Presentation", "Table",
    ],
  },

  // ── Navigation & Karten ────────────────────────────────────────────────
  {
    id: "navigation",
    label: "Navigation & Karten",
    icons: [
      "MapPin", "Map", "Navigation", "Compass", "Route",
      "Signpost", "Milestone", "Flag", "Locate", "LocateFixed",
      "Move", "Grip", "GripVertical", "ArrowUpRight", "ArrowDownRight",
      "CornerDownRight", "CornerUpRight", "MoveRight", "MoveLeft",
      "ChevronsRight", "ChevronsLeft", "ChevronsUp", "ChevronsDown",
      "ArrowBigRight", "ArrowBigLeft", "ArrowBigUp", "ArrowBigDown",
      "Orbit", "Waypoints",
    ],
  },

  // ── Sicherheit & Datenschutz ───────────────────────────────────────────
  {
    id: "security",
    label: "Sicherheit & Datenschutz",
    icons: [
      "Lock", "Unlock", "Shield", "ShieldCheck", "ShieldAlert",
      "ShieldOff", "Key", "KeyRound", "Scan", "ScanLine",
      "Fingerprint", "Eye", "EyeOff", "UserCheck", "AlertTriangle",
      "ShieldQuestion", "LockKeyhole", "UnlockKeyhole",
    ],
  },

  // ── Wetter & Natur ─────────────────────────────────────────────────────
  {
    id: "weather",
    label: "Wetter & Natur",
    icons: [
      "Sun", "Moon", "Cloud", "CloudRain", "CloudSnow",
      "CloudLightning", "CloudSun", "Wind", "Droplets", "Snowflake",
      "Thermometer", "Umbrella", "Rainbow", "Sunrise", "Sunset",
      "TreePine", "Trees", "Leaf", "Flower", "Flower2",
      "Sprout", "Mountain", "MountainSnow", "Waves", "Flame",
    ],
  },

  // ── Transport & Reisen ─────────────────────────────────────────────────
  {
    id: "transport",
    label: "Transport & Reisen",
    icons: [
      "Car", "Bus", "Train", "Plane", "Ship",
      "Bike", "Rocket", "Truck", "Ambulance",
      "Fuel", "ParkingCircle", "CircleParking", "TrainFront",
      "Luggage", "Tent", "Backpack",
    ],
  },

  // ── Formen & Symbole ───────────────────────────────────────────────────
  {
    id: "shapes",
    label: "Formen & Symbole",
    icons: [
      "Circle", "Square", "Triangle", "Diamond", "Hexagon",
      "Octagon", "Pentagon", "Star", "Zap", "Lightning",
      "Bolt", "Infinity", "Hash", "Asterisk", "AtSign",
      "CircleDot", "CircleCheck", "CircleX", "CirclePlus", "CircleMinus",
      "SquareCheck", "SquareX", "SquarePlus", "SquareMinus",
      "XCircle", "CheckCircle", "MinusCircle", "PlusCircle",
    ],
  },

  // ── Essen & Lifestyle ──────────────────────────────────────────────────
  {
    id: "lifestyle",
    label: "Essen & Lifestyle",
    icons: [
      "Coffee", "Wine", "Beer", "UtensilsCrossed", "Pizza",
      "Cake", "IceCream", "Apple", "Cherry", "Grape",
      "Cookie", "Sandwich", "Soup", "Salad", "Egg",
      "ShoppingBasket", "Gift", "GiftCard", "Shirt",
      "Glasses", "Watch", "Gem", "Dumbbell", "HeartPulse",
    ],
  },

  // ── Bildung & Wissenschaft ─────────────────────────────────────────────
  {
    id: "education",
    label: "Bildung & Wissenschaft",
    icons: [
      "GraduationCap", "BookOpen", "Book", "Library", "School",
      "Lightbulb", "Brain", "Atom", "Microscope", "FlaskConical",
      "TestTube", "Dna", "Stethoscope", "Pill", "Syringe",
      "Activity", "HeartPulse", "Telescope", "Globe2",
    ],
  },

  // ── Social Media ───────────────────────────────────────────────────────
  {
    id: "social",
    label: "Social & Sharing",
    icons: [
      "Share2", "Heart", "MessageCircle", "Bookmark", "Repeat",
      "ThumbsUp", "ThumbsDown", "Flag", "UserPlus", "Users",
      "Globe", "Link", "ExternalLink", "QrCode", "Scan",
      "Camera", "Video", "Mic", "Radio", "Tv",
    ],
  },
];

// Flat list of all unique icon names
export const ALL_ICON_NAMES = [
  ...new Set(ICON_SECTIONS.flatMap((s) => s.icons)),
];
