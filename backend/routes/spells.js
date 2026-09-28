const express = require("express");
const router = express.Router();
const Character = require("../models/Character");
const Item = require("../models/Item");
const { SPELLS } = require("../models/itemsCatalog");


function parseJSON(str, fallback) {
  try { return JSON.parse(str || "null") || fallback; } catch (e) { return fallback; }
}
async function findOwned(id, userId) {
  return await Character.findOne({ where: { id, userId } });
}

router.get("/", async (req, res) => {
  res.json(Object.entries(SPELLS).map(([key, s]) => ({ key, ...s })));
});

router.get("/:id/spells", async (req, res) => {
  try {
    const c = await findOwned(req.params.id, 1);
    if (!c) return res.status(404).json({ error: "Não encontrado" });
    const known = parseJSON(c.knownSpells, []);
    const equipped = parseJSON(c.equippedSpells, []);
    const result = Object.keys(SPELLS).filter(k => known.includes(k)).map(k => {
      const spell = SPELLS[k];
      const req = spell.req || {};
      const meetsReq = !req.intelligence || c.intelligence >= req.intelligence;
      return { key: k, ...spell, equipped: equipped.includes(k), meetsReq, req };
    });
    res.json({ known: result, equipped, fp: c.fp, maxFp: c.maxFp });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/:id/learn/:itemId", async (req, res) => {
  try {
    const c = await findOwned(req.params.id, 1);
    if (!c) return res.status(404).json({ error: "Não encontrado" });
    const item = await Item.findOne({ where: { id: req.params.itemId, characterId: c.id } });
    if (!item) return res.status(404).json({ error: "Item não encontrado" });
    if (item.type !== "scroll") return res.status(400).json({ error: "Não é um pergaminho" });
    const spellKey = item.spellKey;
    if (!spellKey || !SPELLS[spellKey]) return res.status(400).json({ error: "Pergaminho inválido" });
    const known = parseJSON(c.knownSpells, []);
    if (known.includes(spellKey)) return res.status(400).json({ error: "Você já conhece esta magia" });
    known.push(spellKey);
    c.knownSpells = JSON.stringify(known);
    await c.save();
    await item.destroy();
    res.json({
      message: "📜 Você aprendeu " + SPELLS[spellKey].name + "!",
      spell: { key: spellKey, ...SPELLS[spellKey] },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/:id/equip-spell/:spellKey", async (req, res) => {
  try {
    const c = await findOwned(req.params.id, 1);
    if (!c) return res.status(404).json({ error: "Não encontrado" });
    const spellKey = req.params.spellKey;
    const spell = SPELLS[spellKey];
    if (!spell) return res.status(404).json({ error: "Magia não encontrada" });
    const known = parseJSON(c.knownSpells, []);
    if (!known.includes(spellKey)) return res.status(400).json({ error: "Você não conhece esta magia" });
    const req = spell.req || {};
    if (req.intelligence && c.intelligence < req.intelligence) {
      return res.status(400).json({ error: "Inteligência insuficiente" });
    }
    let equipped = parseJSON(c.equippedSpells, []);
    if (equipped.includes(spellKey)) return res.status(400).json({ error: "Já equipada" });
    if (equipped.length >= 3) return res.status(400).json({ error: "Máximo de 3 magias" });
    equipped.push(spellKey);
    c.equippedSpells = JSON.stringify(equipped);
    await c.save();
    res.json({ message: "✨ " + spell.name + " equipada!", equipped });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/:id/unequip-spell/:spellKey", async (req, res) => {
  try {
    const c = await findOwned(req.params.id, 1);
    if (!c) return res.status(404).json({ error: "Não encontrado" });
    let equipped = parseJSON(c.equippedSpells, []);
    equipped = equipped.filter(k => k !== req.params.spellKey);
    c.equippedSpells = JSON.stringify(equipped);
    await c.save();
    res.json({ message: "Magia desequipada.", equipped });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

