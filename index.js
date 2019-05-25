const path = require("path");
const Commando = require("discord.js-commando");
const sqlite = require("sqlite");
require("dotenv").config();

global.servers = {};

const client = new Commando.Client({
  commandPrefix: "#",
  owner: "92706551487291392"
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}(${client.user.id})`);
});
client.registry
  .registerDefaults()
  .registerCommandsIn(path.join(__dirname, "commands"));

client
  .setProvider(
    sqlite
      .open(path.join(__dirname, "db.sqlite3"))
      .then(db => new Commando.SQLiteProvider(db))
  )
  .catch(console.error);

client.login(process.env.DISCORD_BOT_TOKEN);
