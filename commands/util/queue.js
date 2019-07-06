const commando = require("discord.js-commando");
const Discord = require("discord.js");
const helper = require("../../helpers");
const models = require("../../models");

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
    const server = await helper.retrieveServer(message.guild.id);
    const queue = await helper.retrieveQueue(server.id);
    queue.songs.shift();
    helper.createPagination(queue.songs, message);
  }
};
