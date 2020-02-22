const commando = require("discord.js-commando");

module.exports = class PruneCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "prune",
      group: "misc",
      memberName: "prune",
      description: "Mass deletes 1-100 Messages at a time."
    });
  }

  async run(message, args) {
    let amountToPrune = 1;
    if (parseInt(args) && parseInt(args) < 100 && parseInt(args) >= 1) {
      amountToPrune = parseInt(args) + 1;
    }

    if (parseInt(args) >= 100) amountToPrune = 100;

    await message.channel
      .fetchMessages({ limit: amountToPrune })
      .then(messages => message.channel.bulkDelete(messages));
  }
};
