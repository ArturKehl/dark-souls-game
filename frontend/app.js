// ============================================================
//  DARK SOULS v13 — app.js
// ============================================================

const API_URL = "http://localhost:3000/api/characters";
const GAME_URL = "http://localhost:3000/api/game";
const SPELLS_URL = "http://localhost:3000/api/spells";
const CRAFTING_URL = "http://localhost:3000/api/crafting";
const WORLD_URL = "http://localhost:3000/api/world";

const CLASS_ICONS = { Knight: "🛡️", Warrior: "⚔️", Sorcerer: "🔮", Pyromancer: "🔥", Cleric: "✨", Thief: "🗡️", Deprived: "🪓" };
const RARITY_LABEL = { common: "Comum", rare: "Raro", epic: "Épico", legendary: "Lendário", mythic: "MÍTICO" };

const CLASSES = {
  Knight:     { vitality: 14, strength: 12, dexterity: 8,  intelligence: 6, desc: "Tanque equilibrado." },
  Warrior:    { vitality: 12, strength: 14, dexterity: 8,  intelligence: 6, desc: "Força bruta." },
  Sorcerer:   { vitality: 8,  strength: 6,  dexterity: 10, intelligence: 16, desc: "Mago de longa distância." },
  Pyromancer: { vitality: 10, strength: 10, dexterity: 10, intelligence: 10, desc: "Equilibrado." },
  Cleric:     { vitality: 12, strength: 10, dexterity: 8,  intelligence: 10, desc: "Fé e cura." },
  Thief:      { vitality: 10, strength: 8,  dexterity: 16, intelligence: 6,  desc: "Rápido e furtivo." },
  Deprived:   { vitality: 10, strength: 10, dexterity: 10, intelligence: 10, desc: "Nivelado em tudo." },
};

const STARTING_KITS = {
  Knight:     { weapon: { icon: "⚔️", name: "Espada do Cavaleiro" }, armor: { icon: "🛡️", name: "Escudo do Cavaleiro" } },
  Warrior:    { weapon: { icon: "🪓", name: "Machado de Guerra" }, armor: { icon: "🥋", name: "Armadura de Guerra" } },
  Sorcerer:   { weapon: { icon: "🪄", name: "Catalisador" }, armor: { icon: "🧙", name: "Túnica Arcana" } },
  Pyromancer: { weapon: { icon: "🔥", name: "Chama Piro" }, armor: { icon: "🥻", name: "Vestes Piro" } },
  Cleric:     { weapon: { icon: "🔨", name: "Maça Sagrada" }, armor: { icon: "⛪", name: "Túnica do Clérigo" } },
  Thief:      { weapon: { icon: "🗡️", name: "Adaga do Ladrão" }, armor: { icon: "🧥", name: "Couro do Ladrão" } },
  Deprived:   { weapon: { icon: "🪵", name: "Clava de Madeira" }, armor: { icon: "🧵", name: "Trapos" } },
};

const FREE_POINTS = 20;
const MAX_START_ATTR = 30;
const ATTRS = ["vitality", "strength", "dexterity", "intelligence"];
const $ = id => document.getElementById(id);

let currentBattle = null;
let currentEnemyIsBoss = false;
let currentInventoryId = null;
let currentInventoryName = "";
let currentLevelUpCharId = null;
let currentRegionId = null;
let selectedClass = null;
let selectedDifficulty = "normal";
let attrValues = { vitality: 10, strength: 10, dexterity: 10, intelligence: 10 };
let cachedEnemies = null;
let invState = { tab: "all", onlyFav: false, sort: "default", batchMode: false, selected: new Set(), items: [], characterId: null, characterName: "" };
let forgeState = { tab: "craft", characterId: null };

async function apiFetch(url, options = {}) {
  options.headers = options.headers || {};
  if (options.body && !options.headers["Content-Type"]) options.headers["Content-Type"] = "application/json";
  return fetch(url, options);
}

function showToast(msg, isError = false) {
  const toast = $("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove("hidden", "error");
  if (isError) toast.classList.add("error");
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.add("hidden"), 3500);
}
function escapeHtml(str) { const d = document.createElement("div"); d.textContent = str; return d.innerHTML; }

// ===== BRASAS =====
const canvas = $("embers");
if (canvas) {
  const ctx = canvas.getContext("2d");
  let embers = [];
  function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
  function createEmber() { return { x: Math.random() * canvas.width, y: canvas.height + 10, size: Math.random() * 2.5 + 1, speedY: -(Math.random() * 0.6 + 0.3), speedX: (Math.random() - 0.5) * 0.4, opacity: Math.random() * 0.6 + 0.4, life: 1, color: Math.random() < 0.3 ? "#ff6020" : "#d4a017" }; }
  function animateEmbers() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (embers.length < 60 && Math.random() < 0.4) embers.push(createEmber());
    embers = embers.filter(e => e.life > 0 && e.y > -20);
    embers.forEach(e => {
      e.x += e.speedX; e.y += e.speedY; e.life -= 0.002;
      e.opacity = Math.max(0, e.life * 0.8);
      const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size * 3);
      grad.addColorStop(0, e.color);
      grad.addColorStop(0.5, "rgba(255,120,20," + (e.opacity * 0.4) + ")");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.size * 3, 0, Math.PI * 2); ctx.fill();
    });
    requestAnimationFrame(animateEmbers);
  }
  animateEmbers();
}

// ===== PERSONAGENS =====
async function fetchCharacters() {
  try {
    const res = await apiFetch(API_URL);
    renderCharacters(await res.json());
  } catch (err) {
    const listEl = $("characters-list");
    if (listEl) listEl.innerHTML = '<p class="loading">Erro ao carregar.</p>';
  }
}
async function createCharacter(data) {
  const res = await apiFetch(API_URL, { method: "POST", body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Falha");
  return json;
}
async function updateCharacter(id, data) {
  const res = await apiFetch(API_URL + "/" + id, { method: "PUT", body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Falha");
  return json;
}
async function deleteCharacter(id) {
  const res = await apiFetch(API_URL + "/" + id, { method: "DELETE" });
  return res.json();
}

function renderKitPreview(cls) {
  const kit = STARTING_KITS[cls];
  const kitPreview = $("kit-preview");
  if (!kitPreview) return;
  if (!kit) { kitPreview.classList.add("hidden"); return; }
  kitPreview.classList.remove("hidden");
  const items = [{ slot: "⚔️ Arma", ...kit.weapon }, { slot: "🛡️ Armadura", ...kit.armor }];
  $("kit-items").innerHTML = items.map(i => '<div class="kit-item"><div class="kit-item-icon">' + i.icon + '</div><div class="kit-item-info"><b>' + escapeHtml(i.name) + '</b><small>' + i.slot + '</small></div></div>').join("");
}

function updatePointsUI() {
  const rem_el = $("points-remaining");
  if (!rem_el) return;
  if (!selectedClass) {
    rem_el.textContent = FREE_POINTS;
    rem_el.classList.remove("warn");
    $("class-base-info").textContent = "Selecione uma classe.";
    ATTRS.forEach(a => { const el = $(a); if (el) el.value = 10; });
    const btn = $("submit-btn"); if (btn) btn.disabled = true;
    $("kit-preview").classList.add("hidden");
    return;
  }
  const base = CLASSES[selectedClass];
  const spent = ATTRS.reduce((sum, a) => sum + (attrValues[a] - base[a]), 0);
  const remaining = FREE_POINTS - spent;
  rem_el.textContent = remaining;
  rem_el.classList.toggle("warn", remaining !== 0);
  $("class-base-info").innerHTML = '<b style="color:var(--gold)">' + selectedClass + '</b> — ' + base.desc;
  ATTRS.forEach(a => {
    const input = $(a);
    if (input) input.value = attrValues[a];
    const row = document.querySelector('.attr-row[data-attr="' + a + '"]');
    if (row) {
      row.querySelector(".minus").disabled = attrValues[a] <= base[a];
      row.querySelector(".plus").disabled = remaining <= 0 || attrValues[a] >= MAX_START_ATTR;
    }
  });
  const btn = $("submit-btn"); if (btn) btn.disabled = remaining !== 0;
}

function changeAttr(attr, delta) {
  if (!selectedClass) return showToast("Escolha classe!", true);
  const base = CLASSES[selectedClass];
  const newVal = attrValues[attr] + delta;
  if (newVal < base[attr]) return;
  if (newVal > MAX_START_ATTR) return showToast("Máx: " + MAX_START_ATTR, true);
  const spent = ATTRS.reduce((sum, a) => sum + (attrValues[a] - base[a]), 0);
  if (delta > 0 && spent + delta > FREE_POINTS) return showToast("Sem pontos!", true);
  attrValues[attr] = newVal;
  updatePointsUI();
}

function selectClass(cls) {
  document.querySelectorAll(".class-option").forEach(o => o.classList.toggle("selected", o.dataset.class === cls));
  selectedClass = cls;
  $("class").value = cls;
  const base = CLASSES[cls];
  attrValues = { vitality: base.vitality, strength: base.strength, dexterity: base.dexterity, intelligence: base.intelligence };
  renderKitPreview(cls);
  updatePointsUI();
}

function getFormData() {
  return {
    name: $("name").value.trim(), class: $("class").value,
    difficulty: selectedDifficulty,
    vitality: attrValues.vitality, strength: attrValues.strength,
    dexterity: attrValues.dexterity, intelligence: attrValues.intelligence,
  };
}

function resetForm() {
  $("character-form").reset();
  $("character-id").value = "";
  $("class").value = "";
  selectedClass = null;
  selectedDifficulty = "normal";
  attrValues = { vitality: 10, strength: 10, dexterity: 10, intelligence: 10 };
  document.querySelectorAll(".class-option").forEach(o => o.classList.remove("selected"));
  document.querySelectorAll(".difficulty-option").forEach(o => o.classList.toggle("selected", o.dataset.diff === "normal"));
  $("difficulty").value = "normal";
  $("form-title").textContent = "⚔️ Forjar Hollow";
  $("submit-btn").textContent = "🔥 Acender Fogueira";
  $("cancel-btn").classList.add("hidden");
  $("kit-preview").classList.add("hidden");
  document.querySelectorAll(".attr-btn").forEach(b => b.disabled = false);
  updatePointsUI();
}

function renderCharacters(characters) {
  const listEl = $("characters-list");
  if (!listEl) return;
  if (!characters.length) { listEl.innerHTML = '<p class="loading">💀 Nenhum Hollow ainda.</p>'; return; }
  listEl.innerHTML = characters.map(c => {
    const hpPct = Math.max(0, Math.min(100, (c.hp / c.maxHp) * 100));
    const icon = CLASS_ICONS[c.class] || "❓";
    const diffKey = c.difficulty || "normal";
    const diffNames = { normal: "🌤️ Normal", hard: "⚔️ Hard", darksouls: "💀 Dark Souls", ironman: "☠️ IRONMAN" };
    const curseHtml = c.cursed ? '<div class="curse-indicator">☠️ AMALDIÇOADO</div>' : '';
    return '<div class="card ' + (c.alive ? "" : "dead") + '">' +
      '<div class="card-header"><div class="card-avatar">' + icon + '</div><div class="card-header-info"><h3>' + escapeHtml(c.name) + '</h3><span class="class-tag">' + c.class + ' • Nv ' + c.level + '</span></div></div>' +
      '<span class="difficulty-badge ' + diffKey + '">' + diffNames[diffKey] + '</span>' + curseHtml +
      '<div class="hp-bar-mini"><div class="hp-fill-mini" style="width: ' + hpPct + '%"></div></div>' +
      '<div class="stats">' +
        '<div class="stat"><span>❤️ HP</span><span>' + c.hp + '/' + c.maxHp + '</span></div>' +
        '<div class="stat"><span>⚡ Stamina</span><span>' + (c.stamina || 0) + '/' + (c.maxStamina || 100) + '</span></div>' +
        '<div class="stat"><span>💠 FP</span><span>' + (c.fp || 0) + '/' + (c.maxFp || 50) + '</span></div>' +
        '<div class="stat gold"><span>🪙 Almas</span><span>' + c.souls.toLocaleString("pt-BR") + '</span></div>' +
      '</div>' +
      '<div class="actions"><button type="button" data-act="edit" data-id="' + c.id + '">✏️ Editar</button><button type="button" class="cancel" data-act="remove" data-id="' + c.id + '">🗑️ Remover</button></div>' +
      '<div class="game-actions">' +
        (c.alive ? '<button type="button" class="fight-btn" data-act="fight" data-id="' + c.id + '">⚔️ LUTAR</button>' : '<button type="button" class="fight-btn" data-act="rest" data-id="' + c.id + '">🔥 REVIVER</button>') +
        '<button type="button" class="inventory-btn" data-act="inventory" data-id="' + c.id + '" data-name="' + escapeHtml(c.name) + '">🎒 Inventário</button>' +
        '<button type="button" class="grimoire-btn" data-act="spells" data-id="' + c.id + '">📚 Grimório</button>' +
        '<button type="button" class="forge-btn" data-act="forge" data-id="' + c.id + '">🔨 Forja</button>' +
        '<button type="button" class="world-btn" data-act="world" data-id="' + c.id + '">🗺️ Mundo</button>' +
        '<button type="button" class="quests-btn" data-act="quests" data-id="' + c.id + '">📜 Missões</button>' +
        '<button type="button" data-act="rest" data-id="' + c.id + '">🔥 Descansar</button>' +
        '<button type="button" data-act="levelup" data-id="' + c.id + '">📈 Nível</button>' +
      '</div></div>';
  }).join("");
}

// ===== AÇÕES =====
async function handleEdit(id) {
  const c = await (await apiFetch(API_URL + "/" + id)).json();
  $("character-id").value = c.id;
  $("name").value = c.name;
  selectClass(c.class);
  $("form-title").textContent = "✏️ Editando: " + c.name;
  $("submit-btn").textContent = "💾 Salvar Nome";
  $("cancel-btn").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
async function handleRemove(id) {
  if (!confirm("Enviar ao abismo?")) return;
  await deleteCharacter(id);
  showToast("💀 Removido.");
  fetchCharacters();
}
async function handleRest(id) {
  const data = await (await apiFetch(GAME_URL + "/" + id + "/rest", { method: "POST" })).json();
  if (data.error) return showToast(data.error, true);
  showToast(data.message);
  fetchCharacters();
}
async function handleFight(id) {
  if (!cachedEnemies) cachedEnemies = await (await apiFetch(GAME_URL + "/enemies")).json();
  window.currentBattleCharId = id;
  showEnemyTab("mobs");
  $("enemy-modal").classList.remove("hidden");
}
async function handleInventory(id, name) {
  currentInventoryId = id; currentInventoryName = name;
  await refreshInventory(id, name);
  $("inventory-modal").classList.remove("hidden");
}
async function handleLevelUp(id) {
  currentLevelUpCharId = id;
  const c = await (await apiFetch(API_URL + "/" + id)).json();
  $("levelup-cost").textContent = (c.level * 500).toLocaleString("pt-BR");
  $("levelup-souls").textContent = c.souls.toLocaleString("pt-BR");
  $("lv-vit").textContent = c.vitality;
  $("lv-str").textContent = c.strength;
  $("lv-dex").textContent = c.dexterity;
  $("lv-int").textContent = c.intelligence;
  $("levelup-modal").classList.remove("hidden");
}
async function doLevelUp(attribute) {
  if (!currentLevelUpCharId) return;
  const data = await (await apiFetch(GAME_URL + "/" + currentLevelUpCharId + "/levelup", { method: "POST", body: JSON.stringify({ attribute }) })).json();
  if (data.error) return showToast(data.error, true);
  showToast(data.message);
  handleLevelUp(currentLevelUpCharId);
}

// ===== INIMIGOS =====
function showEnemyTab(tab) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  const list = $("enemy-list");
  if (!list || !cachedEnemies) return;
  const enemies = tab === "mobs" ? cachedEnemies.mobs : cachedEnemies.bosses;
  const isBoss = tab === "bosses";
  list.innerHTML = enemies.map(e =>
    '<button type="button" class="enemy-card ' + (isBoss ? "boss" : "mob") + '" data-enemy-name="' + escapeHtml(e.name) + '" data-enemy-icon="' + e.icon + '" data-enemy-boss="' + isBoss + '">' +
    '<span class="enemy-icon">' + e.icon + '</span><h4>' + escapeHtml(e.name) + '</h4><p>"' + escapeHtml(e.description) + '"</p>' +
    '<div class="enemy-stats"><span>❤️ <b>' + e.hp + '</b></span><span>⚔️ <b>' + e.damage + '</b></span><span>🪙 <b>' + e.soulReward.toLocaleString("pt-BR") + '</b></span></div></button>'
  ).join("");
}
async function startBattle(characterId, enemyName, enemyIcon, isBoss) {
  $("enemy-modal").classList.add("hidden");
  currentEnemyIsBoss = !!isBoss;
  const data = await (await apiFetch(GAME_URL + "/" + characterId + "/fight", { method: "POST", body: JSON.stringify({ enemyName, isBoss }) })).json();
  if (data.error) return showToast(data.error, true);
  currentBattle = { characterId, bossId: data.boss.id };
  $("battle-modal").classList.remove("hidden");
  $("battle-title").textContent = "⚔️ " + data.character.name + " vs " + data.boss.name;
  $("battle-log").innerHTML = '<p class="player">' + data.message + '</p>';
  $("battle-result").classList.add("hidden");
  $("battle-actions").classList.remove("hidden");
  $("boss-avatar").textContent = enemyIcon || "👹";
  $("player-avatar").textContent = CLASS_ICONS[data.character.class] || "🛡️";
  updateBattleUI(data.character, data.boss);
}

function updateBattleUI(character, boss) {
  $("battle-player-name").textContent = character.name;
  $("battle-boss-name").textContent = boss ? boss.name : "Derrotado";
  $("player-hp-fill").style.width = Math.max(0, (character.hp / character.maxHp) * 100) + "%";
  $("player-hp-text").textContent = character.hp + "/" + character.maxHp;
  const st = character.stamina || 0, stMax = character.maxStamina || 100;
  $("player-stamina-fill").style.width = Math.max(0, (st / stMax) * 100) + "%";
  $("player-stamina-text").textContent = st + "/" + stMax;
  const fp = character.fp || 0, fpMax = character.maxFp || 50;
  $("player-fp-fill").style.width = Math.max(0, (fp / fpMax) * 100) + "%";
  $("player-fp-text").textContent = fp + "/" + fpMax;
  $("player-estus").textContent = "🧪".repeat(character.estus) || "—";
  const spellBar = $("spell-bar");
  if (spellBar && character.spells) {
    if (!character.spells.length) spellBar.innerHTML = '<div class="spell-slot empty">📚 Sem magias</div>';
    else {
      spellBar.innerHTML = character.spells.map(s => '<button type="button" class="spell-slot" data-cast="' + s.key + '"><span class="spell-icon">' + s.icon + '</span><span class="spell-name">' + s.name + '</span><span class="spell-cost">💠 ' + s.cost + '</span></button>').join("");
      spellBar.querySelectorAll(".spell-slot").forEach(btn => {
        const spell = character.spells.find(s => s.key === btn.dataset.cast);
        if (spell) btn.disabled = fp < spell.cost;
      });
    }
  }
  if (boss) {
    $("boss-hp-fill").style.width = Math.max(0, (boss.hp / boss.maxHp) * 100) + "%";
    $("boss-hp-text").textContent = boss.hp + "/" + boss.maxHp;
  }
  const costMap = { quick: 15, normal: 25, heavy: 50, dodge: 30, parry: 20, skill: 40, estus: 0, flee: 20 };
  document.querySelectorAll(".action-btn").forEach(btn => {
    const action = btn.dataset.action;
    const cost = costMap[action] || 0;
    if (action === "estus") btn.disabled = character.estus <= 0;
    else btn.disabled = st < cost;
  });
}

function floatDamage(targetId, text, className) {
  const target = $(targetId);
  if (!target) return;
  const rect = target.getBoundingClientRect();
  const el = document.createElement("div");
  el.className = "float-dmg " + className;
  el.textContent = text;
  el.style.position = "fixed";
  el.style.left = (rect.left + rect.width / 2) + "px";
  el.style.top = (rect.top + 20) + "px";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

async function doAction(action, btnEl) {
  if (!currentBattle) return;
  document.querySelectorAll(".action-btn").forEach(b => b.disabled = true);
  const bodyData = { action, bossId: currentBattle.bossId, isBoss: currentEnemyIsBoss };
  if (action === "cast" && window._castSpellKey) bodyData.spellKey = window._castSpellKey;
  const data = await (await apiFetch(GAME_URL + "/" + currentBattle.characterId + "/action", { method: "POST", body: JSON.stringify(bodyData) })).json();
  if (data.error) {
    showToast(data.error, true);
    if (data.character) updateBattleUI(data.character, data.boss);
    return;
  }
  const logEl = $("battle-log");
  const entries = data.log || [];
  if (data.boss && !data.victory) {
    const bossEl = $("boss-fighter");
    bossEl.classList.add("hit");
    setTimeout(() => bossEl.classList.remove("hit"), 500);
  }
  if (data.log && data.log.some(l => l.type === "boss")) {
    setTimeout(() => {
      const p = $("player-fighter");
      p.classList.add("hit");
      setTimeout(() => p.classList.remove("hit"), 500);
    }, 500);
  }
  entries.forEach((entry, i) => {
    setTimeout(() => {
      const p = document.createElement("p");
      p.className = entry.type || "player";
      p.textContent = entry.text;
      logEl.appendChild(p);
      logEl.scrollTop = logEl.scrollHeight;
      if (entry.type === "player" || entry.type === "crit" || entry.type === "boss") {
        const m = entry.text.match(/(\d+)\s+de dano/);
        if (m) {
          if (entry.type === "boss") floatDamage("player-fighter", "-" + m[1], "dmg-player");
          else floatDamage("boss-fighter", "-" + m[1], entry.type === "crit" ? "crit" : "dmg-boss");
        }
      }
      if (entry.type === "heal") {
        const m = entry.text.match(/(\d+)\s+de HP/);
        if (m) floatDamage("player-fighter", "+" + m[1], "heal");
      }
      if (entry.type === "loot" && entry.loot) setTimeout(() => showLootDrop(entry.loot), 700);
    }, i * 300);
  });
  const totalDelay = entries.length * 300;
  setTimeout(() => updateBattleUI(data.character, data.boss), totalDelay);
  if (data.victory || data.death || data.fled) {
    setTimeout(() => {
      $("battle-actions").classList.add("hidden");
      $("battle-result").classList.remove("hidden");
      const r = $("result-text");
      if (data.victory) { r.textContent = "🏆 VICTORY"; r.className = "result-text victory"; }
      else if (data.death) { r.textContent = "💀 YOU DIED"; r.className = "result-text death"; }
      else { r.textContent = "🏃 Fugiu"; r.className = "result-text"; }
    }, totalDelay + 500);
    currentBattle = null;
    setTimeout(fetchCharacters, totalDelay + 800);
  }
}

function showLootDrop(loot) {
  $("loot-content").innerHTML = '<div class="loot-icon">' + loot.icon + '</div><div class="loot-name">' + escapeHtml(loot.name) + '</div><div class="loot-rarity ' + loot.rarity + '">' + (RARITY_LABEL[loot.rarity] || loot.rarity) + '</div>';
  $("loot-modal").classList.remove("hidden");
}

// ===== INVENTÁRIO =====
async function refreshInventory(characterId, charName) {
  invState.characterId = characterId;
  invState.characterName = charName;
  $("inventory-title").textContent = "🎒 " + charName;
  const items = await (await apiFetch(GAME_URL + "/" + characterId + "/inventory")).json();
  invState.items = items;
  $("inv-stats").innerHTML = "📦 <span>" + items.length + "</span> • ⚡ <span>" + items.filter(i => i.equipped).length + "</span>";
  renderInventory();
}

function renderInventory() {
  const list = $("inventory-list");
  let items = invState.items.slice();
  if (invState.tab !== "all") items = items.filter(i => i.type === invState.tab);
  if (!items.length) { list.innerHTML = '<p class="inventory-empty">Nenhum item.</p>'; return; }
  list.innerHTML = items.map(it => {
    const bonuses = [];
    if (it.damage) bonuses.push("⚔️ +" + it.damage);
    if (it.defense) bonuses.push("🛡️ +" + it.defense);
    if (it.hpBonus) bonuses.push("❤️ +" + it.hpBonus);
    if (it.strengthBonus) bonuses.push("💪 +" + it.strengthBonus);
    const isScroll = it.type === "scroll";
    return '<div class="item-card ' + it.rarity + ' ' + (it.equipped ? "equipped" : "") + ' ' + (it.startingKit ? "starting" : "") + '" data-item-id="' + it.id + '">' +
      '<div class="item-header"><div class="item-icon">' + it.icon + '</div><div class="item-info"><h4>' + escapeHtml(it.name) + '</h4><span class="item-type">' + it.type + ' • ' + (RARITY_LABEL[it.rarity] || it.rarity) + '</span></div></div>' +
      '<div class="item-desc">' + escapeHtml(it.description || "") + '</div>' +
      '<div class="item-bonuses">' + bonuses.map(b => '<span>' + b + '</span>').join("") + '</div>' +
      '<div class="item-actions">' +
        (isScroll ? '<button type="button" class="equip-btn" data-learn="' + it.id + '">📖 Aprender</button>' :
          (it.equipped ? '<button type="button" class="unequip-btn" data-item-act="unequip" data-item-id="' + it.id + '">📦 Guardar</button>'
                       : '<button type="button" class="equip-btn" data-item-act="equip" data-item-id="' + it.id + '">⚡ Equipar</button>')) +
        (!isScroll ? '<button type="button" class="sell-btn" data-item-act="sell" data-item-id="' + it.id + '"' + (it.startingKit ? ' disabled' : '') + '>💰</button>' : '') +
      '</div></div>';
  }).join("");
}

// ===== MAGIAS =====
async function openSpellsModal(characterId) {
  currentInventoryId = characterId;
  const data = await (await apiFetch(SPELLS_URL + "/" + characterId + "/spells")).json();
  const list = $("spells-list");
  if (!data.known || !data.known.length) list.innerHTML = '<p class="loading">Nenhuma magia conhecida.</p>';
  else {
    list.innerHTML = data.known.map(s => {
      return '<div class="spell-card ' + (s.equipped ? "equipped" : "") + ' ' + (s.rarity || "common") + '">' +
        '<div class="spell-header"><div class="spell-icon-big">' + s.icon + '</div><div class="spell-info"><h4>' + s.name + '</h4><span class="spell-school">' + s.school + ' • ' + (RARITY_LABEL[s.rarity] || "") + '</span></div></div>' +
        '<div class="spell-desc">' + s.desc + '</div>' +
        '<div class="spell-stats"><span>💠 ' + s.cost + ' FP</span>' + (s.damage ? '<span>⚔️ ' + s.damage + '</span>' : '') + '</div>' +
        '<div class="item-actions">' + (s.equipped ? '<button type="button" class="unequip-btn" data-unequip-spell="' + s.key + '">✖ Desequipar</button>' : '<button type="button" class="equip-btn" data-equip-spell="' + s.key + '">⚡ Equipar</button>') + '</div>' +
      '</div>';
    }).join("");
  }
  $("spells-modal").classList.remove("hidden");
}

// ===== FORJA =====
async function openForge(characterId) {
  forgeState.characterId = characterId;
  forgeState.tab = "craft";
  document.querySelectorAll(".forge-tab").forEach(t => t.classList.toggle("active", t.dataset.forgeTab === "craft"));
  await renderForge();
  $("forge-modal").classList.remove("hidden");
}

async function renderForge() {
  const content = $("forge-content");
  const cid = forgeState.characterId;
  if (!cid) return;
  if (forgeState.tab === "craft") {
    const recData = await (await apiFetch(CRAFTING_URL + "/" + cid + "/recipes")).json();
    $("forge-souls").textContent = (recData.souls || 0).toLocaleString("pt-BR");
    content.innerHTML = '<div class="recipe-grid">' + recData.recipes.map(r =>
      '<div class="recipe-card ' + (r.canCraft ? "" : "cant") + '">' +
        '<div class="recipe-header"><div class="recipe-icon">' + r.icon + '</div><div class="recipe-info"><h4>' + escapeHtml(r.name) + '</h4></div></div>' +
        '<div class="recipe-materials">' + r.missing.map(m => '<div class="mat-row"><span class="name">' + m.icon + ' ' + escapeHtml(m.name) + '</span><span class="qty ' + (m.ok ? "ok" : "bad") + '">' + m.have + '/' + m.need + '</span></div>').join("") + '</div>' +
        '<div class="recipe-souls">🪙 ' + (r.souls || 0).toLocaleString("pt-BR") + '</div>' +
        '<div class="recipe-actions"><button type="button" class="equip-btn" data-craft="' + r.id + '"' + (r.canCraft ? "" : " disabled") + '>🔨 Forjar</button></div>' +
      '</div>'
    ).join("") + '</div>';
  } else if (forgeState.tab === "materials") {
    const mats = await (await apiFetch(CRAFTING_URL + "/" + cid + "/materials")).json();
    if (!mats.length) content.innerHTML = '<p class="loading">Nenhum material.</p>';
    else content.innerHTML = '<div class="materials-grid">' + mats.map(m => '<div class="material-card ' + m.rarity + '"><span class="material-icon">' + m.icon + '</span><h4>' + escapeHtml(m.name) + '</h4><div class="material-qty">' + m.quantity + '</div></div>').join("") + '</div>';
  } else if (forgeState.tab === "upgrade") {
    const upData = await (await apiFetch(CRAFTING_URL + "/" + cid + "/upgradeable")).json();
    if (!upData.weapons.length) content.innerHTML = '<p class="loading">Nenhuma arma.</p>';
    else content.innerHTML = '<div class="recipe-grid">' + upData.weapons.map(w => '<div class="upgrade-card"><div class="upgrade-header"><div class="recipe-icon">' + w.icon + '</div><div class="recipe-info"><h4>' + escapeHtml(w.name) + '</h4><span class="upgrade-level">+' + w.upgradeLevel + '</span></div></div><div class="recipe-actions"><button type="button" class="equip-btn" data-upgrade="' + w.itemId + '"' + (w.canUpgrade ? "" : " disabled") + '>🔥 Melhorar</button></div></div>').join("") + '</div>';
  } else if (forgeState.tab === "infuse") {
    const upData = await (await apiFetch(CRAFTING_URL + "/" + cid + "/upgradeable")).json();
    if (!upData.weapons.length) content.innerHTML = '<p class="loading">Nenhuma arma.</p>';
    else content.innerHTML = '<div class="recipe-grid">' + upData.weapons.map(w => '<div class="upgrade-card"><div class="upgrade-header"><div class="recipe-icon">' + w.icon + '</div><div class="recipe-info"><h4>' + escapeHtml(w.name) + '</h4></div></div><div class="recipe-actions"><button type="button" class="equip-btn" data-infuse="' + w.itemId + '" data-infusion="fire">🔥 Fogo</button><button type="button" class="equip-btn" data-infuse="' + w.itemId + '" data-infusion="magic">🔮 Magia</button></div></div>').join("") + '</div>';
  }
}

async function doCraft(recipeId) {
  const data = await (await apiFetch(CRAFTING_URL + "/" + forgeState.characterId + "/craft", { method: "POST", body: JSON.stringify({ recipeId }) })).json();
  if (data.error) return showToast(data.error, true);
  showToast(data.message);
  await renderForge(); await fetchCharacters();
}
async function doUpgrade(itemId) {
  const data = await (await apiFetch(CRAFTING_URL + "/" + forgeState.characterId + "/upgrade/" + itemId, { method: "POST" })).json();
  if (data.error) return showToast(data.error, true);
  showToast(data.message);
  await renderForge(); await fetchCharacters();
}
async function doInfuse(itemId, infusionKey) {
  const data = await (await apiFetch(CRAFTING_URL + "/" + forgeState.characterId + "/infuse/" + itemId, { method: "POST", body: JSON.stringify({ infusionKey }) })).json();
  if (data.error) return showToast(data.error, true);
  showToast(data.message);
  await renderForge(); await fetchCharacters();
}

// ===== MUNDO =====
async function openWorldModal(characterId) {
  const regions = await (await apiFetch(WORLD_URL + "/regions")).json();
  const c = await (await apiFetch(API_URL + "/" + characterId)).json();
  const list = $("world-list");
  list.innerHTML = regions.map(r => {
    const locked = c.level < r.minLevel;
    return '<div class="region-card ' + (locked ? "locked" : "") + '" data-region-id="' + r.id + '">' +
      '<div class="region-header"><div class="region-icon">' + r.icon + '</div><div class="region-info"><h4>' + escapeHtml(r.name) + '</h4><small>Nível ' + r.minLevel + '+</small></div>' + (locked ? '<span class="region-lock">🔒</span>' : '') + '</div>' +
      '<div class="region-desc">' + escapeHtml(r.description) + '</div>' +
      '<div class="region-stats"><span>👾 ' + r.enemyCount + '</span><span>👹 ' + r.bossCount + '</span><span>🧙 ' + r.npcCount + '</span></div>' +
    '</div>';
  }).join("");
  $("world-modal").classList.remove("hidden");
  window._worldCharId = characterId;
}

async function enterRegion(regionId) {
  const charId = window._worldCharId;
  const data = await (await apiFetch(WORLD_URL + "/" + charId + "/region/" + regionId + "/visit", { method: "POST" })).json();
  if (data.error) return showToast(data.error, true);
  showToast(data.message);
  // Abre detalhes
  const detail = await (await apiFetch(WORLD_URL + "/" + charId + "/region/" + regionId)).json();
  const list = $("world-list");
  const r = detail.region;
  list.innerHTML = '<div class="region-detail">' +
    '<button type="button" class="cancel" id="back-to-world" style="margin-bottom:15px">← Voltar ao mapa</button>' +
    '<h3 style="text-align:center;color:var(--gold);font-family:Cinzel,serif;margin-bottom:8px">' + r.icon + ' ' + r.name + '</h3>' +
    '<p style="text-align:center;color:var(--muted);font-style:italic;margin-bottom:15px">' + r.ambience + '</p>' +
    '<h4 style="color:var(--gold);margin:15px 0 8px">👾 Inimigos</h4>' +
    '<div class="enemy-list">' + r.enemies.map(e => '<button type="button" class="enemy-card mob" data-region-fight="' + e.name + '" data-region-boss="false"><span class="enemy-icon">' + e.icon + '</span><h4>' + escapeHtml(e.name) + '</h4></button>').join("") + '</div>' +
    '<h4 style="color:#ff6060;margin:15px 0 8px">👹 Bosses</h4>' +
    '<div class="enemy-list">' + r.bosses.map(e => '<button type="button" class="enemy-card boss" data-region-fight="' + e.name + '" data-region-boss="true"><span class="enemy-icon">' + e.icon + '</span><h4>' + escapeHtml(e.name) + '</h4></button>').join("") + '</div>' +
    '<h4 style="color:#4080d4;margin:15px 0 8px">🧙 NPCs</h4>' +
    '<div class="enemy-list">' + r.npcs.map(n => '<button type="button" class="npc-card" data-npc="' + n.id + '"><span class="enemy-icon">' + n.icon + '</span><h4>' + escapeHtml(n.name) + '</h4><p>' + escapeHtml(n.description) + '</p></button>').join("") + '</div>' +
  '</div>';
}

async function openNPC(npcId) {
  const charId = window._worldCharId;
  const data = await (await apiFetch(WORLD_URL + "/" + charId + "/npc/" + npcId)).json();
  if (data.error) return showToast(data.error, true);
  const list = $("world-list");
  let html = '<div class="npc-detail">' +
    '<button type="button" class="cancel" id="back-to-region" style="margin-bottom:15px">← Voltar</button>' +
    '<div class="npc-header-big"><span class="npc-icon-big">' + data.npc.icon + '</span><h3>' + escapeHtml(data.npc.name) + '</h3></div>' +
    '<div class="npc-dialogue">"' + escapeHtml(data.dialogue) + '"</div>';
  if (data.quests.length) {
    html += '<h4 style="color:var(--gold);margin:15px 0 8px">📜 Missões</h4><div>';
    html += data.quests.map(q => '<div class="quest-card"><div class="quest-icon">' + q.icon + '</div><div class="quest-info"><h4>' + escapeHtml(q.name) + '</h4><p>' + escapeHtml(q.description) + '</p><div class="quest-rewards">🪙 ' + (q.rewards.souls || 0) + ' almas' + (q.rewards.items ? ' • 🎁 ' + q.rewards.items.length + ' itens' : '') + '</div></div><button type="button" class="equip-btn" data-accept-quest="' + q.id + '">Aceitar</button></div>').join("");
    html += '</div>';
  }
  if (data.shop.length) {
    html += '<h4 style="color:var(--gold);margin:15px 0 8px">🛒 Loja</h4><div class="shop-list">';
    html += data.shop.map(s => '<div class="shop-item"><span class="shop-icon">' + s.icon + '</span><div class="shop-info"><h4>' + escapeHtml(s.name) + '</h4><small>' + (RARITY_LABEL[s.rarity] || "") + '</small></div><div class="shop-price">🪙 ' + s.price + '</div><button type="button" class="equip-btn" data-buy="' + s.key + '" data-price="' + s.price + '" data-npc="' + npcId + '">Comprar</button></div>').join("");
    html += '</div>';
  }
  if (data.spells && data.spells.length) {
    html += '<h4 style="color:var(--gold);margin:15px 0 8px">✨ Ensinar Magias</h4><div class="shop-list">';
    html += data.spells.map(s => '<div class="shop-item"><span class="shop-icon">' + s.icon + '</span><div class="shop-info"><h4>' + escapeHtml(s.name) + '</h4><small>💠 ' + s.cost + ' FP</small></div><button type="button" class="equip-btn" data-learn-npc="' + s.key + '" data-npc="' + npcId + '">Aprender (1500)</button></div>').join("");
    html += '</div>';
  }
  html += '</div>';
  list.innerHTML = html;
}

// ===== MISSÕES =====
async function openQuestsModal(characterId) {
  const quests = await (await apiFetch(WORLD_URL + "/" + characterId + "/quests")).json();
  const list = $("quests-list");
  const statusLabel = { available: "Disponível", active: "Ativa", completed: "✅ Completar", claimed: "✔️ Reclamada" };
  list.innerHTML = quests.map(q => {
    const isActive = q.status === "active";
    const isClaimable = q.status === "completed";
    return '<div class="quest-card ' + q.status + '">' +
      '<div class="quest-icon">' + q.icon + '</div>' +
      '<div class="quest-info"><h4>' + escapeHtml(q.name) + '</h4><p>' + escapeHtml(q.description) + '</p>' +
      '<div class="quest-rewards">🪙 ' + (q.rewards.souls || 0) + ' almas' + (q.rewards.items ? ' • 🎁 ' + q.rewards.items.length + ' itens' : '') + '</div>' +
      '<span class="quest-status">' + (statusLabel[q.status] || q.status) + '</span></div>' +
      (q.status === "available" ? '<button type="button" class="equip-btn" data-accept-quest="' + q.id + '">Aceitar</button>' : '') +
      (isClaimable ? '<button type="button" class="equip-btn" data-claim-quest="' + q.id + '">🎁 Resgatar</button>' : '') +
    '</div>';
  }).join("");
  $("quests-modal").classList.remove("hidden");
  window._questsCharId = characterId;
}

// ===== ITEM ACTIONS =====
async function doEquip(itemId) {
  const data = await (await apiFetch(GAME_URL + "/" + invState.characterId + "/items/" + itemId + "/equip", { method: "POST" })).json();
  if (data.error) return showToast(data.error, true);
  showToast(data.message);
  refreshInventory(invState.characterId, invState.characterName);
}
async function doUnequip(itemId) {
  const data = await (await apiFetch(GAME_URL + "/" + invState.characterId + "/items/" + itemId + "/unequip", { method: "POST" })).json();
  if (data.error) return showToast(data.error, true);
  showToast(data.message);
  refreshInventory(invState.characterId, invState.characterName);
}
async function doSell(itemId) {
  if (!confirm("Vender?")) return;
  const data = await (await apiFetch(GAME_URL + "/" + invState.characterId + "/items/" + itemId + "/sell", { method: "POST" })).json();
  if (data.error) return showToast(data.error, true);
  showToast(data.message);
  refreshInventory(invState.characterId, invState.characterName);
}

// ============================================================
//  EVENT DELEGATION
// ============================================================
document.addEventListener("click", async function(e) {
  const target = e.target.closest("button, .class-option, .enemy-card, .levelup-attr, .tab-btn, .difficulty-option, .inv-tab, .forge-tab, .spell-slot, .region-card, .npc-card");
  if (!target) return;

  try {
    // Dificuldade
    if (target.classList.contains("difficulty-option")) {
      e.preventDefault();
      document.querySelectorAll(".difficulty-option").forEach(o => o.classList.remove("selected"));
      target.classList.add("selected");
      selectedDifficulty = target.dataset.diff;
      $("difficulty").value = selectedDifficulty;
      return;
    }
    // Classe
    if (target.classList.contains("class-option")) {
      e.preventDefault();
      selectClass(target.dataset.class);
      return;
    }
    // Attr +/-
    if (target.classList.contains("attr-btn")) {
      e.preventDefault();
      changeAttr(target.dataset.attr, parseInt(target.dataset.delta));
      return;
    }
    // Reset pontos
    if (target.id === "reset-points") { e.preventDefault(); if (selectedClass) selectClass(selectedClass); return; }
    // Cancelar form
    if (target.id === "cancel-btn") { e.preventDefault(); resetForm(); return; }
    // Ranking
    if (target.id === "show-ranking-btn") { e.preventDefault(); await showRanking(); return; }

    // Card actions
    const act = target.dataset.act;
    if (act) {
      e.preventDefault();
      const id = parseInt(target.dataset.id);
      if (act === "edit") await handleEdit(id);
      else if (act === "remove") await handleRemove(id);
      else if (act === "rest") await handleRest(id);
      else if (act === "fight") await handleFight(id);
      else if (act === "inventory") await handleInventory(id, target.dataset.name);
      else if (act === "spells") await openSpellsModal(id);
      else if (act === "forge") await openForge(id);
      else if (act === "world") await openWorldModal(id);
      else if (act === "quests") await openQuestsModal(id);
      else if (act === "levelup") await handleLevelUp(id);
      return;
    }

    // Tabs inimigo
    if (target.classList.contains("tab-btn")) { e.preventDefault(); showEnemyTab(target.dataset.tab); return; }
    if (target.classList.contains("enemy-card") && !target.dataset.regionFight) {
      e.preventDefault();
      await startBattle(window.currentBattleCharId, target.dataset.enemyName, target.dataset.enemyIcon, target.dataset.enemyBoss === "true");
      return;
    }
    if (target.dataset.regionFight) {
      e.preventDefault();
      await startBattle(window._worldCharId, target.dataset.regionFight, "👾", target.dataset.regionBoss === "true");
      $("world-modal").classList.add("hidden");
      return;
    }
    if (target.dataset.npc) {
      e.preventDefault();
      await openNPC(target.dataset.npc);
      return;
    }
    if (target.dataset.regionId) {
      e.preventDefault();
      await enterRegion(target.dataset.regionId);
      return;
    }
    if (target.id === "back-to-world") { e.preventDefault(); await openWorldModal(window._worldCharId); return; }

    // NPC buy/learn
    if (target.dataset.buy) {
      e.preventDefault();
      const data = await (await apiFetch(WORLD_URL + "/" + window._worldCharId + "/npc/" + target.dataset.npc + "/buy", { method: "POST", body: JSON.stringify({ key: target.dataset.buy, price: parseInt(target.dataset.price) }) })).json();
      if (data.error) return showToast(data.error, true);
      showToast(data.message);
      await openNPC(target.dataset.npc);
      return;
    }
    if (target.dataset.learnNpc) {
      e.preventDefault();
      const data = await (await apiFetch(WORLD_URL + "/" + window._worldCharId + "/npc/" + target.dataset.npc + "/learn/" + target.dataset.learnNpc, { method: "POST" })).json();
      if (data.error) return showToast(data.error, true);
      showToast(data.message);
      await openNPC(target.dataset.npc);
      return;
    }

    // Quests
    if (target.dataset.acceptQuest) {
      e.preventDefault();
      const charId = window._worldCharId || window._questsCharId;
      const data = await (await apiFetch(WORLD_URL + "/" + charId + "/quest/" + target.dataset.acceptQuest + "/accept", { method: "POST" })).json();
      if (data.error) return showToast(data.error, true);
      showToast(data.message);
      return;
    }
    if (target.dataset.claimQuest) {
      e.preventDefault();
      const charId = window._worldCharId || window._questsCharId;
      const data = await (await apiFetch(WORLD_URL + "/" + charId + "/quest/" + target.dataset.claimQuest + "/claim", { method: "POST" })).json();
      if (data.error) return showToast(data.error, true);
      showToast(data.message);
      await openQuestsModal(charId);
      return;
    }

    // Level up
    if (target.classList.contains("levelup-attr")) { e.preventDefault(); await doLevelUp(target.dataset.attr); return; }

    // Battle
    if (target.classList.contains("action-btn")) { e.preventDefault(); await doAction(target.dataset.action, target); return; }
    if (target.classList.contains("spell-slot") && target.dataset.cast && !target.disabled) {
      e.preventDefault();
      window._castSpellKey = target.dataset.cast;
      await doAction("cast", target);
      window._castSpellKey = null;
      return;
    }

    // Inventário
    if (target.classList.contains("inv-tab")) {
      e.preventDefault();
      document.querySelectorAll(".inv-tab").forEach(t => t.classList.remove("active"));
      target.classList.add("active");
      invState.tab = target.dataset.tab;
      renderInventory();
      return;
    }
    if (target.dataset.itemAct) {
      e.preventDefault();
      const itemId = parseInt(target.dataset.itemId);
      if (target.dataset.itemAct === "equip") await doEquip(itemId);
      else if (target.dataset.itemAct === "unequip") await doUnequip(itemId);
      else if (target.dataset.itemAct === "sell") await doSell(itemId);
      return;
    }
    if (target.dataset.learn) {
      e.preventDefault();
      const data = await (await apiFetch(SPELLS_URL + "/" + currentInventoryId + "/learn/" + target.dataset.learn, { method: "POST" })).json();
      if (data.error) return showToast(data.error, true);
      showToast(data.message);
      await refreshInventory(currentInventoryId, currentInventoryName);
      return;
    }
    if (target.dataset.equipSpell) {
      e.preventDefault();
      const data = await (await apiFetch(SPELLS_URL + "/" + currentInventoryId + "/equip-spell/" + target.dataset.equipSpell, { method: "POST" })).json();
      if (data.error) return showToast(data.error, true);
      showToast(data.message);
      await openSpellsModal(currentInventoryId);
      return;
    }
    if (target.dataset.unequipSpell) {
      e.preventDefault();
      const data = await (await apiFetch(SPELLS_URL + "/" + currentInventoryId + "/unequip-spell/" + target.dataset.unequipSpell, { method: "POST" })).json();
      if (data.error) return showToast(data.error, true);
      showToast(data.message);
      await openSpellsModal(currentInventoryId);
      return;
    }

    // Forja
    if (target.dataset.craft) { e.preventDefault(); await doCraft(target.dataset.craft); return; }
    if (target.dataset.upgrade) { e.preventDefault(); await doUpgrade(parseInt(target.dataset.upgrade)); return; }
    if (target.dataset.infuse) { e.preventDefault(); await doInfuse(parseInt(target.dataset.infuse), target.dataset.infusion); return; }
    if (target.classList.contains("forge-tab")) {
      e.preventDefault();
      document.querySelectorAll(".forge-tab").forEach(t => t.classList.remove("active"));
      target.classList.add("active");
      forgeState.tab = target.dataset.forgeTab;
      await renderForge();
      return;
    }

    // Fechar modais
    const id = target.id;
    if (id === "close-enemy-btn") { e.preventDefault(); $("enemy-modal").classList.add("hidden"); }
    else if (id === "close-battle-btn") { e.preventDefault(); $("battle-modal").classList.add("hidden"); currentBattle = null; fetchCharacters(); }
    else if (id === "close-inventory-btn") { e.preventDefault(); $("inventory-modal").classList.add("hidden"); fetchCharacters(); }
    else if (id === "close-spells-btn") { e.preventDefault(); $("spells-modal").classList.add("hidden"); }
    else if (id === "close-forge-btn") { e.preventDefault(); $("forge-modal").classList.add("hidden"); fetchCharacters(); }
    else if (id === "close-world-btn") { e.preventDefault(); $("world-modal").classList.add("hidden"); fetchCharacters(); }
    else if (id === "close-quests-btn") { e.preventDefault(); $("quests-modal").classList.add("hidden"); fetchCharacters(); }
    else if (id === "close-levelup-btn") { e.preventDefault(); $("levelup-modal").classList.add("hidden"); fetchCharacters(); }
    else if (id === "close-ranking-btn") { e.preventDefault(); $("ranking-modal").classList.add("hidden"); }
    else if (id === "close-loot-btn") { e.preventDefault(); $("loot-modal").classList.add("hidden"); }
  } catch (err) {
    console.error(err);
    showToast(err.message || "Erro", true);
  }
});

// Submit
const form = $("character-form");
if (form) form.addEventListener("submit", async function(e) {
  e.preventDefault();
  const id = $("character-id").value;
  if (id) {
    try { await updateCharacter(id, { name: $("name").value.trim() }); showToast("⚔️ Atualizado!"); resetForm(); fetchCharacters(); }
    catch (err) { showToast(err.message, true); }
    return;
  }
  const data = getFormData();
  if (!data.name || data.name.length < 2) return showToast("Nome: 2+ caracteres!", true);
  if (!data.class) return showToast("Escolha classe!", true);
  const base = CLASSES[data.class];
  const spent = ATTRS.reduce((s, a) => s + (data[a] - base[a]), 0);
  if (spent !== FREE_POINTS) return showToast("Gaste exatamente " + FREE_POINTS + " pontos", true);
  try {
    await createCharacter(data);
    showToast("🔥 Fogueira acesa!");
    resetForm(); fetchCharacters();
  } catch (err) { showToast(err.message, true); }
});

// Ranking (simplificado)
async function showRanking() {
  const chars = await (await apiFetch(GAME_URL + "/ranking")).json();
  const list = $("ranking-list");
  if (!chars.length) list.innerHTML = '<p class="loading">Nenhuma alma.</p>';
  else list.innerHTML = chars.map((c, i) => '<div class="rank-item"><div class="rank-pos">' + (i + 1) + 'º</div><div class="rank-avatar">' + (CLASS_ICONS[c.class] || "❓") + '</div><div class="rank-info"><h4>' + escapeHtml(c.name) + '</h4><small>' + c.class + ' • Nv ' + c.level + '</small></div><div class="rank-souls">🪙 ' + c.souls.toLocaleString("pt-BR") + '</div></div>').join("");
  $("ranking-modal").classList.remove("hidden");
}

updatePointsUI();
fetchCharacters();
console.log("✅ Dark Souls v13 carregado");

// ==== MAP SYSTEM ====
const MAP_URL = "http://localhost:3000/api/map";
let mapState = { characterId: null, nodes: [], currentNodeId: null, currentNodeData: null };

async function openMap(characterId) {
  mapState.characterId = characterId;
  const res = await fetch(MAP_URL + "/" + characterId + "/map");
  const data = await res.json();
  if (data.error) return showToast(data.error, true);
  mapState.nodes = data.nodes;
  mapState.currentNodeId = data.currentNodeId;

  document.getElementById("map-info").innerHTML =
    "🧭 <b>" + data.character.name + "</b> (Nv " + data.character.level + ") • " +
    "📍 " + data.visitedCount + "/" + data.totalNodes + " locais visitados";

  renderMap();
  document.getElementById("map-modal").classList.remove("hidden");
}

function renderMap() {
  const canvas = document.getElementById("map-canvas");
  canvas.innerHTML = "";
  
  // SVG para as linhas
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "map-svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  
  // Desenha as conexões
  mapState.nodes.forEach(n => {
    n.connections.forEach(cid => {
      const target = mapState.nodes.find(x => x.id === cid);
      if (!target) return;
      // Só desenha uma vez (para não duplicar)
      if (n.id > cid) return;
      
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", n.x);
      line.setAttribute("y1", n.y);
      line.setAttribute("x2", target.x);
      line.setAttribute("y2", target.y);
      line.setAttribute("stroke", (n.visited || target.visited) ? "#d4a017" : "#3a2f22");
      line.setAttribute("stroke-width", "0.5");
      line.setAttribute("stroke-dasharray", (n.visited && target.visited) ? "0" : "2,2");
      line.setAttribute("opacity", (n.visited || target.visited) ? "0.6" : "0.3");
      svg.appendChild(line);
    });
  });
  
  canvas.appendChild(svg);
  
  // Desenha os nós
  mapState.nodes.forEach(n => {
    const nodeEl = document.createElement("div");
    nodeEl.className = "map-node";
    nodeEl.style.left = n.x + "%";
    nodeEl.style.top = n.y + "%";
    nodeEl.dataset.nodeId = n.id;
    
    if (n.isCurrent) nodeEl.classList.add("current");
    if (n.locked) nodeEl.classList.add("locked");
    if (!n.visited && !n.isCurrent) nodeEl.classList.add("unvisited");
    if (n.hasBoss) nodeEl.classList.add("boss-node");
    if (n.hasNPC) nodeEl.classList.add("npc-node");
    
    let badge = "";
    if (n.hasBoss) badge = '<span class="node-badge">👹</span>';
    else if (n.hasNPC) badge = '<span class="node-badge">💬</span>';
    else if (n.enemyCount > 0) badge = '<span class="node-badge">⚔️</span>';
    
    nodeEl.innerHTML = 
      badge +
      '<span class="node-icon">' + n.icon + '</span>' +
      '<span class="node-name">' + escapeHtml(n.name) + '</span>';
    
    if (n.isCurrent) {
      nodeEl.innerHTML += '<span class="node-you">VOCÊ</span>';
    }
    
    nodeEl.title = n.name + (n.locked ? " (Bloqueado - Nv " + n.minLevel + ")" : "");
    
    canvas.appendChild(nodeEl);
  });
}

async function showNodeDetail(nodeId) {
  const res = await fetch(MAP_URL + "/" + mapState.characterId + "/map/node/" + nodeId);
  const data = await res.json();
  if (data.error) return showToast(data.error, true);
  mapState.currentNodeData = data;
  
  const detail = document.getElementById("map-detail");
  const n = data.node;
  
  let html = '<div class="node-detail-header">' +
    '<span class="node-detail-icon">' + n.icon + '</span>' +
    '<div><h3>' + escapeHtml(n.name) + '</h3>' +
    '<p>' + escapeHtml(n.description) + '</p>' +
    (n.locked ? '<span class="locked-tag">🔒 Nível ' + n.minLevel + '+</span>' : '') +
    '</div>' +
    '<button type="button" class="cancel" id="close-node-detail">✖</button>' +
  '</div>';
  
  if (n.locked) {
    html += '<p class="node-warning">Você precisa ser nível ' + n.minLevel + ' para entrar aqui.</p>';
  } else if (nodeId !== mapState.currentNodeId) {
    // Verifica se está conectado ao atual
    const currentNode = mapState.nodes.find(x => x.id === mapState.currentNodeId);
    const canTravel = currentNode && currentNode.connections.includes(nodeId);
    
    if (canTravel) {
      html += '<button type="button" class="travel-btn" data-travel="' + nodeId + '">🧭 Viajar para cá</button>';
    } else {
      html += '<p class="node-warning">🚫 Você não tem caminho direto daqui.</p>';
    }
  } else {
    html += '<p class="node-current">📍 Você está aqui.</p>';
    
    // Inimigos
    if (data.enemies && data.enemies.length > 0) {
      html += '<h4 style="color:#ff6060;margin:15px 0 8px">⚔️ Inimigos</h4><div class="node-enemy-list">';
      data.enemies.forEach(e => {
        if (e.defeated) {
          html += '<button type="button" class="node-enemy defeated" disabled><span>' + e.icon + '</span>' + escapeHtml(e.name) + '<small>✅ Derrotado</small></button>';
        } else {
          html += '<button type="button" class="node-enemy" data-fight-enemy="' + escapeHtml(e.name) + '"><span>' + e.icon + '</span>' + escapeHtml(e.name) + '<small>❤️ ' + e.hp + ' • 🪙 ' + e.soulReward + '</small></button>';
        }
      });
      html += '</div>';
    }
    
    // Boss
    if (data.boss) {
      const b = data.boss;
      html += '<h4 style="color:#ffd700;margin:15px 0 8px">👹 Boss</h4><div class="node-enemy-list">';
      if (b.defeated) {
        html += '<button type="button" class="node-enemy boss defeated" disabled><span>' + b.icon + '</span>' + escapeHtml(b.name) + '<small>✅ Derrotado</small></button>';
      } else {
        html += '<button type="button" class="node-enemy boss" data-fight-enemy="' + escapeHtml(b.name) + '"><span>' + b.icon + '</span>' + escapeHtml(b.name) + '<small>❤️ ' + b.hp + ' • 🪙 ' + b.soulReward + '</small></button>';
      }
      html += '</div>';
    }
    
    // NPC
    if (data.npc) {
      const npc = data.npc;
      html += '<h4 style="color:#d0a0ff;margin:15px 0 8px">🧙 NPC</h4>';
      html += '<button type="button" class="npc-btn" data-talk-npc="' + npc.id + '"><span>' + npc.icon + '</span>' + escapeHtml(npc.name) + '<small>' + escapeHtml(npc.description) + '</small></button>';
    }
  }
  
  // Caminhos disponíveis
  if (n.connections && n.connections.length) {
    html += '<h4 style="color:var(--gold);margin:15px 0 8px">🚪 Caminhos</h4><div class="node-connections">';
    n.connections.forEach(conn => {
      if (conn.locked) {
        html += '<div class="conn locked">🔒 ' + conn.icon + ' ' + escapeHtml(conn.name) + ' (Nv ' + conn.minLevel + ')</div>';
      } else if (conn.id === mapState.currentNodeId) {
        html += '<div class="conn current">📍 ' + conn.icon + ' ' + escapeHtml(conn.name) + '</div>';
      } else {
        html += '<div class="conn">' + conn.icon + ' ' + escapeHtml(conn.name) + '</div>';
      }
    });
    html += '</div>';
  }
  
  detail.innerHTML = html;
  detail.classList.remove("hidden");
}

async function travelTo(nodeId) {
  const res = await fetch(MAP_URL + "/" + mapState.characterId + "/map/travel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nodeId }),
  });
  const data = await res.json();
  if (data.error) return showToast(data.error, true);
  showToast(data.message);
  mapState.currentNodeId = data.currentNodeId;
  // Recarrega mapa
  await openMap(mapState.characterId);
  await showNodeDetail(nodeId);
}

async function fightNodeEnemy(enemyName) {
  const res = await fetch(MAP_URL + "/" + mapState.characterId + "/map/fight/" + encodeURIComponent(enemyName), {
    method: "POST",
  });
  const data = await res.json();
  if (data.error) return showToast(data.error, true);
  
  // Fecha o mapa e abre a batalha
  document.getElementById("map-modal").classList.add("hidden");
  
  currentBattle = { characterId: mapState.characterId, bossId: data.boss.id };
  currentEnemyIsBoss = data.isBoss;
  window._mapBattle = { enemyName, isBoss: data.isBoss };
  
  document.getElementById("battle-modal").classList.remove("hidden");
  document.getElementById("battle-title").textContent = "⚔️ " + data.character.name + " vs " + data.boss.name;
  document.getElementById("battle-log").innerHTML = '<p class="player">' + data.message + '</p>';
  document.getElementById("battle-result").classList.add("hidden");
  document.getElementById("battle-actions").classList.remove("hidden");
  document.getElementById("boss-avatar").textContent = data.icon || "👹";
  document.getElementById("player-avatar").textContent = CLASS_ICONS[data.character.class] || "🛡️";
  updateBattleUI(data.character, data.boss);
}

// Marca inimigo como derrotado (chamado após vitória)
async function markEnemyDefeated(enemyName) {
  if (!mapState.characterId) return;
  await fetch(MAP_URL + "/" + mapState.characterId + "/map/mark/" + encodeURIComponent(enemyName), { method: "POST" });
}

// Event listener para o mapa
document.addEventListener("click", async function(e) {
  const target = e.target.closest("button, .map-node, .node-enemy, .npc-btn");
  if (!target) return;
  
  // Botão mapa no card
  if (target.dataset.act === "map") {
    e.preventDefault();
    await openMap(parseInt(target.dataset.id));
    return;
  }
  
  // Fechar mapa
  if (target.id === "close-map-btn") {
    e.preventDefault();
    document.getElementById("map-modal").classList.add("hidden");
    document.getElementById("map-detail").classList.add("hidden");
    return;
  }
  
  // Fechar detalhe
  if (target.id === "close-node-detail") {
    e.preventDefault();
    document.getElementById("map-detail").classList.add("hidden");
    return;
  }
  
  // Clicou num nó
  if (target.classList.contains("map-node")) {
    e.preventDefault();
    await showNodeDetail(target.dataset.nodeId);
    return;
  }
  
  // Viajar
  if (target.dataset.travel) {
    e.preventDefault();
    await travelTo(target.dataset.travel);
    return;
  }
  
  // Lutar contra inimigo do nó
  if (target.dataset.fightEnemy) {
    e.preventDefault();
    await fightNodeEnemy(target.dataset.fightEnemy);
    return;
  }
  
  // Falar com NPC
  if (target.dataset.talkNpc) {
    e.preventDefault();
    window._worldCharId = mapState.characterId;
    await openNPC(target.dataset.talkNpc);
    return;
  }
});

window.openMap = openMap;
// ==== FIM MAP ====

// ===== Handler seguro para botão MAPA =====
document.addEventListener("click", function(e) {
  var btn = e.target.closest("[data-act='map']");
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  var idStr = btn.getAttribute("data-id");
  if (!idStr) { showToast("Botão sem ID", true); return; }
  var id = parseInt(idStr);
  if (isNaN(id)) { showToast("ID inválido", true); return; }
  openMap(id);
}, true);

// ===== Handler para botões de combate do mapa =====
document.addEventListener("click", async function(e) {
  var btn = e.target.closest("[data-fight-enemy]");
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  var name = btn.getAttribute("data-fight-enemy");
  if (!name) return;
  await fightNodeEnemy(name);
}, true);

// ===== Handler para viajar =====
document.addEventListener("click", async function(e) {
  var btn = e.target.closest("[data-travel]");
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  var nodeId = btn.getAttribute("data-travel");
  if (!nodeId) return;
  await travelTo(nodeId);
}, true);
