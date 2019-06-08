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
    if (server.queue.length < 50) {
      const urls = await helper.processTitles(server.queue);
      if (urls.length <= 25) {
        message.channel.send(urls);
      } else if (urls.length > 25 && urls.length < 50) {
        const splitArray = urls.splice(Math.round(urls.length / 2));
        message.author.send(urls);
        message.author.send(splitArray);
      }
    } else if (server.queue.length > 50) {
      message.channel.send(
        `The queue currently has ${
          server.queue.length
        } songs in it. I cannot post the entire list.`
      );
    }
  }
};
