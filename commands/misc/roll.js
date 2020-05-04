const commando = require("discord.js-commando");

module.exports = class RollCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "roll",
      group: "misc",
      memberName: "roll",
      description: "Rolls 1-100 dice, defaults to 2.",
    });
  }

  async run(message, args) {
    let numOfRolls = 2;
    let results = "";
    if (args) {
      if (parseInt(args) && parseInt(args) <= 100) {
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
