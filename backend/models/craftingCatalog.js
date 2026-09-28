// ============================================================
//  MATERIAIS DE CRAFTING
// ============================================================
const MATERIALS = {
  titanite_shard:      { name: "Fragmento de Titanita",     icon: "🔹", rarity: "common",    description: "Usado para +1 e +2 em armas." },
  titanite_chunk:      { name: "Pedaço de Titanita",        icon: "🔷", rarity: "rare",      description: "Usado para +3 em armas." },
  titanite_slab:       { name: "Laje de Titanita",          icon: "💎", rarity: "epic",      description: "Raro. Usado para forjar armas especiais." },
  dragon_scale:        { name: "Escama de Dragão",          icon: "🐉", rarity: "epic",      description: "Material raro de dragões." },
  demon_titanite:      { name: "Titanita Demoníaca",        icon: "😈", rarity: "rare",      description: "Corrompida. Usada em infusões." },
  twinkling_titanite:  { name: "Titanita Cintilante",       icon: "✨", rarity: "epic",      description: "Para forjar armas lendárias." },
  red_titanite:        { name: "Titanita Vermelha",         icon: "🔴", rarity: "rare",      description: "Infunde fogo nas armas." },
  blue_titanite:       { name: "Titanita Azul",             icon: "🔵", rarity: "rare",      description: "Infunde magia nas armas." },
  white_titanite:      { name: "Titanita Branca",           icon: "⚪", rarity: "rare",      description: "Infunde raio nas armas." },
  boss_soul:           { name: "Alma de Chefe",             icon: "🌟", rarity: "legendary", description: "Usada para forjar armas de chefe." },
  black_steel:         { name: "Aço Negro",                 icon: "⬛", rarity: "epic",      description: "Metal dos cavaleiros negros." },
};

// ============================================================
//  RECEITAS DE CRAFTING
// ============================================================
// requires: { materials: { key: qty }, } — cria um novo item
const RECIPES = [
  {
    id: "forge_longsword",
    name: "Forjar Espada Longa",
    resultItem: "longsword",
    icon: "⚔️",
    description: "Espada equilibrada, boa para iniciantes.",
    materials: { titanite_shard: 3 },
    souls: 200,
  },
  {
    id: "forge_battle_axe",
    name: "Forjar Machado de Batalha",
    resultItem: "battle_axe",
    icon: "🪓",
    description: "Pesado, mas brutal.",
    materials: { titanite_shard: 5 },
    souls: 500,
  },
  {
    id: "forge_claymore",
    name: "Forjar Claymore",
    resultItem: "claymore",
    icon: "⚔️",
    description: "Espada dos cavaleiros de Astora.",
    materials: { titanite_chunk: 2, titanite_shard: 5 },
    souls: 1500,
  },
  {
    id: "forge_uchigatana",
    name: "Forjar Uchigatana",
    resultItem: "uchigatana",
    icon: "🗡️",
    description: "Katana oriental. Aplica sangramento.",
    materials: { titanite_chunk: 3, titanite_shard: 5 },
    souls: 2000,
  },
  {
    id: "forge_black_knight_sword",
    name: "Forjar Espada do Cavaleiro Negro",
    resultItem: "black_knight_sword",
    icon: "⚫",
    description: "Forjada para matar demônios.",
    materials: { black_steel: 3, titanite_chunk: 5 },
    souls: 5000,
  },
  {
    id: "forge_dragon_greatsword",
    name: "Forjar Espadão do Dragão",
    resultItem: "dragon_greatsword",
    icon: "🐉",
    description: "Feita de escamas de dragão.",
    materials: { dragon_scale: 3, titanite_slab: 1 },
    souls: 10000,
  },
  {
    id: "forge_moonlight_sword",
    name: "Forjar Espada do Luar",
    resultItem: "moonlight_sword",
    icon: "🌙",
    description: "Lâmina do dragão Seath. Escala com INT.",
    materials: { twinkling_titanite: 3, blue_titanite: 2, titanite_slab: 1 },
    souls: 15000,
  },
  {
    id: "forge_chaos_blade",
    name: "Forjar Lâmina do Caos",
    resultItem: "chaos_blade",
    icon: "🌋",
    description: "Espada da Filha do Caos.",
    materials: { demon_titanite: 5, red_titanite: 3, titanite_slab: 2 },
    souls: 20000,
  },
  {
    id: "forge_great_lord_sword",
    name: "Forjar Espada do Grande Lorde",
    resultItem: "great_lord_sword",
    icon: "👑",
    description: "Forjada da alma de Gwyn.",
    materials: { boss_soul: 1, white_titanite: 3, titanite_slab: 2 },
    souls: 25000,
  },
  {
    id: "forge_greatsword_artorias",
    name: "Forjar Espadão de Artorias",
    resultItem: "greatsword_artorias",
    icon: "🐺",
    description: "Do Cavaleiro do Abismo.",
    materials: { boss_soul: 1, black_steel: 5, titanite_slab: 3 },
    souls: 30000,
  },
];

// ============================================================
//  UPGRADES DE ARMAS (+1, +2, +3)
// ============================================================
const UPGRADE_TIERS = [
  { level: 1, name: "+1", damageBonus: 5,  materials: { titanite_shard: 2 },  souls: 300 },
  { level: 2, name: "+2", damageBonus: 12, materials: { titanite_shard: 4, titanite_chunk: 1 }, souls: 800 },
  { level: 3, name: "+3", damageBonus: 25, materials: { titanite_chunk: 3, titanite_slab: 1 }, souls: 2000 },
];

// ============================================================
//  INFUSÕES (adiciona efeito especial)
// ============================================================
const INFUSIONS = {
  fire:      { name: "Fogo",     icon: "🔥", material: "red_titanite",   souls: 1000, effect: "burn",      desc: "Aplica queimadura (5% HP/turno por 2 turnos)." },
  magic:     { name: "Magia",    icon: "🔮", material: "blue_titanite",  souls: 1500, effect: "magic",     desc: "+15% dano, ignora 30% da defesa." },
  lightning: { name: "Relâmpago",icon: "⚡", material: "white_titanite", souls: 1800, effect: "lightning", desc: "25% chance de atordoar o inimigo." },
  dark:      { name: "Sombrio",  icon: "🌑", material: "demon_titanite", souls: 2000, effect: "dark",      desc: "Rouba 10% de dano como HP." },
};

// ============================================================
//  DROPS DE MATERIAIS
// ============================================================
const MOB_MATERIAL_DROPS = {
  "Rato Gigante":      { titanite_shard: 0.15 },
  "Hollow Soldier":    { titanite_shard: 0.25 },
  "Undead Warrior":    { titanite_shard: 0.35 },
  "Hollow Thief":      { titanite_shard: 0.3 },
  "Baldur Knight":     { titanite_shard: 0.6, titanite_chunk: 0.15 },
  "Crystal Lizard":    { titanite_chunk: 0.5, titanite_slab: 0.05 },
  "Basilisk":          { demon_titanite: 0.3 },
  "Skeleton":          { titanite_shard: 0.6, titanite_chunk: 0.2 },
  "Black Knight":      { black_steel: 0.5, titanite_chunk: 0.4 },
  "Silver Knight":     { titanite_chunk: 0.6, twinkling_titanite: 0.1 },
  "Giant Skeleton":    { titanite_chunk: 0.7, titanite_slab: 0.1 },
  "Bonewheel Skeleton":{ demon_titanite: 0.4 },
  "Darkwraith":        { demon_titanite: 0.5, titanite_slab: 0.15 },
  "Prowling Demon":    { demon_titanite: 0.6, red_titanite: 0.3 },
  "Chaos Eater":       { demon_titanite: 0.7, red_titanite: 0.4 },
  "Titanite Demon":    { titanite_slab: 0.4, twinkling_titanite: 0.3 },
  "Mimic":             { twinkling_titanite: 0.4, titanite_slab: 0.2 },
  "Dragão Negro Jovem":{ dragon_scale: 0.5, titanite_slab: 0.3 },
};

const BOSS_MATERIAL_DROPS = {
  "Asylum Demon":        { titanite_shard: 1, demon_titanite: 0.3 },
  "Taurus Demon":        { titanite_chunk: 1, demon_titanite: 0.4 },
  "Bell Gargoyles":      { titanite_chunk: 1, twinkling_titanite: 0.3 },
  "Capra Demon":         { demon_titanite: 1, red_titanite: 0.3 },
  "Gaping Dragon":       { dragon_scale: 1, titanite_chunk: 1 },
  "Chaos Witch Quelaag": { demon_titanite: 1, red_titanite: 0.5 },
  "Iron Golem":          { titanite_slab: 1, black_steel: 0.5 },
  "Ornstein & Smough":   { titanite_slab: 1, twinkling_titanite: 0.5 },
  "Crossbreed Priscilla":{ twinkling_titanite: 1, titanite_slab: 0.4 },
  "Four Kings":          { demon_titanite: 2, boss_soul: 0.3 },
  "Seath the Scaleless": { dragon_scale: 2, blue_titanite: 1 },
  "Gravelord Nito":      { demon_titanite: 2, boss_soul: 0.4 },
  "Bed of Chaos":        { demon_titanite: 3, boss_soul: 0.5 },
  "Gwyn, Lord of Cinder":{ boss_soul: 1, white_titanite: 2, titanite_slab: 2 },
  "Knight Artorias":     { boss_soul: 1, black_steel: 2, titanite_slab: 1 },
  "Black Dragon Kalameet":{ dragon_scale: 3, boss_soul: 1 },
};

function rollMaterials(enemyName, isBoss = true) {
  const table = isBoss ? BOSS_MATERIAL_DROPS[enemyName] : MOB_MATERIAL_DROPS[enemyName];
  if (!table) return [];
  const drops = [];
  for (const [key, chance] of Object.entries(table)) {
    if (Math.random() < chance) {
      drops.push({ key, quantity: 1 });
    }
  }
  return drops;
}

module.exports = {
  MATERIALS, RECIPES, UPGRADE_TIERS, INFUSIONS,
  MOB_MATERIAL_DROPS, BOSS_MATERIAL_DROPS, rollMaterials,
};
