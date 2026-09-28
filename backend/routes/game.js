const express = require("express");
const router = express.Router();
const Character = require("../models/Character");
const Boss = require("../models/Boss");
const Item = require("../models/Item");
const Material = require("../models/Material");
const { ITEMS, SPELLS, BOSSES, MOBS, rollDrop, MAX_ATTR, checkRequirement, DIFFICULTIES } = require("../models/itemsCatalog");
const { MATERIALS, rollMaterials } = require("../models/craftingCatalog");


const BASE_STAMINA_COST = { quick: 15, normal: 25, heavy: 50, parry: 20, dodge: 30, skill: 40, flee: 20, estus: 0 };

const CLASS_SKILLS = {
  Knight:     { name: "Postura Defensiva", icon: "🛡️", type: "defense", cost: 40, desc: "Bloqueia dano + 20% HP", effect: "shield" },
  Warrior:    { name: "Fúria Sangrenta",   icon: "🩸", type: "attack",  cost: 40, desc: "Sangramento 3 turnos", effect: "bleed" },
  Sorcerer:   { name: "Lança de Alma",     icon: "✨", type: "attack",  cost: 40, desc: "Dano mágico puro", effect: "magic" },
  Pyromancer: { name: "Bola de Fogo",      icon: "🔥", type: "attack",  cost: 40, desc: "Queimadura 3 turnos", effect: "burn" },
  Cleric:     { name: "Bênção",            icon: "🌟", type: "heal",    cost: 40, desc: "Cura 50% HP", effect: "heal" },
  Thief:      { name: "Backstab",          icon: "🗡️", type: "attack",  cost: 40, desc: "Crítico + atordoa", effect: "backstab" },
  Deprived:   { name: "Golpe Desesperado", icon: "💢", type: "attack",  cost: 40, desc: "Dano alto se HP baixo", effect: "desperate" },
};

function parseJSON(str, fallback) {
  try { return JSON.parse(str || "null") || fallback; } catch (e) { return fallback; }
}
function getDiff(character) {
  return DIFFICULTIES[character.difficulty] || DIFFICULTIES.normal;
}

async function recalcMaxHp(c) {
  const equipped = await Item.findAll({ where: { characterId: c.id, equipped: true } });
  const hpBonus = equipped.reduce((sum, it) => sum + (it.hpBonus || 0), 0);
  const curseFactor = c.cursed ? 0.5 : 1.0;
  const baseMaxHp = Math.floor((40 + (c.vitality * 4) + (c.level * 8)) * curseFactor);
  const oldMax = c.maxHp;
  c.maxHp = baseMaxHp + hpBonus;
  c.maxStamina = 50 + (c.dexterity * 3) + (c.level * 3);
  c.maxFp = 30 + (c.intelligence * 3) + (c.level * 2);
  if (c.hp === oldMax) c.hp = c.maxHp;
  if (c.hp > c.maxHp) c.hp = c.maxHp;
  if (c.stamina > c.maxStamina) c.stamina = c.maxStamina;
  if (c.fp > c.maxFp) c.fp = c.maxFp;
}

async function getEquippedBonuses(characterId) {
  const equipped = await Item.findAll({ where: { characterId, equipped: true } });
  const bonus = { damage: 0, defense: 0, hpBonus: 0, strengthBonus: 0 };
  equipped.forEach(it => {
    bonus.damage += it.damage;
    bonus.defense += it.defense;
    bonus.hpBonus += it.hpBonus;
    bonus.strengthBonus += it.strengthBonus;
  });
  return { bonus, equipped };
}

async function formatCharWithItems(c) {
  const equipped = await Item.findAll({ where: { characterId: c.id, equipped: true } });
  const bonus = { damage: 0, defense: 0, hpBonus: 0, strengthBonus: 0 };
  equipped.forEach(it => {
    bonus.damage += it.damage;
    bonus.defense += it.defense;
    bonus.hpBonus += it.hpBonus;
    bonus.strengthBonus += it.strengthBonus;
  });
  const equippedSpells = parseJSON(c.equippedSpells, []).map(k => {
    const s = SPELLS[k];
    if (!s) return null;
    return { key: k, name: s.name, icon: s.icon, cost: s.cost, school: s.school, desc: s.desc, req: s.req };
  }).filter(Boolean);
  const diff = getDiff(c);
  return {
    id: c.id, name: c.name, class: c.class, level: c.level,
    difficulty: c.difficulty,
    difficultyInfo: { name: diff.name, icon: diff.icon, color: diff.color },
    vitality: c.vitality, strength: c.strength,
    dexterity: c.dexterity, intelligence: c.intelligence,
    souls: c.souls, humanity: c.humanity, alive: c.alive,
    hp: c.hp, maxHp: c.maxHp,
    stamina: c.stamina, maxStamina: c.maxStamina,
    fp: c.fp, maxFp: c.maxFp,
    estus: c.estus, maxEstus: c.maxEstus,
    hollowingLevel: c.hollowingLevel || 0,
    deathsTotal: c.deathsTotal || 0,
    cursed: c.cursed,
    bossesKilled: parseJSON(c.bossesKilled, []).length,
    totalKills: c.totalKills || 0,
    bonus,
    equippedItems: equipped.map(i => ({ icon: i.icon, name: i.name, rarity: i.rarity, type: i.type })),
    skill: CLASS_SKILLS[c.class],
    spells: equippedSpells,
  };
}

async function findOwned(charId, userId) {
  return await Character.findOne({ where: { id: charId, userId } });
}

async function dropMaterials(character, boss) {
  const drops = rollMaterials(boss.name, boss.isBoss);
  const log = [];
  for (const d of drops) {
    const tpl = MATERIALS[d.key];
    if (!tpl) continue;
    let mat = await Material.findOne({ where: { characterId: character.id, key: d.key } });
    if (mat) {
      mat.quantity += d.quantity;
      await mat.save();
    } else {
      mat = await Material.create({
        characterId: character.id, key: d.key, name: tpl.name,
        icon: tpl.icon, rarity: tpl.rarity, quantity: d.quantity,
      });
    }
    log.push({ text: "⛏️ Material: " + tpl.icon + " " + tpl.name, type: "loot" });
  }
  return log;
}

router.get("/enemies", (req, res) => res.json({ mobs: MOBS, bosses: BOSSES }));

router.post("/:id/fight", async (req, res) => {
  try {
    const { enemyName, isBoss } = req.body;
    const character = await findOwned(req.params.id, 1);
    if (!character) return res.status(404).json({ error: "Hollow não encontrado" });
    if (!character.alive) return res.status(400).json({ error: "Você está morto. Descanse na fogueira." });
    if (character.hp <= 0) return res.status(400).json({ error: "Sem HP." });
    const tpl = (isBoss ? BOSSES : MOBS).find(b => b.name === enemyName);
    if (!tpl) return res.status(404).json({ error: "Inimigo não encontrado" });
    const diff = getDiff(character);
    let scaleHp = 1.0, scaleDmg = 1.0;
    if (diff.enemyScalingEnabled) {
      const lvlScale = 1 + (character.level - 1) * 0.08;
      scaleHp = lvlScale; scaleDmg = lvlScale;
    }
    const finalHp = Math.floor(tpl.hp * diff.enemyHpMult * scaleHp);
    const finalDmg = Math.floor(tpl.damage * diff.enemyDamageMult * scaleDmg);
    await recalcMaxHp(character);
    await character.save();
    const boss = await Boss.create({
      name: tpl.name, hp: finalHp, maxHp: finalHp,
      damage: finalDmg, soulReward: tpl.soulReward,
      description: tpl.description, icon: tpl.icon, isBoss: !!isBoss,
    });
    res.json({
      message: "⚔️ " + character.name + " enfrenta " + boss.name + "!",
      character: await formatCharWithItems(character),
      boss, icon: tpl.icon, isBoss: !!isBoss,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/:id/action", async (req, res) => {
  try {
    const { action, bossId, spellKey } = req.body;
    const character = await findOwned(req.params.id, 1);
    const boss = await Boss.findByPk(bossId);
    if (!character || !boss) return res.status(404).json({ error: "Não encontrado" });
    if (boss.defeated) return res.status(400).json({ error: "Já derrotado" });
    if (character.hp <= 0) return res.status(400).json({ error: "Você está morto" });
    const { bonus } = await getEquippedBonuses(character.id);
    const diff = getDiff(character);
    const log = [];

    if (action === "cast") {
      if (!spellKey || !SPELLS[spellKey]) return res.status(400).json({ error: "Magia inválida" });
      const spell = SPELLS[spellKey];
      const known = parseJSON(character.knownSpells, []);
      const equippedSpells = parseJSON(character.equippedSpells, []);
      if (!known.includes(spellKey)) return res.status(400).json({ error: "Você não conhece esta magia" });
      if (!equippedSpells.includes(spellKey)) return res.status(400).json({ error: "Magia não equipada" });
      const req = spell.req || {};
      if (req.intelligence && character.intelligence < req.intelligence) {
        return res.status(400).json({ error: "Inteligência insuficiente" });
      }
      const finalCost = Math.ceil(spell.cost * diff.fpCostMult);
      if (character.fp < finalCost) return res.status(400).json({ error: "FP insuficiente (" + character.fp + "/" + finalCost + ")" });
      character.fp -= finalCost;
      const effInt = character.intelligence;
      const baseDmg = spell.damage || 0;
      const scaledDamage = Math.floor((baseDmg + effInt * 1.5 + character.level * 2) * diff.damageMultiplier);
      log.push({ text: spell.icon + " " + character.name + " conjura " + spell.name + "!", type: "crit" });
      if (spell.type === "heal") {
        const healAmt = Math.floor(character.maxHp * spell.heal);
        character.hp = Math.min(character.maxHp, character.hp + healAmt);
        log.push({ text: "💚 Recupera " + healAmt + " de HP!", type: "heal" });
      } else {
        boss.hp = Math.max(0, boss.hp - scaledDamage);
        log.push({ text: "✨ " + spell.name + " causa " + scaledDamage + " de dano!", type: "crit" });
        if (spell.burn) {
          boss.burn = (boss.burn || 0) + spell.burn;
          log.push({ text: "🔥 Queimadura +" + spell.burn + " turnos!", type: "crit" });
        }
      }
    } else {
      const baseCost = BASE_STAMINA_COST[action];
      if (baseCost === undefined) return res.status(400).json({ error: "Ação inválida" });
      const cost = Math.ceil(baseCost * diff.staminaCostMult);
      if (character.stamina < cost) {
        return res.status(400).json({ error: "Stamina insuficiente! (precisa " + cost + ", tem " + character.stamina + ")" });
      }
      character.stamina -= cost;
      let playerDamage = 0;
      let dodging = false, parrying = false, shielded = false;

      if (action === "quick" || action === "normal" || action === "heavy") {
        const effStr = character.strength + bonus.strengthBonus;
        const effDex = character.dexterity;
        const effInt = character.intelligence;
        const base = Math.floor(effStr * 1.2 + effDex * 0.8 + effInt * 0.4 + character.level * 2);
        if (action === "quick") {
          playerDamage = Math.max(1, Math.floor(base * 0.6) + Math.floor(Math.random() * 4));
        } else if (action === "normal") {
          if (Math.random() < 0.1) { playerDamage = 0; log.push({ text: "💨 Você ataca e erra!", type: "miss" }); }
          else playerDamage = Math.max(1, base + Math.floor(Math.random() * 8) - 3);
        } else if (action === "heavy") {
          if (Math.random() < 0.35) { playerDamage = 0; log.push({ text: "💥 Você desfere um golpe pesado e ERRA!", type: "miss" }); }
          else playerDamage = Math.max(1, Math.floor(base * 1.8) + Math.floor(Math.random() * 12));
        }
        if (playerDamage > 0) {
          playerDamage = Math.floor(playerDamage * diff.damageMultiplier) + bonus.damage;
          const emojis = { quick: "⚡", normal: "🗡️", heavy: "💥" };
          const names = { quick: "Ataque Rápido", normal: "Ataque", heavy: "GOLPE PESADO" };
          log.push({ text: emojis[action] + " " + character.name + " usa " + names[action] + " causando " + playerDamage + " de dano!", type: "player" });
        }
      } else if (action === "dodge") {
        log.push({ text: "💨 " + character.name + " se prepara para esquivar...", type: "info" });
        dodging = true;
      } else if (action === "parry") {
        log.push({ text: "🛡️ " + character.name + " prepara um aparo...", type: "info" });
        parrying = true;
      } else if (action === "estus") {
        if (character.estus <= 0) return res.status(400).json({ error: "Sem frascos de Estus!" });
        const heal = Math.floor(character.maxHp * 0.4);
        character.hp = Math.min(character.maxHp, character.hp + heal);
        character.estus -= 1;
        log.push({ text: "🧪 " + character.name + " bebe Estus e recupera " + heal + " de HP! (" + character.estus + " restantes)", type: "heal" });
      } else if (action === "flee") {
        const fleeChance = diff.permadeath ? 0.2 : (character.difficulty === "darksouls" ? 0.3 : 0.5);
        if (Math.random() < fleeChance) {
          log.push({ text: "🏃 " + character.name + " fugiu da batalha!", type: "info" });
          await boss.destroy();
          await character.save();
          return res.json({ fled: true, log, character: await formatCharWithItems(character) });
        } else log.push({ text: "❌ Tentou fugir, mas falhou!", type: "miss" });
      } else if (action === "skill") {
        const skill = CLASS_SKILLS[character.class];
        if (!skill) return res.status(400).json({ error: "Sem habilidade" });
        log.push({ text: skill.icon + " " + character.name + " usa " + skill.name + "!", type: "crit" });
        if (skill.effect === "heal") {
          const heal = Math.floor(character.maxHp * 0.5);
          character.hp = Math.min(character.maxHp, character.hp + heal);
          log.push({ text: "🌟 Recupera " + heal + " de HP!", type: "heal" });
        } else if (skill.effect === "shield") {
          shielded = true;
          const heal = Math.floor(character.maxHp * 0.2);
          character.hp = Math.min(character.maxHp, character.hp + heal);
          log.push({ text: "🛡️ Escudo divino! +" + heal + " HP.", type: "heal" });
        } else if (skill.effect === "bleed") {
          playerDamage = Math.floor(character.strength * 2 + character.level * 3);
          boss.bleed = 3;
          log.push({ text: "🩸 Sangramento por 3 turnos!", type: "crit" });
        } else if (skill.effect === "burn") {
          playerDamage = Math.floor(character.intelligence * 2 + character.level * 3);
          boss.burn = 3;
          log.push({ text: "🔥 Queimadura por 3 turnos!", type: "crit" });
        } else if (skill.effect === "magic") {
          playerDamage = Math.floor(character.intelligence * 3 + character.level * 4);
          log.push({ text: "✨ Dano mágico puro: " + playerDamage + "!", type: "crit" });
        } else if (skill.effect === "backstab") {
          playerDamage = Math.floor((character.strength + character.dexterity) * 1.8 + character.level * 4);
          if (Math.random() < 0.5) {
            boss.stunned = 1;
            log.push({ text: "🗡️ Atordoado!", type: "crit" });
          }
        } else if (skill.effect === "desperate") {
          const hpPct = character.hp / character.maxHp;
          const mult = hpPct < 0.3 ? 3 : hpPct < 0.6 ? 2 : 1.5;
          playerDamage = Math.floor((character.strength * 1.5 + character.level * 3) * mult);
          log.push({ text: "💢 Golpe desesperado (" + mult + "x): " + playerDamage + "!", type: "crit" });
        }
      } else return res.status(400).json({ error: "Ação inválida" });

      if (playerDamage > 0) boss.hp = Math.max(0, boss.hp - playerDamage);
      if (boss.bleed > 0 && boss.hp > 0) {
        const bleedDmg = Math.floor(boss.maxHp * 0.05);
        boss.hp = Math.max(0, boss.hp - bleedDmg);
        boss.bleed -= 1;
        log.push({ text: "🩸 " + boss.name + " sangra! (" + bleedDmg + ")", type: "boss" });
      }
      if (boss.burn > 0 && boss.hp > 0) {
        const burnDmg = Math.floor(boss.maxHp * 0.06);
        boss.hp = Math.max(0, boss.hp - burnDmg);
        boss.burn -= 1;
        log.push({ text: "🔥 " + boss.name + " queima! (" + burnDmg + ")", type: "boss" });
      }
      if (boss.hp <= 0) return await handleVictory(res, character, boss, log);
      if (boss.stunned > 0) {
        boss.stunned -= 1;
        log.push({ text: "😵 " + boss.name + " está atordoado!", type: "info" });
      } else {
        const bossAction = chooseBossAction(boss);
        const attack = rollBossAttack(bossAction, boss, bonus.defense, diff);
        if (dodging && Math.random() < 0.75) {
          log.push({ text: "💨 " + character.name + " esquiva!", type: "info" });
        } else if (parrying && Math.random() < 0.5) {
          const counter = Math.floor(character.strength * 1.5 + character.level * 3);
          boss.hp = Math.max(0, boss.hp - counter);
          log.push({ text: "⚔️ APARO PERFEITO! Contra-ataque " + counter + "!", type: "crit" });
          if (boss.hp <= 0) return await handleVictory(res, character, boss, log);
        } else if (shielded) {
          log.push({ text: "🛡️ Escudo absorve o ataque!", type: "info" });
        } else {
          character.hp = Math.max(0, character.hp - attack.damage);
          const emojis = { heavy: "💥", normal: "👹", special: "🌟" };
          const names = { heavy: "ataque devastador", normal: "ataque", special: "ataque especial" };
          log.push({
            text: (emojis[bossAction] || "👹") + " " + boss.name + " usa " + (names[bossAction] || "ataque") + " causando " + attack.damage + "!",
            type: "boss",
          });
        }
      }
      if (character.hp <= 0) return await handleDeath(res, character, boss, log, diff);
      character.stamina = Math.min(character.maxStamina, character.stamina + diff.regenStamina);
      log.push({ text: "⚡ Stamina +" + diff.regenStamina, type: "info" });
    }

    character.fp = Math.min(character.maxFp, character.fp + diff.regenFp);
    if (action === "cast") log.push({ text: "💠 FP +" + diff.regenFp, type: "info" });
    if (boss.hp <= 0) return await handleVictory(res, character, boss, log);

    if (action === "cast") {
      const bossAction = chooseBossAction(boss);
      const attack = rollBossAttack(bossAction, boss, bonus.defense, diff);
      if (boss.stunned > 0) {
        boss.stunned -= 1;
        log.push({ text: "😵 " + boss.name + " atordoado!", type: "info" });
      } else {
        character.hp = Math.max(0, character.hp - attack.damage);
        log.push({ text: "👹 " + boss.name + " ataca causando " + attack.damage + "!", type: "boss" });
        if (character.hp <= 0) return await handleDeath(res, character, boss, log, diff);
      }
    }
    await boss.save();
    await character.save();
    res.json({ log, character: await formatCharWithItems(character), boss });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

function chooseBossAction(boss) {
  boss.turnCount = (boss.turnCount || 0) + 1;
  if (boss.stunned > 0) return "stunned";
  const isEnraged = boss.hp / boss.maxHp < 0.3;
  const t = boss.turnCount;
  if (isEnraged) {
    if (t % 2 === 0) return "heavy";
    return "normal";
  }
  const roll = Math.random();
  if (roll < 0.15) return "heavy";
  if (roll < 0.25) return "special";
  return "normal";
}
function rollBossAttack(type, boss, bonusDefense, diff) {
  let dmg = boss.damage;
  if (type === "heavy") dmg = Math.floor(dmg * 1.6);
  if (type === "special") dmg = Math.floor(dmg * 1.3);
  dmg = Math.max(1, dmg + Math.floor(Math.random() * 8) - 4);
  dmg = Math.floor(dmg * diff.takenMultiplier);
  const reduced = Math.max(1, dmg - Math.floor(bonusDefense * 0.5));
  return { damage: reduced, raw: dmg };
}

async function handleVictory(res, character, boss, log) {
  const diff = getDiff(character);
  boss.defeated = true;
  await boss.save();
  const soulGain = Math.floor(boss.soulReward * diff.soulsMultiplier);
  character.souls += soulGain;
  character.estus = Math.min(character.maxEstus, character.estus + diff.estusOnBossKill);
  character.stamina = character.maxStamina;
  character.fp = character.maxFp;
  const bossesKilled = parseJSON(character.bossesKilled, []);
  if (!bossesKilled.includes(boss.name)) bossesKilled.push(boss.name);
  character.bossesKilled = JSON.stringify(bossesKilled);
  character.totalKills = (character.totalKills || 0) + 1;
  if (character.cursed) {
    character.cursed = false;
    log.push({ text: "✨ A maldição foi quebrada! HP restaurado.", type: "victory" });
  }
  await recalcMaxHp(character);
  await character.save();

  const droppedKey = rollDrop(boss.name, boss.isBoss);
  let droppedItem = null;
  log.push({ text: "🏆 " + boss.name + " foi derrotado! +" + soulGain + " almas!", type: "victory" });

  if (droppedKey) {
    const tpl = ITEMS[droppedKey];
    droppedItem = await Item.create({
      characterId: character.id, itemKey: droppedKey, name: tpl.name,
      type: tpl.type, rarity: tpl.rarity, icon: tpl.icon,
      damage: tpl.damage || 0, defense: tpl.defense || 0,
      hpBonus: tpl.hpBonus || 0, strengthBonus: tpl.strengthBonus || 0,
      description: tpl.description, equipped: false, startingKit: false,
      requirements: JSON.stringify(tpl.req || {}),
      spellKey: tpl.spellKey || null,
    });
    log.push({ text: "🎁 DROP! " + tpl.name + " (" + tpl.rarity.toUpperCase() + ")", type: "loot", loot: { icon: tpl.icon, name: tpl.name, rarity: tpl.rarity, description: tpl.description } });
  } else {
    log.push({ text: "📦 Nenhum item dropado...", type: "info" });
  }

  const matLog = await dropMaterials(character, boss);
  matLog.forEach(m => log.push(m));

  return res.json({ victory: true, log, character: await formatCharWithItems(character), boss, droppedItem });
}

async function handleDeath(res, character, boss, log, diff) {
  character.deathsTotal = (character.deathsTotal || 0) + 1;
  character.hollowingLevel = (character.hollowingLevel || 0) + diff.hollowingPerDeath;
  const lostSouls = Math.floor(character.souls * diff.soulLossOnDeath);
  character.souls = character.souls - lostSouls;
  character.alive = false;
  character.stamina = character.maxStamina;
  character.fp = character.maxFp;
  let lostItemName = null;
  if (diff.itemLossOnDeath > 0 && Math.random() < diff.itemLossOnDeath) {
    const items = await Item.findAll({ where: { characterId: character.id, startingKit: false, equipped: false } });
    if (items.length) {
      const lost = items[Math.floor(Math.random() * items.length)];
      lostItemName = lost.name;
      await lost.destroy();
    }
  }
  if (diff.curseOnDeath) {
    character.cursed = true;
    log.push({ text: "💀 MALDIÇÃO! HP máximo reduzido à metade até matar um boss.", type: "death" });
  }
  log.push({ text: "💀 VOCÊ MORREU!", type: "death" });
  if (lostSouls > 0) log.push({ text: "🪙 Perdeu " + lostSouls.toLocaleString("pt-BR") + " almas.", type: "death" });
  if (lostItemName) log.push({ text: "🎒 Perdeu " + lostItemName + "!", type: "death" });
  log.push({ text: "🕳️ Hollowing +" + diff.hollowingPerDeath + " (nível " + character.hollowingLevel + ")", type: "death" });
  await recalcMaxHp(character);
  await character.save();
  await boss.destroy();
  if (diff.permadeath) {
    await Item.destroy({ where: { characterId: character.id } });
    await character.destroy();
    return res.json({
      death: true, permadeath: true,
      log: [...log, { text: "☠️ PERMADEATH! Personagem deletado permanentemente.", type: "death" }],
      character: null,
    });
  }
  return res.json({ death: true, log, character: await formatCharWithItems(character) });
}

router.post("/:id/rest", async (req, res) => {
  try {
    const c = await findOwned(req.params.id, 1);
    if (!c) return res.status(404).json({ error: "Não encontrado" });
    const diff = getDiff(c);
    const wasDead = !c.alive;
    await recalcMaxHp(c);
    c.hp = c.maxHp;
    c.stamina = c.maxStamina;
    c.fp = c.maxFp;
    c.estus = Math.min(c.maxEstus, diff.estusOnRest);
    c.alive = true;
    await c.save();
    const msgs = [];
    if (wasDead) msgs.push("🔥 " + c.name + " reviveu!");
    else msgs.push("🔥 " + c.name + " descansou.");
    if (c.cursed) msgs.push("☠️ Amaldiçoado (-50% HP). Mate um boss.");
    res.json({ message: msgs.join(" "), character: await formatCharWithItems(c) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/:id/levelup", async (req, res) => {
  try {
    const { attribute } = req.body;
    const valid = ["vitality", "strength", "dexterity", "intelligence"];
    if (!valid.includes(attribute)) return res.status(400).json({ error: "Atributo inválido" });
    const c = await findOwned(req.params.id, 1);
    if (!c) return res.status(404).json({ error: "Não encontrado" });
    if (c[attribute] >= MAX_ATTR) return res.status(400).json({ error: attribute + " está no máximo" });
    const cost = c.level * 500;
    if (c.souls < cost) return res.status(400).json({ error: "Precisa de " + cost + " almas" });
    c.souls -= cost; c.level += 1; c[attribute] += 1;
    c.pointsSpent = (c.pointsSpent || 0) + 1;
    await recalcMaxHp(c);
    await c.save();
    res.json({ message: "📈 Nível " + c.level + "! +1 " + attribute, character: await formatCharWithItems(c) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/:id/inventory", async (req, res) => {
  try {
    const c = await findOwned(req.params.id, 1);
    if (!c) return res.status(404).json({ error: "Não encontrado" });
    const items = await Item.findAll({
      where: { characterId: c.id },
      order: [["equipped", "DESC"], ["startingKit", "DESC"], ["createdAt", "DESC"]],
    });
    const enriched = items.map(it => {
      const req = parseJSON(it.requirements, {});
      const meets = checkRequirement({ req }, c);
      return { ...it.toJSON(), requirements: req, meetsReq: meets.ok, missing: meets.missing };
    });
    res.json(enriched);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/:id/items/:itemId/equip", async (req, res) => {
  try {
    const c = await findOwned(req.params.id, 1);
    if (!c) return res.status(404).json({ error: "Não encontrado" });
    const item = await Item.findOne({ where: { id: req.params.itemId, characterId: c.id } });
    if (!item) return res.status(404).json({ error: "Item não encontrado" });
    if (item.type === "scroll") return res.status(400).json({ error: "Pergaminhos devem ser aprendidos" });
    const req = parseJSON(item.requirements, {});
    const check = checkRequirement({ req }, c);
    if (!check.ok) {
      const missing = Object.entries(check.missing).map(([k, v]) => k + ": " + v.have + "/" + v.need).join(", ");
      return res.status(400).json({ error: "Requisitos não atendidos — " + missing });
    }
    await Item.update({ equipped: false }, { where: { characterId: c.id, type: item.type } });
    item.equipped = true;
    await item.save();
    await recalcMaxHp(c);
    await c.save();
    res.json({ message: "⚡ " + item.name + " equipado!", item });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/:id/items/:itemId/unequip", async (req, res) => {
  try {
    const c = await findOwned(req.params.id, 1);
    if (!c) return res.status(404).json({ error: "Não encontrado" });
    const item = await Item.findOne({ where: { id: req.params.itemId, characterId: c.id } });
    if (!item) return res.status(404).json({ error: "Item não encontrado" });
    item.equipped = false;
    await item.save();
    await recalcMaxHp(c);
    await c.save();
    res.json({ message: "📦 " + item.name + " guardado.", item });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/:id/items/:itemId/sell", async (req, res) => {
  try {
    const c = await findOwned(req.params.id, 1);
    if (!c) return res.status(404).json({ error: "Não encontrado" });
    const item = await Item.findOne({ where: { id: req.params.itemId, characterId: c.id } });
    if (!item) return res.status(404).json({ error: "Item não encontrado" });
    if (item.startingKit) return res.status(400).json({ error: "Não pode vender item inicial!" });
    const prices = { common: 100, rare: 500, epic: 2000, legendary: 10000 };
    const value = prices[item.rarity] || 100;
    c.souls += value; await c.save();
    const wasEquipped = item.equipped;
    await item.destroy();
    if (wasEquipped) { await recalcMaxHp(c); await c.save(); }
    res.json({ message: "💰 " + item.name + " vendido por " + value + " almas!", character: await formatCharWithItems(c) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/:id/items/:itemId/favorite", async (req, res) => {
  try {
    const c = await findOwned(req.params.id, 1);
    if (!c) return res.status(404).json({ error: "Não encontrado" });
    const item = await Item.findOne({ where: { id: req.params.itemId, characterId: c.id } });
    if (!item) return res.status(404).json({ error: "Item não encontrado" });
    item.favorite = !item.favorite;
    await item.save();
    res.json({ message: item.favorite ? "⭐ Favoritado" : "Removido", item });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/:id/items/sell-batch", async (req, res) => {
  try {
    const { itemIds } = req.body;
    if (!Array.isArray(itemIds) || !itemIds.length) return res.status(400).json({ error: "Nenhum item" });
    const c = await findOwned(req.params.id, 1);
    if (!c) return res.status(404).json({ error: "Não encontrado" });
    const items = await Item.findAll({ where: { id: itemIds, characterId: c.id } });
    const prices = { common: 100, rare: 500, epic: 2000, legendary: 10000 };
    let total = 0;
    let anyEquipped = false;
    for (const item of items) {
      if (item.startingKit) continue;
      if (item.equipped) anyEquipped = true;
      total += prices[item.rarity] || 100;
      await item.destroy();
    }
    c.souls += total;
    await c.save();
    if (anyEquipped) { await recalcMaxHp(c); await c.save(); }
    res.json({ message: "💰 " + total.toLocaleString("pt-BR") + " almas!", character: await formatCharWithItems(c) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/ranking", async (req, res) => {
  const User = require("../models/User");
  const chars = await Character.findAll({ order: [["souls", "DESC"]], limit: 10, include: [{ model: User, attributes: ["username"] }] });
  const result = await Promise.all(chars.map(async c => {
    const data = await formatCharWithItems(c);
    data.ownerName = c.User ? c.User.username : "?";
    return data;
  }));
  res.json(result);
});

module.exports = router;

