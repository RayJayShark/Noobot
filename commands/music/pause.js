const commando = require("discord.js-commando");

module.exports = class SkipCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "pause",
      group: "music",
      memberName: "pause",
      description: "Pauses the current playing song."
    });
  }

  run(message) {
    const server = servers[message.guild.id];
    if (!server.dispatcher.paused) {
      server.dispatcher.pause();
    } else {
      message.channel.send("I'm already paused.").then(message => message.delete(3000));
    }
  }
};
