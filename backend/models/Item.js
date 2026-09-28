const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Item = sequelize.define("Item", {
  characterId: { type: DataTypes.INTEGER, allowNull: false },
  itemKey: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.ENUM("weapon", "armor", "ring", "scroll"), allowNull: false },
  rarity: { type: DataTypes.ENUM("common", "rare", "epic", "legendary"), defaultValue: "common" },
  icon: { type: DataTypes.STRING },
  damage: { type: DataTypes.INTEGER, defaultValue: 0 },
  defense: { type: DataTypes.INTEGER, defaultValue: 0 },
  hpBonus: { type: DataTypes.INTEGER, defaultValue: 0 },
  strengthBonus: { type: DataTypes.INTEGER, defaultValue: 0 },
  description: { type: DataTypes.STRING },
  equipped: { type: DataTypes.BOOLEAN, defaultValue: false },
  startingKit: { type: DataTypes.BOOLEAN, defaultValue: false },
  requirements: { type: DataTypes.TEXT, defaultValue: "{}" },
  spellKey: { type: DataTypes.STRING, allowNull: true },
  favorite: { type: DataTypes.BOOLEAN, defaultValue: false },
});
module.exports = Item;
