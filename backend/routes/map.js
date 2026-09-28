const express = require("express");
const router = express.Router();
const Character = require("../models/Character");
const Item = require("../models/Item");
const Boss = require("../models/Boss");
const PlayerPosition = require("../models/PlayerPosition");
const { MAP_NODES } = require("../models/mapCatalog");
const { BOSSES, MOBS, ITEMS } = require("../models/itemsCatalog");
const { NPCS } = require("../models/worldCatalog");

function parseJSON(str, fallback) {
  try { return JSON.parse(str || "null") || fallback; } catch (e) { return fallback; }
}
async function findOwned(id, userId) {
  return await Character.findOne({ where: { id, userId } });
}
async function getOrCreatePosition(characterId) {
  let p = await PlayerPosition.findOne({ where: { characterId } });
  if (!p) p = await PlayerPosition.create({ characterId });
  return p;
}

// ============ MAPA COMPLETO ============
router.get("/:id/map", async (req, res) => {
  try {
    const c = await findOwned(req.params.id, req.user.id);
    if (!c) return res.status(404).json({ error: "Não encontrado" });
    const pos = await getOrCreatePosition(c.id);
    const visited = parseJSON(pos.visitedNodes, []);

    const nodes = MAP_NODES.map(n => {
      const locked = n.minLevel && c.level < n.minLevel;
      return {
        id: n.id,
        name: n.name,
        icon: n.icon,
        region: n.region,
        x: n.x,
        y: n.y,
        type: n.type,
        description: n.description,
        minLevel: n.minLevel || 1,
        locked,
        visited: visited.includes(n.id),
        isCurrent: pos.currentNodeId === n.id,
        connections: n.connections,
        hasEnemies: !!n.enemies,
        hasBoss: !!n.boss,
        hasNPC: !!n.npc,
        npcName: n.npc ? (NPCS[n.npc]?.name || "") : null,
        enemyCount: n.enemies ? n.enemies.length : 0,
      };
    });

    res.json({
      nodes,
      currentNodeId: pos.currentNodeId,
      visitedCount: visited.length,
      totalNodes: MAP_NODES.length,
      character: { id: c.id, name: c.name, level: c.level, hp: c.hp, maxHp: c.maxHp, souls: c.souls },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ DETALHE DE UM NÓ ============
router.get("/:id/map/node/:nodeId", async (req, res) => {
  try {
    const c = await findOwned(req.params.id, req.user.id);
    if (!c) return res.status(404).json({ error: "Não encontrado" });
    const node = MAP_NODES.find(n => n.id === req.params.nodeId);
    if (!node) return res.status(404).json({ error: "Nó não encontrado" });

    const pos = await getOrCreatePosition(c.id);
    const defeated = parseJSON(pos.defeatedEnemies, []);

    // Enriquecer inimigos
    const enemies = (node.enemies || []).map(name => {
      const mob = MOBS.find(m => m.name === name);
      if (!mob) return { name, icon: "👾", defeated: defeated.includes(name) };
      return { name: mob.name, icon: mob.icon, hp: mob.hp, damage: mob.damage, soulReward: mob.soulReward, defeated: defeated.includes(name) };
    });

    const boss = node.boss ? BOSSES.find(b => b.name === node.boss) : null;
    const npc = node.npc ? NPCS[node.npc] : null;

    res.json({
      node: {
        id: node.id, name: node.name, icon: node.icon, type: node.type,
        description: node.description, minLevel: node.minLevel || 1,
        locked: node.minLevel && c.level < node.minLevel,
        connections: node.connections.map(cid => {
          const n = MAP_NODES.find(x => x.id === cid);
          return n ? { id: n.id, name: n.name, icon: n.icon, minLevel: n.minLevel || 1, locked: n.minLevel && c.level < n.minLevel } : null;
        }).filter(Boolean),
      },
      enemies,
      boss: boss ? { name: boss.name, icon: boss.icon, hp: boss.hp, damage: boss.damage, soulReward: boss.soulReward, description: boss.description, defeated: defeated.includes(boss.name) } : null,
      npc: npc ? { id: npc.id, name: npc.name, icon: npc.icon, description: npc.description, services: npc.services } : null,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ VIAJAR PARA NÓ ============
router.post("/:id/map/travel", async (req, res) => {
  try {
    const { nodeId } = req.body;
    const c = await findOwned(req.params.id, req.user.id);
    if (!c) return res.status(404).json({ error: "Não encontrado" });

    const target = MAP_NODES.find(n => n.id === nodeId);
    if (!target) return res.status(404).json({ error: "Local não encontrado" });

    const pos = await getOrCreatePosition(c.id);
    const current = MAP_NODES.find(n => n.id === pos.currentNodeId);

    // Verifica se há conexão direta
    if (current && !current.connections.includes(nodeId) && pos.currentNodeId !== nodeId) {
      return res.status(400).json({ error: "Não há caminho direto para " + target.name });
    }

    if (target.minLevel && c.level < target.minLevel) {
      return res.status(400).json({ error: "Precisa nível " + target.minLevel + " para entrar" });
    }

    // Atualiza posição
    const wasVisited = parseJSON(pos.visitedNodes, []).includes(nodeId);
    pos.currentNodeId = nodeId;
    let visited = parseJSON(pos.visitedNodes, []);
    if (!visited.includes(nodeId)) visited.push(nodeId);
    pos.visitedNodes = JSON.stringify(visited);
    await pos.save();

    // Regen pequeno ao viajar para fogueira
    let healMsg = "";
    if (target.type === "safe") {
      c.hp = c.maxHp;
      c.stamina = c.maxStamina;
      c.fp = c.maxFp;
      c.estus = c.maxEstus;
      await c.save();
      healMsg = " Você descansou e recuperou tudo!";
    }

    res.json({
      message: (wasVisited ? "🧭 Você voltou para " : "🧭 Você chegou em ") + target.name + "." + healMsg,
      currentNodeId: nodeId,
      visitedCount: visited.length,
      target: { id: target.id, name: target.name, icon: target.icon, type: target.type },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ LUTAR COM INIMIGO DO NÓ ============
router.post("/:id/map/fight/:enemyName", async (req, res) => {
  try {
    const c = await findOwned(req.params.id, req.user.id);
    if (!c) return res.status(404).json({ error: "Não encontrado" });
    const pos = await getOrCreatePosition(c.id);
    const current = MAP_NODES.find(n => n.id === pos.currentNodeId);
    if (!current) return res.status(404).json({ error: "Localização inválida" });

    const enemyName = req.params.enemyName;
    const isBoss = current.boss === enemyName;
    const isMob = current.enemies && current.enemies.includes(enemyName);

    if (!isBoss && !isMob) return res.status(400).json({ error: "Este inimigo não está aqui" });

    // Verifica se boss já foi derrotado
    const defeated = parseJSON(pos.defeatedEnemies, []);
    if (defeated.includes(enemyName)) {
      return res.status(400).json({ error: "Este inimigo já foi derrotado" });
    }

    // Encontra template
    const tpl = (isBoss ? BOSSES : MOBS).find(b => b.name === enemyName);
    if (!tpl) return res.status(404).json({ error: "Inimigo desconhecido" });

    // Cria o boss temporário
    const boss = await Boss.create({
      name: tpl.name, hp: tpl.hp, maxHp: tpl.hp,
      damage: tpl.damage, soulReward: tpl.soulReward,
      description: tpl.description, icon: tpl.icon, isBoss: !!isBoss,
    });

    res.json({
      message: "⚔️ " + c.name + " enfrenta " + boss.name + "!",
      character: {
        id: c.id, name: c.name, class: c.class, level: c.level,
        hp: c.hp, maxHp: c.maxHp, stamina: c.stamina, maxStamina: c.maxStamina,
        fp: c.fp, maxFp: c.maxFp, estus: c.estus, souls: c.souls,
        vitality: c.vitality, strength: c.strength, dexterity: c.dexterity, intelligence: c.intelligence,
        equippedItems: [],
        spells: [],
      },
      boss,
      icon: tpl.icon,
      isBoss: !!isBoss,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ MARCAR INIMIGO DERROTADO ============
router.post("/:id/map/mark/:enemyName", async (req, res) => {
  try {
    const c = await findOwned(req.params.id, req.user.id);
    if (!c) return res.status(404).json({ error: "Não encontrado" });
    const pos = await getOrCreatePosition(c.id);
    let defeated = parseJSON(pos.defeatedEnemies, []);
    if (!defeated.includes(req.params.enemyName)) {
      defeated.push(req.params.enemyName);
      pos.defeatedEnemies = JSON.stringify(defeated);
      await pos.save();
    }
    res.json({ defeated });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
