const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const QuestProgress = sequelize.define("QuestProgress", {
  characterId: { type: DataTypes.INTEGER, allowNull: false },
  questId: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.ENUM("available","active","completed","claimed"), defaultValue: "available" },
  progress: { type: DataTypes.INTEGER, defaultValue: 0 },
  visitedRegions: { type: DataTypes.TEXT, defaultValue: "[]" },
});
module.exports = QuestProgress;
