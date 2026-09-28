const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Boss = sequelize.define("Boss", {
  name: { type: DataTypes.STRING, allowNull: false },
  hp: { type: DataTypes.INTEGER, allowNull: false },
  maxHp: { type: DataTypes.INTEGER, allowNull: false },
  damage: { type: DataTypes.INTEGER, allowNull: false },
  soulReward: { type: DataTypes.INTEGER, allowNull: false },
  description: { type: DataTypes.STRING },
  defeated: { type: DataTypes.BOOLEAN, defaultValue: false },
  icon: { type: DataTypes.STRING },
  isBoss: { type: DataTypes.BOOLEAN, defaultValue: false },
  burn: { type: DataTypes.INTEGER, defaultValue: 0 },
  bleed: { type: DataTypes.INTEGER, defaultValue: 0 },
  stunned: { type: DataTypes.INTEGER, defaultValue: 0 },
  buffDamage: { type: DataTypes.INTEGER, defaultValue: 0 },
  turnCount: { type: DataTypes.INTEGER, defaultValue: 0 },
});
module.exports = Boss;
