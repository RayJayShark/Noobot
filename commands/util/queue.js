const commando = require("discord.js-commando");

module.exports = class PlayCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "queue",
      group: "util",
      memberName: "queue",
      description: ""
    });
  }

  async run(message, argu) {
    const server = servers[message.guild.id];
  }
};
