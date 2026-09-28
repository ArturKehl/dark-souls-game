const express = require("express");
const cors = require("cors");
const path = require("path");
const sequelize = require("./config/database");
require("./models/Character");
require("./models/Boss");
require("./models/Item");
require("./models/Material");
require("./models/WeaponUpgrade");
require("./models/QuestProgress");
require("./models/PlayerPosition");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.use("/api/characters", require("./routes/characters"));
app.use("/api/game", require("./routes/game"));
app.use("/api/spells", require("./routes/spells"));
app.use("/api/crafting", require("./routes/crafting"));
app.use("/api/world", require("./routes/world"));
app.use("/api/map", require("./routes/map"));

app.get("/api", (req, res) => res.json({ message: "API Dark Souls v14" }));

sequelize.sync({ alter: true }).then(() => {
  console.log("💀 Banco sincronizado");
  app.listen(PORT, () => console.log("⚔️  http://localhost:" + PORT));
});
