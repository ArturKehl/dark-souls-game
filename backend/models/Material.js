const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Material = sequelize.define("Material", {
  characterId: { type: DataTypes.INTEGER, allowNull: false },
  key: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  icon: { type: DataTypes.STRING },
  rarity: { type: DataTypes.ENUM("common","rare","epic","legendary"), defaultValue: "common" },
  quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
});

module.exports = Material;
