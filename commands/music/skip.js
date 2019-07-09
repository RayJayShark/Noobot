const commando = require("discord.js-commando");

module.exports = class SkipCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "skip",
      group: "music",
      memberName: "skip",
      description: "Skips currently playing song."
    });
  }

  run(message) {
    const server = servers[message.guild.id];
    server.dispatcher.end();
  }
};
