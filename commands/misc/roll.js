const commando = require("discord.js-commando");
const { RichEmbed } = require("discord.js");
const helper = require("../../helpers");
const models = require("../../models");

module.exports = class PlayCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "roll",
      group: "misc",
      memberName: "roll",
      description: "Rolls 2-15 dice."
    });
  }

  async run(message, args) {
    let numOfRolls = 2;
    let results = "";
    if (args) {
      if (parseInt(args) && parseInt(args) <= 15 && parseInt(args) >= 2) {
        numOfRolls = parseInt(args);
      }
    }
    for (let i = 0; i < numOfRolls; i++) {
      results = results + Math.floor(Math.random() * 6 + 1) + ", ";
    }

    message.channel.send(
      `<@${message.author.id}> you rolled **${results.slice(0, -2)}**.`
    );
  }
};
