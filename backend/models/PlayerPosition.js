const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PlayerPosition = sequelize.define("PlayerPosition", {
  characterId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  currentNodeId: { type: DataTypes.STRING, defaultValue: "firelink_center" },
  visitedNodes: { type: DataTypes.TEXT, defaultValue: "[]" },
  defeatedEnemies: { type: DataTypes.TEXT, defaultValue: "[]" },
  talkedNPCs: { type: DataTypes.TEXT, defaultValue: "[]" },
});

module.exports = PlayerPosition;
