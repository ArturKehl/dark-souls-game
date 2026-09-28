const CLASSES = {
  Knight:     { vitality: 14, strength: 12, dexterity: 8,  intelligence: 6, desc: "Tanque equilibrado." },
  Warrior:    { vitality: 12, strength: 14, dexterity: 8,  intelligence: 6, desc: "Força bruta." },
  Sorcerer:   { vitality: 8,  strength: 6,  dexterity: 10, intelligence: 16, desc: "Mago de longa distância." },
  Pyromancer: { vitality: 10, strength: 10, dexterity: 10, intelligence: 10, desc: "Equilibrado." },
  Cleric:     { vitality: 12, strength: 10, dexterity: 8,  intelligence: 10, desc: "Fé e cura." },
  Thief:      { vitality: 10, strength: 8,  dexterity: 16, intelligence: 6,  desc: "Rápido e furtivo." },
  Deprived:   { vitality: 10, strength: 10, dexterity: 10, intelligence: 10, desc: "Nivelado em tudo." },
};

const BASE_POINTS = 40;
const FREE_POINTS = 20;
const MAX_ATTR = 99;
const MAX_START_ATTR = 30;

const RARITIES = {
  common:    { name: "Comum",    color: "#a0a0a0", multiplier: 1.0,  weight: 100 },
  rare:      { name: "Raro",     color: "#4080d4", multiplier: 1.25, weight: 40 },
  epic:      { name: "Épico",    color: "#b040d4", multiplier: 1.6,  weight: 15 },
  legendary: { name: "Lendário", color: "#ffb020", multiplier: 2.2,  weight: 5 },
  mythic:    { name: "MÍTICO",   color: "#ff2080", multiplier: 3.0,  weight: 1 },
};

const ITEMS = {
  // Armas comuns
  broken_sword: { name: "Espada Quebrada", type: "weapon", rarity: "common", icon: "🗡️", damage: 3, req: {}, description: "Uma lâmina enferrujada." },
  longsword: { name: "Espada Longa", type: "weapon", rarity: "common", icon: "⚔️", damage: 8, req: { strength: 8 }, description: "Confiável e equilibrada." },
  battle_axe: { name: "Machado de Batalha", type: "weapon", rarity: "common", icon: "🪓", damage: 12, req: { strength: 14 }, description: "Pesado, mas brutal." },
  mace: { name: "Maça", type: "weapon", rarity: "common", icon: "🔨", damage: 10, req: { strength: 10 }, description: "Amassa armaduras." },
  short_sword: { name: "Espada Curta", type: "weapon", rarity: "common", icon: "🗡️", damage: 7, req: { dexterity: 8 }, description: "Leve e rápida." },
  hand_axe: { name: "Machadinha", type: "weapon", rarity: "common", icon: "🪓", damage: 9, req: { strength: 10 }, description: "Simples e eficaz." },
  dagger: { name: "Adaga", type: "weapon", rarity: "common", icon: "🗡️", damage: 5, req: { dexterity: 6 }, description: "Ataques rápidos." },
  scimitar: { name: "Cimitarra", type: "weapon", rarity: "common", icon: "🗡️", damage: 11, req: { dexterity: 12 }, description: "Cortante curvada." },
  spear: { name: "Lança", type: "weapon", rarity: "common", icon: "🔱", damage: 10, req: { dexterity: 10 }, description: "Alcance longo." },

  // Armas raras
  estoc: { name: "Estoque", type: "weapon", rarity: "rare", icon: "🗡️", damage: 15, req: { dexterity: 14 }, description: "Perfura defesas." },
  claymore: { name: "Claymore", type: "weapon", rarity: "rare", icon: "⚔️", damage: 22, strengthBonus: 2, req: { strength: 18, dexterity: 12 }, description: "Espada dos cavaleiros de Astora." },
  uchigatana: { name: "Uchigatana", type: "weapon", rarity: "rare", icon: "🗡️", damage: 18, strengthBonus: 3, req: { dexterity: 16 }, description: "Katana oriental." },
  zweihander: { name: "Zweihänder", type: "weapon", rarity: "rare", icon: "⚔️", damage: 28, strengthBonus: 4, req: { strength: 24 }, description: "Espadão alemão." },
  halberd: { name: "Alabarda", type: "weapon", rarity: "rare", icon: "🔱", damage: 20, req: { strength: 16, dexterity: 12 }, description: "Arma de haste." },
  rapier: { name: "Rapieira", type: "weapon", rarity: "rare", icon: "🗡️", damage: 14, req: { dexterity: 16 }, description: "Rápida e precisa." },
  falchion: { name: "Falchion", type: "weapon", rarity: "rare", icon: "🗡️", damage: 17, req: { dexterity: 14 }, description: "Sabre curvo." },
  morning_star: { name: "Estrela da Manhã", type: "weapon", rarity: "rare", icon: "🔨", damage: 19, req: { strength: 16 }, description: "Maça espinhosa." },
  great_scythe: { name: "Foice Grande", type: "weapon", rarity: "rare", icon: "⚰️", damage: 23, req: { dexterity: 16, strength: 14 }, description: "Arma dos ceifadores." },

  // Armas épicas
  black_knight_sword: { name: "Espada do Cavaleiro Negro", type: "weapon", rarity: "epic", icon: "⚫", damage: 35, strengthBonus: 5, req: { strength: 24, dexterity: 16 }, description: "Forjada para matar demônios." },
  dragon_greatsword: { name: "Espadão do Dragão", type: "weapon", rarity: "epic", icon: "🐉", damage: 45, strengthBonus: 8, req: { strength: 30, dexterity: 18 }, description: "Feita de escamas de dragão." },
  black_knight_greataxe: { name: "Machado Grande do Cavaleiro Negro", type: "weapon", rarity: "epic", icon: "🪓", damage: 42, strengthBonus: 6, req: { strength: 32 }, description: "Machado brutal." },
  silver_knight_sword: { name: "Espada do Cavaleiro Prateado", type: "weapon", rarity: "epic", icon: "🥈", damage: 33, strengthBonus: 5, req: { strength: 20, dexterity: 18 }, description: "De Anor Londo." },
  black_knight_halberd: { name: "Alabarda do Cavaleiro Negro", type: "weapon", rarity: "epic", icon: "⚫", damage: 40, strengthBonus: 6, req: { strength: 28, dexterity: 18 }, description: "Alcance e dano devastador." },
  quelaag_furysword: { name: "Espada Furiosa de Quelaag", type: "weapon", rarity: "epic", icon: "🕷️", damage: 38, strengthBonus: 4, req: { strength: 20, dexterity: 20 }, description: "Aplica queimadura." },
  moon_butterfly_horn: { name: "Chifre da Borboleta Lunar", type: "weapon", rarity: "epic", icon: "🦋", damage: 36, strengthBonus: 5, req: { intelligence: 24 }, description: "Escala com INT." },
  dark_sword: { name: "Espada Sombria", type: "weapon", rarity: "epic", icon: "🌑", damage: 39, strengthBonus: 6, req: { strength: 22, dexterity: 18 }, description: "Corrompida pelo Abismo." },

  // Armas lendárias
  moonlight_sword: { name: "Espada do Luar", type: "weapon", rarity: "legendary", icon: "🌙", damage: 60, strengthBonus: 10, req: { strength: 20, intelligence: 24 }, description: "Lâmina do dragão Seath." },
  greatsword_artorias: { name: "Espadão de Artorias", type: "weapon", rarity: "legendary", icon: "🐺", damage: 75, strengthBonus: 12, req: { strength: 36, dexterity: 24 }, description: "Do Cavaleiro do Abismo." },
  great_lord_sword: { name: "Espada do Grande Lorde", type: "weapon", rarity: "legendary", icon: "👑", damage: 85, strengthBonus: 15, req: { strength: 40, dexterity: 20 }, description: "Forjada da alma de Gwyn." },
  chaos_blade: { name: "Lâmina do Caos", type: "weapon", rarity: "legendary", icon: "🌋", damage: 70, strengthBonus: 10, req: { strength: 26, dexterity: 22, intelligence: 20 }, description: "Espada da Filha do Caos." },
  dragonslayer_spear: { name: "Lança do Matador de Dragões", type: "weapon", rarity: "legendary", icon: "⚡", damage: 72, strengthBonus: 9, req: { strength: 24, dexterity: 24 }, description: "De Ornstein." },
  smoughs_hammer: { name: "Martelo de Smough", type: "weapon", rarity: "legendary", icon: "🔨", damage: 90, strengthBonus: 16, req: { strength: 45 }, description: "Devastador." },
  lifehunt_scythe: { name: "Foice Caçadora de Vidas", type: "weapon", rarity: "legendary", icon: "💀", damage: 68, strengthBonus: 8, req: { dexterity: 30, strength: 20 }, description: "Sangra o usuário e o alvo." },

  // Armas míticas
  soul_of_cinder: { name: "Espada da Alma das Cinzas", type: "weapon", rarity: "mythic", icon: "🔥", damage: 120, strengthBonus: 20, hpBonus: 100, req: { strength: 50, dexterity: 30, intelligence: 25 }, description: "Chamas primordiais." },
  dark_soul: { name: "Alma Sombria", type: "weapon", rarity: "mythic", icon: "🌑", damage: 100, strengthBonus: 18, hpBonus: 80, req: { strength: 40, dexterity: 40 }, description: "Do próprio Abismo." },
  gravelord_sword: { name: "Espada do Senhor dos Túmulos", type: "weapon", rarity: "mythic", icon: "☠️", damage: 110, strengthBonus: 22, hpBonus: 60, req: { strength: 45, intelligence: 30 }, description: "Poder dos mortos." },
  moonlight_greatsword: { name: "Espadão do Luar Ancião", type: "weapon", rarity: "mythic", icon: "🌌", damage: 130, strengthBonus: 15, hpBonus: 120, req: { intelligence: 50, strength: 30 }, description: "Luz do primeiro dragão." },
  seaths_catalyst: { name: "Catalisador de Seath", type: "weapon", rarity: "mythic", icon: "💠", damage: 95, strengthBonus: 10, hpBonus: 90, req: { intelligence: 60 }, description: "Magia cristalina." },

  // Armas de classe
  knight_sword: { name: "Espada do Cavaleiro", type: "weapon", rarity: "common", icon: "⚔️", damage: 10, req: { strength: 8 }, description: "Lâmina padrão de Astora." },
  warrior_axe: { name: "Machado de Guerra", type: "weapon", rarity: "common", icon: "🪓", damage: 12, req: { strength: 12 }, description: "Bruto e direto." },
  sorcerer_catalyst: { name: "Catalisador", type: "weapon", rarity: "common", icon: "🪄", damage: 6, strengthBonus: 2, req: { intelligence: 10 }, description: "Amplifica feitiços." },
  pyro_flame: { name: "Chama Piro", type: "weapon", rarity: "common", icon: "🔥", damage: 9, req: { intelligence: 8 }, description: "Fogo no punho." },
  cleric_mace: { name: "Maça Sagrada", type: "weapon", rarity: "common", icon: "🔨", damage: 10, hpBonus: 10, req: { strength: 10 }, description: "Bênção dos deuses." },
  thief_dagger: { name: "Adaga do Ladrão", type: "weapon", rarity: "common", icon: "🗡️", damage: 7, strengthBonus: 3, req: { dexterity: 12 }, description: "Rápida e silenciosa." },
  deprived_club: { name: "Clava de Madeira", type: "weapon", rarity: "common", icon: "🪵", damage: 5, req: {}, description: "O básico do básico." },

  // Armaduras
  knight_shield: { name: "Escudo do Cavaleiro", type: "armor", rarity: "common", icon: "🛡️", defense: 8, hpBonus: 15, req: { strength: 8 }, description: "Bloqueia com firmeza." },
  warrior_armor: { name: "Armadura de Guerra", type: "armor", rarity: "common", icon: "🥋", defense: 6, hpBonus: 10, req: {}, description: "Couro reforçado." },
  sorcerer_robe: { name: "Túnica Arcana", type: "armor", rarity: "common", icon: "🧙", defense: 3, hpBonus: 25, req: {}, description: "Tecida com magia." },
  pyro_robes: { name: "Vestes Piro", type: "armor", rarity: "common", icon: "🥻", defense: 5, hpBonus: 15, req: {}, description: "Resistentes ao fogo." },
  cleric_robes: { name: "Túnica do Clérigo", type: "armor", rarity: "common", icon: "⛪", defense: 5, hpBonus: 20, req: {}, description: "Fé te protege." },
  thief_leathers: { name: "Couro do Ladrão", type: "armor", rarity: "common", icon: "🧥", defense: 4, hpBonus: 10, req: {}, description: "Leve pra correr." },
  deprived_rags: { name: "Trapos", type: "armor", rarity: "common", icon: "🧵", defense: 2, hpBonus: 5, req: {}, description: "É o que sobrou." },
  tattered_robe: { name: "Túnica Rasgada", type: "armor", rarity: "common", icon: "🧥", defense: 3, hpBonus: 10, req: {}, description: "Melhor que nada." },
  leather_armor: { name: "Armadura de Couro", type: "armor", rarity: "common", icon: "🥋", defense: 6, hpBonus: 20, req: {}, description: "Leve e flexível." },
  chainmail: { name: "Cota de Malha", type: "armor", rarity: "rare", icon: "🛡️", defense: 10, hpBonus: 30, req: { strength: 12 }, description: "Anéis entrelaçados." },
  knight_armor: { name: "Armadura do Cavaleiro", type: "armor", rarity: "rare", icon: "🛡️", defense: 12, hpBonus: 40, req: { strength: 14 }, description: "Aço pesado de Astora." },
  elite_knight_armor: { name: "Armadura de Elite", type: "armor", rarity: "epic", icon: "🛡️", defense: 20, hpBonus: 70, req: { strength: 22 }, description: "Dos guardas de Anor Londo." },
  brass_armor: { name: "Armadura de Bronze", type: "armor", rarity: "epic", icon: "⚜️", defense: 18, hpBonus: 60, req: { strength: 20 }, description: "Darkmoon Blades." },
  havel_armor: { name: "Armadura de Havel", type: "armor", rarity: "legendary", icon: "🪨", defense: 35, hpBonus: 120, req: { strength: 40 }, description: "Pedra do dragão." },
  artorias_armor: { name: "Armadura de Artorias", type: "armor", rarity: "legendary", icon: "🐺", defense: 28, hpBonus: 100, req: { strength: 30 }, description: "Cavaleiro do Abismo." },
  giant_armor: { name: "Armadura do Gigante", type: "armor", rarity: "legendary", icon: "🗿", defense: 40, hpBonus: 150, req: { strength: 45 }, description: "Guardiões de Anor Londo." },
  crown_of_dusk: { name: "Coroa do Crepúsculo", type: "armor", rarity: "mythic", icon: "👑", defense: 15, hpBonus: 200, req: { intelligence: 30 }, description: "Feita de pura magia." },

  // Anéis
  ring_life: { name: "Anel da Vida", type: "ring", rarity: "rare", icon: "💍", hpBonus: 50, req: {}, description: "Aumenta HP máximo." },
  ring_strength: { name: "Anel da Força", type: "ring", rarity: "rare", icon: "💍", strengthBonus: 5, req: {}, description: "Aumenta força." },
  ring_favor: { name: "Anel do Favor", type: "ring", rarity: "epic", icon: "💍", hpBonus: 80, strengthBonus: 5, defense: 5, req: {}, description: "Bênção de Fina." },
  ring_havel: { name: "Anel de Havel", type: "ring", rarity: "legendary", icon: "💍", hpBonus: 100, defense: 10, strengthBonus: 10, req: {}, description: "Poder do dragão." },
  ring_wolf: { name: "Anel do Lobo", type: "ring", rarity: "epic", icon: "💍", strengthBonus: 8, hpBonus: 40, req: {}, description: "Golpes pesados." },
  ring_cloranthy: { name: "Anel Clorântico", type: "ring", rarity: "epic", icon: "💍", hpBonus: 30, defense: 5, req: {}, description: "Regenera stamina." },
  ring_steel_protection: { name: "Anel de Proteção de Aço", type: "ring", rarity: "epic", icon: "💍", defense: 12, hpBonus: 30, req: {}, description: "Alta defesa." },
  ring_sage: { name: "Anel do Sábio", type: "ring", rarity: "mythic", icon: "💍", hpBonus: 150, strengthBonus: 15, defense: 15, req: {}, description: "Poder ancestral." },

  // Pergaminhos
  scroll_soul_arrow: { name: "Pergaminho: Flecha de Alma", type: "scroll", rarity: "common", icon: "📜", req: {}, description: "Aprende Flecha de Alma.", spellKey: "soul_arrow" },
  scroll_heavy_soul: { name: "Pergaminho: Alma Pesada", type: "scroll", rarity: "rare", icon: "📜", req: {}, description: "Aprende Alma Pesada.", spellKey: "heavy_soul" },
  scroll_soul_spear: { name: "Pergaminho: Lança de Alma", type: "scroll", rarity: "epic", icon: "📜", req: {}, description: "Aprende Lança de Alma.", spellKey: "soul_spear" },
  scroll_fireball: { name: "Pergaminho: Bola de Fogo", type: "scroll", rarity: "common", icon: "📜", req: {}, description: "Aprende Bola de Fogo.", spellKey: "fireball" },
  scroll_great_fire: { name: "Pergaminho: Grande Chama", type: "scroll", rarity: "rare", icon: "📜", req: {}, description: "Aprende Grande Chama.", spellKey: "great_fire" },
  scroll_chaos_fire: { name: "Pergaminho: Fogo do Caos", type: "scroll", rarity: "epic", icon: "📜", req: {}, description: "Aprende Fogo do Caos.", spellKey: "chaos_fire" },
  scroll_heal: { name: "Pergaminho: Cura", type: "scroll", rarity: "common", icon: "📜", req: {}, description: "Aprende Cura.", spellKey: "heal" },
  scroll_great_heal: { name: "Pergaminho: Cura Maior", type: "scroll", rarity: "rare", icon: "📜", req: {}, description: "Aprende Cura Maior.", spellKey: "great_heal" },
  scroll_lightning: { name: "Pergaminho: Lança Relâmpago", type: "scroll", rarity: "epic", icon: "📜", req: {}, description: "Aprende Lança Relâmpago.", spellKey: "lightning_spear" },
  scroll_wrath_gods: { name: "Pergaminho: Ira dos Deuses", type: "scroll", rarity: "legendary", icon: "📜", req: {}, description: "Aprende Ira dos Deuses.", spellKey: "wrath_of_gods" },
  scroll_homing_soul: { name: "Pergaminho: Almas Perseguidoras", type: "scroll", rarity: "epic", icon: "📜", req: {}, description: "Aprende Almas Perseguidoras.", spellKey: "homing_souls" },
  scroll_dark_orb: { name: "Pergaminho: Orbe Sombrio", type: "scroll", rarity: "mythic", icon: "📜", req: {}, description: "Aprende Orbe Sombrio.", spellKey: "dark_orb" },
  scroll_chaos_storm: { name: "Pergaminho: Tempestade do Caos", type: "scroll", rarity: "mythic", icon: "📜", req: {}, description: "Aprende Tempestade do Caos.", spellKey: "chaos_storm" },
  scroll_sunlight_spear: { name: "Pergaminho: Lança Solar", type: "scroll", rarity: "mythic", icon: "📜", req: {}, description: "Aprende Lança Solar.", spellKey: "sunlight_spear" },
  scroll_white_dragon_breath: { name: "Pergaminho: Sopro do Dragão Branco", type: "scroll", rarity: "mythic", icon: "📜", req: {}, description: "Aprende Sopro do Dragão Branco.", spellKey: "white_dragon_breath" },
};

const SPELLS = {
  // Sorcery
  soul_arrow:          { name: "Flecha de Alma", school: "sorcery", rarity: "common", icon: "✨", cost: 15, req: { intelligence: 10 }, damage: 20, type: "attack", desc: "Flecha mágica básica." },
  heavy_soul:          { name: "Alma Pesada", school: "sorcery", rarity: "rare", icon: "🌌", cost: 25, req: { intelligence: 18 }, damage: 45, type: "attack", desc: "Esfera densa de alma." },
  homing_souls:        { name: "Almas Perseguidoras", school: "sorcery", rarity: "epic", icon: "🌀", cost: 30, req: { intelligence: 22 }, damage: 60, type: "attack", desc: "Projéteis teleguiados." },
  soul_spear:          { name: "Lança de Alma", school: "sorcery", rarity: "epic", icon: "💫", cost: 40, req: { intelligence: 28 }, damage: 90, type: "attack", pierce: true, desc: "Perfura armaduras." },
  crystal_soul_spear:  { name: "Lança de Alma Cristalina", school: "sorcery", rarity: "legendary", icon: "💎", cost: 55, req: { intelligence: 35 }, damage: 130, type: "attack", pierce: true, desc: "Cristalizada e letal." },
  white_dragon_breath: { name: "Sopro do Dragão Branco", school: "sorcery", rarity: "mythic", icon: "🐲", cost: 80, req: { intelligence: 45 }, damage: 180, type: "attack", pierce: true, desc: "Poder de Seath." },
  dark_orb:            { name: "Orbe Sombrio", school: "sorcery", rarity: "mythic", icon: "🌑", cost: 85, req: { intelligence: 48 }, damage: 175, type: "attack", pierce: true, desc: "Do próprio Abismo." },

  // Pyromancy
  fireball:            { name: "Bola de Fogo", school: "pyromancy", rarity: "common", icon: "🔥", cost: 20, req: { intelligence: 12 }, damage: 30, type: "attack", burn: 2, desc: "Queimadura por 2 turnos." },
  great_fire:          { name: "Grande Chama", school: "pyromancy", rarity: "rare", icon: "☄️", cost: 35, req: { intelligence: 20 }, damage: 60, type: "attack", burn: 3, desc: "Queimadura por 3 turnos." },
  chaos_fire:          { name: "Fogo do Caos", school: "pyromancy", rarity: "epic", icon: "🌋", cost: 55, req: { intelligence: 30 }, damage: 110, type: "attack", burn: 4, desc: "Chamas do Caos primordial." },
  great_chaos_fire:    { name: "Grande Fogo do Caos", school: "pyromancy", rarity: "legendary", icon: "💥", cost: 70, req: { intelligence: 38 }, damage: 150, type: "attack", burn: 5, desc: "Explosão devastadora." },
  chaos_storm:         { name: "Tempestade do Caos", school: "pyromancy", rarity: "mythic", icon: "🌪️", cost: 90, req: { intelligence: 45 }, damage: 200, type: "attack", burn: 6, desc: "Chuvas de fogo." },

  // Miracle
  heal:                { name: "Cura", school: "miracle", rarity: "common", icon: "💚", cost: 20, req: { intelligence: 12 }, heal: 0.4, type: "heal", desc: "Cura 40% HP." },
  great_heal:          { name: "Cura Maior", school: "miracle", rarity: "rare", icon: "💖", cost: 40, req: { intelligence: 20 }, heal: 0.75, type: "heal", desc: "Cura 75% HP." },
  lightning_spear:     { name: "Lança Relâmpago", school: "miracle", rarity: "epic", icon: "⚡", cost: 45, req: { intelligence: 26 }, damage: 85, type: "attack", pierce: true, desc: "Raio sagrado." },
  wrath_of_gods:       { name: "Ira dos Deuses", school: "miracle", rarity: "legendary", icon: "☀️", cost: 70, req: { intelligence: 35 }, damage: 150, type: "attack", desc: "Explosão divina." },
  sunlight_spear:      { name: "Lança Solar", school: "miracle", rarity: "mythic", icon: "🌞", cost: 90, req: { intelligence: 50 }, damage: 190, type: "attack", pierce: true, desc: "Poder do sol." },
};

const MOBS = [
  { name: "Rato Gigante", hp: 15, damage: 3, soulReward: 50, description: "Pequeno, mas faminto.", icon: "🐀" },
  { name: "Hollow Soldier", hp: 30, damage: 5, soulReward: 100, description: "Zumbi com espada.", icon: "🧟" },
  { name: "Rato do Esgoto", hp: 25, damage: 6, soulReward: 80, description: "Crescido nos esgotos.", icon: "🐁" },
  { name: "Hollow Cidadão", hp: 20, damage: 4, soulReward: 70, description: "Antigo morador.", icon: "👤" },
  { name: "Cão Raivoso", hp: 35, damage: 9, soulReward: 150, description: "Rápido e agressivo.", icon: "🐕" },
  { name: "Hollow Arqueiro", hp: 28, damage: 8, soulReward: 130, description: "Atira à distância.", icon: "🏹" },
  { name: "Undead Warrior", hp: 45, damage: 8, soulReward: 200, description: "Soldado morto-vivo.", icon: "💀" },
  { name: "Hollow Thief", hp: 40, damage: 10, soulReward: 220, description: "Rápido com adagas.", icon: "🗡️" },
  { name: "Baldur Knight", hp: 70, damage: 12, soulReward: 400, description: "Cavaleiro de aço.", icon: "⚙️" },
  { name: "Hollow Lanceiro", hp: 55, damage: 11, soulReward: 250, description: "Lança longa.", icon: "🔱" },
  { name: "Cão Infernal", hp: 60, damage: 15, soulReward: 350, description: "Cão com chamas.", icon: "🔥" },
  { name: "Hollow Sacerdote", hp: 50, damage: 13, soulReward: 300, description: "Cura aliados.", icon: "✨" },
  { name: "Crystal Lizard", hp: 60, damage: 8, soulReward: 500, description: "Raro.", icon: "🦎" },
  { name: "Basilisk", hp: 55, damage: 12, soulReward: 600, description: "Olhar que petrifica.", icon: "👁️" },
  { name: "Skeleton", hp: 90, damage: 15, soulReward: 700, description: "Esqueletos.", icon: "☠️" },
  { name: "Black Knight", hp: 110, damage: 18, soulReward: 800, description: "Cavaleiro de Gwyn.", icon: "🖤" },
  { name: "Undead Dragon", hp: 130, damage: 22, soulReward: 1200, description: "Dragão apodrecido.", icon: "🐉" },
  { name: "Bonewheel Skeleton", hp: 120, damage: 28, soulReward: 900, description: "Roda mortal.", icon: "💀" },
  { name: "Bloated Zombie", hp: 100, damage: 16, soulReward: 850, description: "Explode.", icon: "🧟" },
  { name: "Cão de Blighttown", hp: 95, damage: 20, soulReward: 800, description: "Cão com toxina.", icon: "🐕" },
  { name: "Silver Knight", hp: 160, damage: 25, soulReward: 1500, description: "Guarda de Anor Londo.", icon: "🥈" },
  { name: "Giant Skeleton", hp: 180, damage: 30, soulReward: 2000, description: "Esqueleto gigante.", icon: "🦴" },
  { name: "Silver Knight Arqueiro", hp: 140, damage: 28, soulReward: 1600, description: "Arqueiro de elite.", icon: "🏹" },
  { name: "Cavaleiro de Berenike", hp: 200, damage: 32, soulReward: 2200, description: "Cavaleiro exilado.", icon: "⚔️" },
  { name: "Gargoyle", hp: 190, damage: 30, soulReward: 2100, description: "Demônio alado.", icon: "🦇" },
  { name: "Sentinel de Anor Londo", hp: 220, damage: 35, soulReward: 2500, description: "Gigante guardião.", icon: "🗿" },
  { name: "Cão de Caça de Artorias", hp: 175, damage: 33, soulReward: 2400, description: "Fiel ao Cavaleiro.", icon: "🐺" },
  { name: "Darkwraith", hp: 240, damage: 35, soulReward: 3000, description: "Servo do Abismo.", icon: "🕳️" },
  { name: "Prowling Demon", hp: 280, damage: 40, soulReward: 4000, description: "Demônio touro.", icon: "🐂" },
  { name: "Chaos Eater", hp: 300, damage: 42, soulReward: 4500, description: "Devorador.", icon: "🐛" },
  { name: "Titanite Demon", hp: 350, damage: 48, soulReward: 6000, description: "Demônio de titanita.", icon: "🗿" },
  { name: "Mimic", hp: 400, damage: 50, soulReward: 7000, description: "Baú que morde.", icon: "📦" },
  { name: "Abyss Watcher", hp: 380, damage: 52, soulReward: 7500, description: "Lutam para sempre.", icon: "🐺" },
  { name: "Silver Knight Elite", hp: 420, damage: 55, soulReward: 8000, description: "Elite.", icon: "💠" },
  { name: "Dragão Negro Jovem", hp: 500, damage: 60, soulReward: 10000, description: "Dragão negro.", icon: "🐉" },
  { name: "Fallen Knight", hp: 550, damage: 65, soulReward: 11000, description: "Cavaleiro corrompido.", icon: "⚫" },
  { name: "Outrider Knight", hp: 600, damage: 70, soulReward: 13000, description: "Guarda de Lothric.", icon: "❄️" },
  { name: "Iron Dragonslayer", hp: 700, damage: 75, soulReward: 15000, description: "Matador de dragões.", icon: "⚡" },
  { name: "Titanite Demon Ancião", hp: 800, damage: 80, soulReward: 18000, description: "Titanita primordial.", icon: "💎" },
  { name: "Cavaleiro Negro Elite", hp: 850, damage: 85, soulReward: 20000, description: "O mais forte.", icon: "🖤" },
];

const BOSSES = [
  { name: "Asylum Demon", hp: 120, damage: 15, soulReward: 2000, description: "Demônio do tutorial.", icon: "👹" },
  { name: "Taurus Demon", hp: 200, damage: 22, soulReward: 3000, description: "Na ponte estreita.", icon: "🐂" },
  { name: "Bell Gargoyles", hp: 300, damage: 28, soulReward: 5000, description: "Dois ao mesmo tempo.", icon: "🦇" },
  { name: "Capra Demon", hp: 350, damage: 32, soulReward: 6000, description: "Dois cães.", icon: "🐐" },
  { name: "Gaping Dragon", hp: 450, damage: 38, soulReward: 8000, description: "Boca gigante.", icon: "🐊" },
  { name: "Chaos Witch Quelaag", hp: 500, damage: 40, soulReward: 9000, description: "Aranha flamejante.", icon: "🕷️" },
  { name: "Moonlight Butterfly", hp: 400, damage: 35, soulReward: 7000, description: "Borboleta mágica.", icon: "🦋" },
  { name: "Iron Golem", hp: 600, damage: 45, soulReward: 12000, description: "Sen's Fortress.", icon: "🗿" },
  { name: "Crossbreed Priscilla", hp: 700, damage: 48, soulReward: 15000, description: "Meio-dragão.", icon: "🐉" },
  { name: "Ornstein & Smough", hp: 800, damage: 50, soulReward: 18000, description: "Duo cruel.", icon: "⚡" },
  { name: "Pinwheel", hp: 650, damage: 42, soulReward: 14000, description: "Necromante.", icon: "💀" },
  { name: "Ceaseless Discharge", hp: 900, damage: 55, soulReward: 20000, description: "Irmão de Quelaag.", icon: "🌋" },
  { name: "Demon Firesage", hp: 950, damage: 58, soulReward: 22000, description: "Demônio de fogo.", icon: "🔥" },
  { name: "Centipede Demon", hp: 880, damage: 52, soulReward: 21000, description: "Centopeia de lava.", icon: "🐛" },
  { name: "Four Kings", hp: 1000, damage: 55, soulReward: 25000, description: "Reis do Abismo.", icon: "👻" },
  { name: "Seath the Scaleless", hp: 1100, damage: 60, soulReward: 30000, description: "Dragão traidor.", icon: "🐲" },
  { name: "Gravelord Nito", hp: 1050, damage: 58, soulReward: 28000, description: "Senhor dos esqueletos.", icon: "💀" },
  { name: "Bed of Chaos", hp: 1200, damage: 65, soulReward: 40000, description: "Berço do Caos.", icon: "🔥" },
  { name: "Gwyn, Lord of Cinder", hp: 1500, damage: 75, soulReward: 50000, description: "Senhor das Cinzas.", icon: "👑" },
  { name: "Knight Artorias", hp: 1300, damage: 70, soulReward: 45000, description: "Cavaleiro do Abismo.", icon: "🐺" },
  { name: "Black Dragon Kalameet", hp: 1400, damage: 80, soulReward: 60000, description: "Dragão temido.", icon: "🐉" },
  { name: "Manus, Father of the Abyss", hp: 1600, damage: 90, soulReward: 70000, description: "Pai do Abismo.", icon: "🕳️" },
  { name: "Nameless King", hp: 1700, damage: 95, soulReward: 80000, description: "Rei sem nome.", icon: "🐲" },
  { name: "Slave Knight Gael", hp: 1800, damage: 100, soulReward: 90000, description: "O último cavaleiro.", icon: "⚔️" },
  { name: "Soul of Cinder", hp: 2000, damage: 110, soulReward: 100000, description: "Alma dos Lordes.", icon: "🔥" },
  { name: "Darkeater Midir", hp: 2200, damage: 120, soulReward: 120000, description: "Dragão devorador.", icon: "🖤" },
  { name: "Sister Friede", hp: 1900, damage: 105, soulReward: 110000, description: "Freira da Foice.", icon: "⚰️" },
  { name: "Demon Prince", hp: 2100, damage: 115, soulReward: 115000, description: "Príncipe dos demônios.", icon: "👹" },
  { name: "Yhorm the Giant", hp: 2300, damage: 125, soulReward: 130000, description: "Lorde dos Gigantes.", icon: "🗿" },
  { name: "Ancient Wyvern", hp: 2500, damage: 130, soulReward: 140000, description: "Wyvern ancestral.", icon: "🐉" },
];

// Drops resumidos pra economizar espaço
const BOSS_DROPS = {};
const BOSS_KEYS = ["Asylum Demon","Taurus Demon","Bell Gargoyles","Capra Demon","Gaping Dragon","Chaos Witch Quelaag","Moonlight Butterfly","Iron Golem","Crossbreed Priscilla","Ornstein & Smough","Pinwheel","Ceaseless Discharge","Demon Firesage","Centipede Demon","Four Kings","Seath the Scaleless","Gravelord Nito","Bed of Chaos","Gwyn, Lord of Cinder","Knight Artorias","Black Dragon Kalameet","Manus, Father of the Abyss","Nameless King","Slave Knight Gael","Soul of Cinder","Darkeater Midir","Sister Friede","Demon Prince","Yhorm the Giant","Ancient Wyvern"];
const BOSS_POOL = ["longsword","battle_axe","claymore","estoc","uchigatana","zweihander","halberd","black_knight_sword","dragon_greatsword","silver_knight_sword","moonlight_sword","greatsword_artorias","great_lord_sword","chaos_blade","dragonslayer_spear","soul_of_cinder","dark_soul","knight_armor","elite_knight_armor","havel_armor","artorias_armor","giant_armor","crown_of_dusk","ring_life","ring_favor","ring_havel","ring_sage","scroll_fireball","scroll_soul_arrow","scroll_heal","scroll_soul_spear","scroll_chaos_fire","scroll_wrath_gods","scroll_dark_orb","scroll_sunlight_spear"];
BOSS_KEYS.forEach((k, i) => {
  const pool = BOSS_POOL.slice(0, 8 + i);
  BOSS_DROPS[k] = pool;
});

const MOB_DROPS = {};
const MOB_KEYS = MOBS.map(m => m.name);
const MOB_POOL = ["broken_sword","longsword","short_sword","hand_axe","mace","dagger","spear","scimitar","battle_axe","estoc","rapier","halberd","claymore","black_knight_sword","leather_armor","knight_armor","ring_life","scroll_fireball","scroll_soul_arrow","scroll_heal","titanite_shard"];
MOB_KEYS.forEach((k, i) => {
  MOB_DROPS[k] = MOB_POOL.slice(0, 3 + Math.min(i, 8));
});

function rollDrop(enemyName, isBoss = true) {
  const pool = isBoss ? BOSS_DROPS[enemyName] : MOB_DROPS[enemyName];
  if (!pool || pool.length === 0) return null;
  const dropChance = isBoss ? 0.75 : 0.3;
  if (Math.random() > dropChance) return null;
  const weights = pool.map(key => {
    const item = ITEMS[key];
    if (!item) return 1;
    const r = RARITIES[item.rarity];
    return r ? r.weight : 10;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return pool[i];
  }
  return pool[0];
}

function checkRequirement(item, character) {
  const req = item.req || {};
  const missing = {};
  let ok = true;
  for (const attr of ["strength", "dexterity", "intelligence"]) {
    const need = req[attr] || 0;
    const have = character[attr] || 0;
    if (have < need) { missing[attr] = { need, have, diff: need - have }; ok = false; }
  }
  return { ok, missing };
}

const STARTING_KITS = {
  Knight:     { weapon: "knight_sword", armor: "knight_shield" },
  Warrior:    { weapon: "warrior_axe", armor: "warrior_armor" },
  Sorcerer:   { weapon: "sorcerer_catalyst", armor: "sorcerer_robe", extraSpells: ["soul_arrow"] },
  Pyromancer: { weapon: "pyro_flame", armor: "pyro_robes", extraSpells: ["fireball"] },
  Cleric:     { weapon: "cleric_mace", armor: "cleric_robes", extraSpells: ["heal"] },
  Thief:      { weapon: "thief_dagger", armor: "thief_leathers" },
  Deprived:   { weapon: "deprived_club", armor: "deprived_rags" },
};

const DIFFICULTIES = {
  normal: { name: "Normal", icon: "🌤️", color: "#40a040", desc: "Para aproveitar.", damageMultiplier: 1.0, takenMultiplier: 0.8, staminaCostMult: 1.0, fpCostMult: 1.0, soulsMultiplier: 1.0, soulLossOnDeath: 0.0, itemLossOnDeath: 0, estusOnRest: 3, estusOnBossKill: 1, enemyHpMult: 1.0, enemyDamageMult: 0.8, enemyScalingEnabled: false, permadeath: false, regenStamina: 30, regenFp: 5, curseOnDeath: false, hollowingPerDeath: 0 },
  hard: { name: "Hard", icon: "⚔️", color: "#d4a017", desc: "Prepare to Die.", damageMultiplier: 1.0, takenMultiplier: 1.0, staminaCostMult: 1.2, fpCostMult: 1.2, soulsMultiplier: 1.0, soulLossOnDeath: 0.5, itemLossOnDeath: 0, estusOnRest: 2, estusOnBossKill: 1, enemyHpMult: 1.15, enemyDamageMult: 1.0, enemyScalingEnabled: false, permadeath: false, regenStamina: 22, regenFp: 3, curseOnDeath: false, hollowingPerDeath: 1 },
  darksouls: { name: "Dark Souls", icon: "💀", color: "#8b0000", desc: "Sem piedade.", damageMultiplier: 0.9, takenMultiplier: 1.4, staminaCostMult: 1.5, fpCostMult: 1.3, soulsMultiplier: 1.3, soulLossOnDeath: 1.0, itemLossOnDeath: 0.15, estusOnRest: 2, estusOnBossKill: 1, enemyHpMult: 1.4, enemyDamageMult: 1.3, enemyScalingEnabled: true, permadeath: false, regenStamina: 15, regenFp: 2, curseOnDeath: true, hollowingPerDeath: 1 },
  ironman: { name: "Ironman", icon: "☠️", color: "#000000", desc: "Morrer = deletar.", damageMultiplier: 0.8, takenMultiplier: 1.8, staminaCostMult: 1.8, fpCostMult: 1.5, soulsMultiplier: 1.5, soulLossOnDeath: 1.0, itemLossOnDeath: 0.5, estusOnRest: 1, estusOnBossKill: 1, enemyHpMult: 1.8, enemyDamageMult: 1.5, enemyScalingEnabled: true, permadeath: true, regenStamina: 10, regenFp: 1, curseOnDeath: true, hollowingPerDeath: 2 },
};

module.exports = {
  CLASSES, BASE_POINTS, FREE_POINTS, MAX_ATTR, MAX_START_ATTR,
  RARITIES, ITEMS, SPELLS, BOSSES, MOBS, BOSS_DROPS, MOB_DROPS,
  STARTING_KITS, DIFFICULTIES, rollDrop, checkRequirement,
};
