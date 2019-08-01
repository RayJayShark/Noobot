const commando = require("discord.js-commando");
const Discord = require("discord.js");
const helper = require("../../helpers");
const models = require("../../models");

module.exports = class QueueCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "queue",
      group: "music",
      memberName: "queue",
      description: "Shows upcoming songs for a server's queue."
    });
  }

  async run(message, args) {
    const command = args.split(" ")[0].toLowerCase();
    const server = await helper.retrieveServer(message.guild.id);
    const queue = await helper.retrieveQueue(server.id);
    queue.songs.shift();

    if (command) {
      switch (command) {
        case "edit":
          helper.createPagination(queue.songs, message, false, true);
          break;
      }
    } else {
      helper.createPagination(queue.songs, message);
    }
  }
};
