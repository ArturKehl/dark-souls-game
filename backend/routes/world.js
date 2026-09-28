const express = require("express");
const router = express.Router();
const Character = require("../models/Character");
const Item = require("../models/Item");
const Material = require("../models/Material");
const QuestProgress = require("../models/QuestProgress");
const { REGIONS, NPCS, QUESTS } = require("../models/worldCatalog");
const { ITEMS, SPELLS } = require("../models/itemsCatalog");

function parseJSON(str, fallback) {
  try { return JSON.parse(str || "null") || fallback; } catch (e) { return fallback; }
}
async function findOwned(id) {
  return await Character.findByPk(id);
}

router.get("/regions", (req, res) => {
  res.json(REGIONS.map(r => ({
    id: r.id, name: r.name, icon: r.icon, description: r.description,
    minLevel: r.minLevel, ambience: r.ambience,
    enemyCount: r.enemies.length, bossCount: r.bosses.length, npcCount: r.npcs.length,
  })));
});

router.get("/:id/region/:regionId", async (req, res) => {
  try {
    const c = await findOwned(req.params.id);
    if (!c) return res.status(404).json({ error: "Não encontrado" });
    const region = REGIONS.find(r => r.id === req.params.regionId);
    if (!region) return res.status(404).json({ error: "Região não encontrada" });
    const locked = c.level < region.minLevel;
    res.json({
      region: {
        ...region,
        locked,
        npcs: region.npcs.map(id => NPCS[id]).filter(Boolean),
      },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/:id/region/:regionId/visit", async (req, res) => {
  try {
    const c = await findOwned(req.params.id);
    if (!c) return res.status(404).json({ error: "Não encontrado" });
    const region = REGIONS.find(r => r.id === req.params.regionId);
    if (!region) return res.status(404).json({ error: "Região não encontrada" });
    if (c.level < region.minLevel) {
      return res.status(400).json({ error: "Precisa nível " + region.minLevel });
    }
    let qp = await QuestProgress.findOne({ where: { characterId: c.id, questId: "_explore" } });
    if (!qp) qp = await QuestProgress.create({ characterId: c.id, questId: "_explore" });
    let visited = parseJSON(qp.visitedRegions, []);
    if (!visited.includes(region.id)) {
      visited.push(region.id);
      qp.visitedRegions = JSON.stringify(visited);
      await qp.save();
    }
    res.json({
      message: "🧭 Você chegou em " + region.name,
      region: { id: region.id, name: region.name, icon: region.icon, ambience: region.ambience },
      visitedCount: visited.length,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/:id/region/:regionId/npcs", async (req, res) => {
  try {
    const region = REGIONS.find(r => r.id === req.params.regionId);
    if (!region) return res.status(404).json({ error: "Região não encontrada" });
    const npcs = region.npcs.map(id => {
      const npc = NPCS[id];
      if (!npc) return null;
      return { id: npc.id, name: npc.name, icon: npc.icon, description: npc.description, services: npc.services };
    }).filter(Boolean);
    res.json(npcs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/:id/npc/:npcId", async (req, res) => {
  try {
    const npc = NPCS[req.params.npcId];
    if (!npc) return res.status(404).json({ error: "NPC não encontrado" });
    const c = await findOwned(req.params.id);
    if (!c) return res.status(404).json({ error: "Personagem não encontrado" });
    const dialogue = npc.dialogues[Math.floor(Math.random() * npc.dialogues.length)];
    let quests = [];
    if (npc.quests) quests = npc.quests.map(qid => QUESTS[qid]).filter(Boolean);
    let shop = [];
    if (npc.shopItems) shop = npc.shopItems.map(key => {
      const item = ITEMS[key];
      const spell = SPELLS[key];
      if (item) return { key, type: "item", name: item.name, icon: item.icon, rarity: item.rarity, description: item.description, price: item.rarity === "common" ? 200 : item.rarity === "rare" ? 800 : 2500 };
      if (spell) return { key, type: "spell", name: spell.name, icon: spell.icon, rarity: spell.rarity, description: spell.desc, price: 1500 };
      return null;
    }).filter(Boolean);
    let spells = [];
    if (npc.spells) {
      spells = npc.spells.map(k => {
        const s = SPELLS[k];
        if (!s) return null;
        return { key: k, name: s.name, icon: s.icon, rarity: s.rarity, cost: s.cost, desc: s.desc };
      }).filter(Boolean);
    }
    res.json({ npc, dialogue, quests, shop, spells });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Compra de item da loja
router.post("/:id/npc/:npcId/buy", async (req, res) => {
  try {
    const { key, price } = req.body;
    const c = await findOwned(req.params.id);
    if (!c) return res.status(404).json({ error: "Não encontrado" });
    if (c.souls < price) return res.status(400).json({ error: "Almas insuficientes" });

    const itemTpl = ITEMS[key];
    const spell = SPELLS[key];

    if (itemTpl) {
      const item = await Item.create({
        characterId: c.id, itemKey: key, name: itemTpl.name,
        type: itemTpl.type, rarity: itemTpl.rarity, icon: itemTpl.icon,
        damage: itemTpl.damage || 0, defense: itemTpl.defense || 0,
        hpBonus: itemTpl.hpBonus || 0, strengthBonus: itemTpl.strengthBonus || 0,
        description: itemTpl.description, equipped: false, startingKit: false,
        requirements: JSON.stringify(itemTpl.req || {}),
        spellKey: itemTpl.spellKey || null,
      });
      c.souls -= price;
      await c.save();
      return res.json({ message: "Você comprou " + itemTpl.name, item });
    }
    if (spell) {
      const known = parseJSON(c.knownSpells, []);
      if (!known.includes(key)) known.push(key);
      c.knownSpells = JSON.stringify(known);
      c.souls -= price;
      await c.save();
      return res.json({ message: "Você aprendeu " + spell.name });
    }
    res.status(400).json({ error: "Item inválido" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Aprender magia de NPC
router.post("/:id/npc/:npcId/learn/:spellKey", async (req, res) => {
  try {
    const c = await findOwned(req.params.id);
    if (!c) return res.status(404).json({ error: "Não encontrado" });
    const spell = SPELLS[req.params.spellKey];
    if (!spell) return res.status(404).json({ error: "Magia não encontrada" });
    const price = 1500;
    if (c.souls < price) return res.status(400).json({ error: "Precisa de " + price + " almas" });
    const known = parseJSON(c.knownSpells, []);
    if (known.includes(req.params.spellKey)) return res.status(400).json({ error: "Já conhece" });
    known.push(req.params.spellKey);
    c.knownSpells = JSON.stringify(known);
    c.souls -= price;
    await c.save();
    res.json({ message: "📜 Você aprendeu " + spell.name });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Quest: aceitar
router.post("/:id/quest/:questId/accept", async (req, res) => {
  try {
    const c = await findOwned(req.params.id);
    if (!c) return res.status(404).json({ error: "Não encontrado" });
    const quest = QUESTS[req.params.questId];
    if (!quest) return res.status(404).json({ error: "Missão não encontrada" });
    let qp = await QuestProgress.findOne({ where: { characterId: c.id, questId: quest.id } });
    if (qp && qp.status !== "available") return res.status(400).json({ error: "Já iniciada" });
    if (!qp) qp = await QuestProgress.create({ characterId: c.id, questId: quest.id, status: "active" });
    else { qp.status = "active"; await qp.save(); }
    res.json({ message: "📜 Missão aceita: " + quest.name, quest });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Quest: resgatar
router.post("/:id/quest/:questId/claim", async (req, res) => {
  try {
    const c = await findOwned(req.params.id);
    if (!c) return res.status(404).json({ error: "Não encontrado" });
    const quest = QUESTS[req.params.questId];
    if (!quest) return res.status(404).json({ error: "Missão não encontrada" });
    let qp = await QuestProgress.findOne({ where: { characterId: c.id, questId: quest.id } });
    if (!qp || qp.status !== "completed") return res.status(400).json({ error: "Missão não completada" });

    if (quest.rewards.souls) c.souls += quest.rewards.souls;
    let items = [];
    if (quest.rewards.items) {
      for (const key of quest.rewards.items) {
        const tpl = ITEMS[key];
        if (!tpl) continue;
        const item = await Item.create({
          characterId: c.id, itemKey: key, name: tpl.name,
          type: tpl.type, rarity: tpl.rarity, icon: tpl.icon,
          damage: tpl.damage || 0, defense: tpl.defense || 0,
          hpBonus: tpl.hpBonus || 0, strengthBonus: tpl.strengthBonus || 0,
          description: tpl.description, equipped: false, startingKit: false,
          requirements: JSON.stringify(tpl.req || {}),
          spellKey: tpl.spellKey || null,
        });
        items.push(item);
      }
    }
    if (quest.rewards.materials) {
      for (const [key, qty] of Object.entries(quest.rewards.materials)) {
        let mat = await Material.findOne({ where: { characterId: c.id, key } });
        if (mat) { mat.quantity += qty; await mat.save(); }
        else await Material.create({ characterId: c.id, key, name: key, icon: "📦", quantity: qty });
      }
    }
    if (quest.rewards.spells) {
      const known = parseJSON(c.knownSpells, []);
      for (const k of quest.rewards.spells) if (!known.includes(k)) known.push(k);
      c.knownSpells = JSON.stringify(known);
    }
    await c.save();
    qp.status = "claimed";
    await qp.save();
    res.json({ message: "🎁 Recompensas recebidas: " + quest.name, quest, items });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Lista quests
router.get("/:id/quests", async (req, res) => {
  try {
    const c = await findOwned(req.params.id);
    if (!c) return res.status(404).json({ error: "Não encontrado" });
    const progresses = await QuestProgress.findAll({ where: { characterId: c.id } });
    const map = {};
    progresses.forEach(p => map[p.questId] = p);
    const list = Object.values(QUESTS).map(q => {
      const p = map[q.id];
      return { ...q, status: p ? p.status : "available", progress: p ? p.progress : 0 };
    });
    res.json(list);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
