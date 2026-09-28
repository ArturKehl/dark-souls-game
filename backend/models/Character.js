const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Character = sequelize.define("Character", {
  userId: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 1 },
  name: { type: DataTypes.STRING, allowNull: false },
  class: { type: DataTypes.ENUM("Knight","Warrior","Sorcerer","Pyromancer","Cleric","Thief","Deprived"), allowNull: false },
  difficulty: { type: DataTypes.ENUM("normal","hard","darksouls","ironman"), defaultValue: "normal" },
  level: { type: DataTypes.INTEGER, defaultValue: 1 },
  vitality: { type: DataTypes.INTEGER, defaultValue: 10 },
  strength: { type: DataTypes.INTEGER, defaultValue: 10 },
  dexterity: { type: DataTypes.INTEGER, defaultValue: 10 },
  intelligence: { type: DataTypes.INTEGER, defaultValue: 10 },
  souls: { type: DataTypes.INTEGER, defaultValue: 0 },
  humanity: { type: DataTypes.INTEGER, defaultValue: 0 },
  alive: { type: DataTypes.BOOLEAN, defaultValue: true },
  hp: { type: DataTypes.INTEGER, defaultValue: 100 },
  maxHp: { type: DataTypes.INTEGER, defaultValue: 100 },
  stamina: { type: DataTypes.INTEGER, defaultValue: 100 },
  maxStamina: { type: DataTypes.INTEGER, defaultValue: 100 },
  fp: { type: DataTypes.INTEGER, defaultValue: 50 },
  maxFp: { type: DataTypes.INTEGER, defaultValue: 50 },
  estus: { type: DataTypes.INTEGER, defaultValue: 3 },
  maxEstus: { type: DataTypes.INTEGER, defaultValue: 3 },
  pointsSpent: { type: DataTypes.INTEGER, defaultValue: 0 },
  hollowingLevel: { type: DataTypes.INTEGER, defaultValue: 0 },
  deathsTotal: { type: DataTypes.INTEGER, defaultValue: 0 },
  cursed: { type: DataTypes.BOOLEAN, defaultValue: false },
  lastBonfire: { type: DataTypes.STRING, defaultValue: "Firelink Shrine" },
  bossesKilled: { type: DataTypes.TEXT, defaultValue: "[]" },
  totalKills: { type: DataTypes.INTEGER, defaultValue: 0 },
  knownSpells: { type: DataTypes.TEXT, defaultValue: "[]" },
  equippedSpells: { type: DataTypes.TEXT, defaultValue: "[]" },
});
Character.beforeSave((char) => {
  const curseFactor = char.cursed ? 0.5 : 1.0;
  const baseHp = 40 + (char.vitality * 4) + (char.level * 8);
  char.maxHp = Math.floor(baseHp * curseFactor);
  char.maxStamina = 50 + (char.dexterity * 3) + (char.level * 3);
  char.maxFp = 30 + (char.intelligence * 3) + (char.level * 2);
  if (char.hp > char.maxHp) char.hp = char.maxHp;
  if (char.stamina > char.maxStamina) char.stamina = char.maxStamina;
  if (char.fp > char.maxFp) char.fp = char.maxFp;
  if (char.estus > char.maxEstus) char.estus = char.maxEstus;
});
module.exports = Character;

