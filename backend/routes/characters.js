const express = require("express");
const router = express.Router();
const Character = require("../models/Character");
const Item = require("../models/Item");
const { CLASSES, FREE_POINTS, MAX_START_ATTR, ITEMS, STARTING_KITS, DIFFICULTIES } = require("../models/itemsCatalog");


router.get("/difficulties", (req, res) => {
  res.json(Object.entries(DIFFICULTIES).map(([key, d]) => ({ key, ...d })));
});

function validateNewCharacter(body) {
  const errors = [];
  if (!body.name || body.name.trim().length < 2) errors.push("Nome precisa ter 2+ caracteres");
  if (!CLASSES[body.class]) { errors.push("Classe inválida"); return errors; }
  if (!DIFFICULTIES[body.difficulty]) errors.push("Dificuldade inválida");
  const attrs = ["vitality", "strength", "dexterity", "intelligence"];
  const base = CLASSES[body.class];
  for (const a of attrs) {
    const v = parseInt(body[a]);
    if (isNaN(v) || v < 1) errors.push(a + " inválido");
    if (v > MAX_START_ATTR) errors.push(a + " não pode passar de " + MAX_START_ATTR);
    if (v < base[a]) errors.push(a + " não pode ser menor que " + base[a]);
  }
  const totalPoints = attrs.reduce((sum, a) => sum + (parseInt(body[a]) - base[a]), 0);
  if (totalPoints !== FREE_POINTS) errors.push("Gaste exatamente " + FREE_POINTS + " pontos");
  return errors;
}

async function giveStartingKit(character) {
  const kit = STARTING_KITS[character.class];
  if (!kit) return { items: [], spells: [] };
  const createdItems = [];
  for (const slot of ["weapon", "armor"]) {
    const key = kit[slot];
    if (!key) continue;
    const tpl = ITEMS[key];
    if (!tpl) continue;
    const item = await Item.create({
      characterId: character.id, itemKey: key, name: tpl.name,
      type: tpl.type, rarity: tpl.rarity, icon: tpl.icon,
      damage: tpl.damage || 0, defense: tpl.defense || 0,
      hpBonus: tpl.hpBonus || 0, strengthBonus: tpl.strengthBonus || 0,
      description: tpl.description, equipped: true, startingKit: true,
      requirements: JSON.stringify(tpl.req || {}),
    });
    createdItems.push(item);
  }
  const startingSpells = kit.extraSpells || [];
  if (startingSpells.length) {
    character.knownSpells = JSON.stringify(startingSpells);
    character.equippedSpells = JSON.stringify(startingSpells.slice(0, 3));
    await character.save();
  }
  return { items: createdItems, spells: startingSpells };
}

router.get("/", async (req, res) => {
  try {
    const chars = await Character.findAll({ where: { userId: 1 }, order: [["createdAt", "DESC"]] });
    res.json(chars);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/", async (req, res) => {
  try {
    const errors = validateNewCharacter(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(" | ") });
    const diff = DIFFICULTIES[req.body.difficulty] || DIFFICULTIES.normal;
    const data = {
      userId: 1,
      name: req.body.name.trim(),
      class: req.body.class,
      difficulty: req.body.difficulty,
      vitality: parseInt(req.body.vitality),
      strength: parseInt(req.body.strength),
      dexterity: parseInt(req.body.dexterity),
      intelligence: parseInt(req.body.intelligence),
      souls: 0, humanity: 0, alive: true,
      estus: diff.estusOnRest, maxEstus: 3,
    };
    data.hp = 40 + data.vitality * 4 + 8;
    data.fp = 30 + data.intelligence * 3 + 2;
    const c = await Character.create(data);
    const kit = await giveStartingKit(c);
    res.status(201).json({
      character: c,
      startingKit: kit.items.map(i => ({ icon: i.icon, name: i.name, type: i.type })),
      startingSpells: kit.spells,
    });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.get("/:id", async (req, res) => {
  const c = await Character.findOne({ where: { id: req.params.id, userId: 1 } });
  if (!c) return res.status(404).json({ error: "Não encontrado" });
  res.json(c);
});

router.put("/:id", async (req, res) => {
  try {
    const c = await Character.findOne({ where: { id: req.params.id, userId: 1 } });
    if (!c) return res.status(404).json({ error: "Não encontrado" });
    if (req.body.name) c.name = req.body.name.trim();
    await c.save();
    res.json(c);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete("/:id", async (req, res) => {
  const c = await Character.findOne({ where: { id: req.params.id, userId: 1 } });
  if (!c) return res.status(404).json({ error: "Não encontrado" });
  await Item.destroy({ where: { characterId: c.id } });
  await c.destroy();
  res.json({ message: "Removido" });
});

module.exports = router;

