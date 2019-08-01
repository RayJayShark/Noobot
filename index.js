const path = require("path");
const Commando = require("discord.js-commando");
const sqlite = require("sqlite");
const Sequelize = require("sequelize");
require("dotenv").config();

global.servers = {};

global.sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "database.sqlite"
});

const client = new Commando.Client({
  commandPrefix: "?",
  owner: "92706551487291392",
  disableEveryone: true,
  unknownCommandResponse: false
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}(${client.user.id})`);
});
client.registry
    .registerDefaultTypes()
    .registerGroups([
        ['music', 'Music commands'],
        ['misc', 'Miscellaneous commands']
    ])
    .registerDefaultGroups()
    .registerDefaultCommands()
    .registerCommandsIn(path.join(__dirname, 'commands'));

client
  .setProvider(
    sqlite
      .open(path.join(__dirname, "commando.sqlite3"))
      .then(db => new Commando.SQLiteProvider(db))
  )
  .catch(console.error);

client.login(process.env.DISCORD_BOT_TOKEN);
