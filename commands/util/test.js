const commando = require("discord.js-commando");
const { RichEmbed } = require("discord.js");
const helper = require("../../helpers");
const models = require("../../models");

module.exports = class PlayCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "test",
      group: "util",
      memberName: "test",
      description: ""
    });
  }

  async run(message, args) {
    const command = args.split(" ")[0];
    const plName = args.split(" ")[1];
    const url = args.split(" ")[2];
    const server = await helper.retrieveServer(message.guild.id);
    console.log(server);
  }
};
