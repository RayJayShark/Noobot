const commando = require("discord.js-commando");

module.exports = class SkipCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "pause",
      group: "util",
      memberName: "pause",
      description: ""
    });
  }

  run(message) {
    const server = servers[message.guild.id];
    server.dispatcher.pause();
  }
};
