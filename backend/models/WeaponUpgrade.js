const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const WeaponUpgrade = sequelize.define("WeaponUpgrade", {
  itemId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  upgradeLevel: { type: DataTypes.INTEGER, defaultValue: 0 }, // 0 a +3
  infusedWith: { type: DataTypes.STRING, allowNull: true },   // ex: "fire", "magic", "lightning"
});

module.exports = WeaponUpgrade;
