const commando = require("discord.js-commando");
const helper = require("../../helpers");

module.exports = class QueueCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "queue",
      group: "util",
      memberName: "queue",
      description: ""
    });
  }

  async run(message) {
    const server = servers[message.guild.id];
    const urls = await helper.processTitles(server.queue);
    const array2 = urls.splice(Math.round(urls.length / 2));
    message.channel.send(urls);
    message.channel.send(array2);
  }
};
