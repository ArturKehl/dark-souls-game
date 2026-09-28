const express = require("express");
const router = express.Router();
const Character = require("../models/Character");
const Item = require("../models/Item");
const Material = require("../models/Material");
const WeaponUpgrade = require("../models/WeaponUpgrade");
const { ITEMS } = require("../models/itemsCatalog");
const { MATERIALS, RECIPES, UPGRADE_TIERS, INFUSIONS } = require("../models/craftingCatalog");


async function findOwned(id, userId) {
  return await Character.findOne({ where: { id, userId } });
}

async function recalcMaxHp(c) {
  const equipped = await Item.findAll({ where: { characterId: c.id, equipped: true } });
  const hpBonus = equipped.reduce((sum, it) => sum + (it.hpBonus || 0), 0);
  const curseFactor = c.cursed ? 0.5 : 1.0;
  const baseMaxHp = Math.floor((40 + (c.vitality * 4) + (c.level * 8)) * curseFactor);
  const oldMax = c.maxHp;
  c.maxHp = baseMaxHp + hpBonus;
  if (c.hp === oldMax) c.hp = c.maxHp;
  if (c.hp > c.maxHp) c.hp = c.maxHp;
}

// ============ MATERIAIS DO PERSONAGEM ============
router.get("/:id/materials", async (req, res) => {
  try {
    const c = await findOwned(req.params.id, 1);
    if (!c) return res.status(404).json({ error: "Não encontrado" });
    const mats = await Material.findAll({ where: { characterId: c.id } });
    // Combina com o catálogo pra ter name/icon atualizados
    const result = mats.map(m => {
      const tpl = MATERIALS[m.key] || {};
      return { ...m.toJSON(), name: tpl.name || m.name, icon: tpl.icon || m.icon, rarity: tpl.rarity || m.rarity, description: tpl.description || "" };
    });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ RECEITAS DISPONÍVEIS ============
router.get("/:id/recipes", async (req, res) => {
  try {
    const c = await findOwned(req.params.id, 1);
    if (!c) return res.status(404).json({ error: "Não encontrado" });
    const mats = await Material.findAll({ where: { characterId: c.id } });
    const owned = {};
    mats.forEach(m => owned[m.key] = m.quantity);

    const list = RECIPES.map(r => {
      const canCraft = Object.entries(r.materials).every(([k, qty]) => (owned[k] || 0) >= qty);
      const hasSouls = c.souls >= (r.souls || 0);
      const resultTpl = ITEMS[r.resultItem] || {};
      return {
        ...r,
        resultInfo: { name: resultTpl.name, icon: resultTpl.icon, rarity: resultTpl.rarity, damage: resultTpl.damage || 0, req: resultTpl.req || {} },
        canCraft: canCraft && hasSouls,
        missing: Object.entries(r.materials).map(([k, qty]) => ({
          key: k,
          name: MATERIALS[k]?.name || k,
          icon: MATERIALS[k]?.icon || "❓",
          need: qty,
          have: owned[k] || 0,
          ok: (owned[k] || 0) >= qty,
        })),
      };
    });
    res.json({ recipes: list, souls: c.souls });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ FORJAR (craft) ============
router.post("/:id/craft", async (req, res) => {
  try {
    const { recipeId } = req.body;
    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe) return res.status(404).json({ error: "Receita não encontrada" });
    const c = await findOwned(req.params.id, 1);
    if (!c) return res.status(404).json({ error: "Não encontrado" });

    if (c.souls < (recipe.souls || 0)) return res.status(400).json({ error: "Almas insuficientes" });

    const mats = await Material.findAll({ where: { characterId: c.id } });
    const owned = {};
    mats.forEach(m => owned[m.key] = m);

    for (const [k, qty] of Object.entries(recipe.materials)) {
      if (!owned[k] || owned[k].quantity < qty) {
        return res.status(400).json({ error: "Material insuficiente: " + (MATERIALS[k]?.name || k) });
      }
    }

    // Consome
    c.souls -= (recipe.souls || 0);
    await c.save();
    for (const [k, qty] of Object.entries(recipe.materials)) {
      owned[k].quantity -= qty;
      if (owned[k].quantity <= 0) await owned[k].destroy();
      else await owned[k].save();
    }

    // Cria item
    const tpl = ITEMS[recipe.resultItem];
    if (!tpl) return res.status(500).json({ error: "Item base não existe" });

    const item = await Item.create({
      characterId: c.id, itemKey: recipe.resultItem, name: tpl.name,
      type: tpl.type, rarity: tpl.rarity, icon: tpl.icon,
      damage: tpl.damage || 0, defense: tpl.defense || 0,
      hpBonus: tpl.hpBonus || 0, strengthBonus: tpl.strengthBonus || 0,
      description: tpl.description, equipped: false, startingKit: false,
      requirements: JSON.stringify(tpl.req || {}),
    });

    await WeaponUpgrade.create({ itemId: item.id, upgradeLevel: 0 });

    res.json({
      message: "🔨 " + tpl.name + " forjada com sucesso!",
      item,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ LISTA DE ARMAS UPGRADÁVEIS ============
router.get("/:id/upgradeable", async (req, res) => {
  try {
    const c = await findOwned(req.params.id, 1);
    if (!c) return res.status(404).json({ error: "Não encontrado" });

    const weapons = await Item.findAll({ where: { characterId: c.id, type: "weapon" } });
    const mats = await Material.findAll({ where: { characterId: c.id } });
    const owned = {};
    mats.forEach(m => owned[m.key] = m.quantity);

    const result = await Promise.all(weapons.map(async w => {
      let upg = await WeaponUpgrade.findOne({ where: { itemId: w.id } });
      if (!upg) upg = await WeaponUpgrade.create({ itemId: w.id, upgradeLevel: 0 });
      const nextTier = UPGRADE_TIERS.find(t => t.level === upg.upgradeLevel + 1);
      let canUpgrade = false;
      let missing = [];
      if (nextTier) {
        canUpgrade = Object.entries(nextTier.materials).every(([k, qty]) => (owned[k] || 0) >= qty) && c.souls >= nextTier.souls;
        missing = Object.entries(nextTier.materials).map(([k, qty]) => ({
          key: k, name: MATERIALS[k]?.name || k, icon: MATERIALS[k]?.icon || "❓",
          need: qty, have: owned[k] || 0, ok: (owned[k] || 0) >= qty,
        }));
      }
      return {
        itemId: w.id,
        name: w.name,
        icon: w.icon,
        rarity: w.rarity,
        baseDamage: w.damage,
        upgradeLevel: upg.upgradeLevel,
        infusedWith: upg.infusedWith,
        nextTier: nextTier || null,
        canUpgrade,
        missing,
      };
    }));
    res.json({ weapons: result, souls: c.souls });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ UPGRADE DE ARMA ============
router.post("/:id/upgrade/:itemId", async (req, res) => {
  try {
    const c = await findOwned(req.params.id, 1);
    if (!c) return res.status(404).json({ error: "Não encontrado" });
    const item = await Item.findOne({ where: { id: req.params.itemId, characterId: c.id } });
    if (!item || item.type !== "weapon") return res.status(400).json({ error: "Arma inválida" });

    let upg = await WeaponUpgrade.findOne({ where: { itemId: item.id } });
    if (!upg) upg = await WeaponUpgrade.create({ itemId: item.id, upgradeLevel: 0 });

    const nextTier = UPGRADE_TIERS.find(t => t.level === upg.upgradeLevel + 1);
    if (!nextTier) return res.status(400).json({ error: "Arma no nível máximo" });

    if (c.souls < nextTier.souls) return res.status(400).json({ error: "Almas insuficientes" });

    const mats = await Material.findAll({ where: { characterId: c.id } });
    const owned = {};
    mats.forEach(m => owned[m.key] = m);

    for (const [k, qty] of Object.entries(nextTier.materials)) {
      if (!owned[k] || owned[k].quantity < qty) {
        return res.status(400).json({ error: "Material insuficiente: " + (MATERIALS[k]?.name || k) });
      }
    }

    c.souls -= nextTier.souls;
    await c.save();
    for (const [k, qty] of Object.entries(nextTier.materials)) {
      owned[k].quantity -= qty;
      if (owned[k].quantity <= 0) await owned[k].destroy();
      else await owned[k].save();
    }

    // Aplica upgrade
    upg.upgradeLevel = nextTier.level;
    await upg.save();

    // Aumenta dano do item
    item.damage += nextTier.damageBonus;
    await item.save();

    // Recalcula HP caso equipado
    if (item.equipped) { await recalcMaxHp(c); await c.save(); }

    res.json({
      message: "🔥 " + item.name + " → " + nextTier.name + "! +" + nextTier.damageBonus + " dano",
      item,
      upgrade: upg,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ INFUNDIR ARMA ============
router.post("/:id/infuse/:itemId", async (req, res) => {
  try {
    const { infusionKey } = req.body;
    const infusion = INFUSIONS[infusionKey];
    if (!infusion) return res.status(404).json({ error: "Infusão inválida" });

    const c = await findOwned(req.params.id, 1);
    if (!c) return res.status(404).json({ error: "Não encontrado" });
    const item = await Item.findOne({ where: { id: req.params.itemId, characterId: c.id } });
    if (!item || item.type !== "weapon") return res.status(400).json({ error: "Arma inválida" });

    let upg = await WeaponUpgrade.findOne({ where: { itemId: item.id } });
    if (!upg) upg = await WeaponUpgrade.create({ itemId: item.id, upgradeLevel: 0 });
    if (upg.infusedWith) return res.status(400).json({ error: "Arma já infundida. Remova antes." });
    if (c.souls < infusion.souls) return res.status(400).json({ error: "Almas insuficientes" });

    const mat = await Material.findOne({ where: { characterId: c.id, key: infusion.material } });
    if (!mat || mat.quantity < 1) return res.status(400).json({ error: "Precisa de " + (MATERIALS[infusion.material]?.name || infusion.material) });

    c.souls -= infusion.souls;
    await c.save();
    mat.quantity -= 1;
    if (mat.quantity <= 0) await mat.destroy(); else await mat.save();

    upg.infusedWith = infusionKey;
    await upg.save();

    // Bônus: +15% dano na infusão
    const originalDamage = item.damage;
    item.damage = Math.floor(item.damage * 1.15);
    await item.save();

    if (item.equipped) { await recalcMaxHp(c); await c.save(); }

    res.json({
      message: infusion.icon + " " + item.name + " infundida com " + infusion.name + "!",
      item, infusion: { key: infusionKey, ...infusion },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ REMOVER INFUSÃO ============
router.post("/:id/uninfuse/:itemId", async (req, res) => {
  try {
    const c = await findOwned(req.params.id, 1);
    if (!c) return res.status(404).json({ error: "Não encontrado" });
    const item = await Item.findOne({ where: { id: req.params.itemId, characterId: c.id } });
    if (!item) return res.status(404).json({ error: "Item não encontrado" });

    const upg = await WeaponUpgrade.findOne({ where: { itemId: item.id } });
    if (!upg || !upg.infusedWith) return res.status(400).json({ error: "Arma não está infundida" });

    // Reverte +15%
    item.damage = Math.floor(item.damage / 1.15);
    await item.save();

    upg.infusedWith = null;
    await upg.save();

    if (item.equipped) { await recalcMaxHp(c); await c.save(); }

    res.json({ message: "Infusão removida de " + item.name, item });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

