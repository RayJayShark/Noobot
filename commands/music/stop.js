const commando = require("discord.js-commando");
const models = require("../../models");
const helper = require("../../helpers");

module.exports = class StopCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "stop",
      group: "music",
      memberName: "stop",
      description:
        "Stops the bot, clears the queue, and leaves the voice channel."
    });
  }

  async run(message) {
    if (message.member.voiceChannel) {
      

      const dbserver = await helper.retrieveServer(message.guild.id);
      const queue = await helper.retrieveQueue(dbserver.id);
      models.SongQueue.destroy({ where: { queueId: queue.id } }).then(() => {
        this.client.manager.leave(message.guild.id);
      });
    } else {
      message.reply("You need to be in a voice channel to stop the song.");
    }
  }
};
