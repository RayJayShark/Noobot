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
    models.Server.findOrCreate({
      where: { guildId: message.guild.id }
    }).then(([server]) => {
      models.Queue.findOne({
        where: { serverId: server.id },
        include: "songs"
      }).then(queue => {
        let totalLength = 0;
        const embed = new Discord.RichEmbed().setColor("#0099ff");
        queue.get().songs.shift();
        queue.get().songs.forEach((song, index) => {
          embed.addField(
            `${index + 1}. ${song.title}`,
            `${helper.convertSeconds(song.lengthSeconds)} - [Link](${song.url})`
          );
          totalLength += song.lengthSeconds;
        });
        embed.setAuthor(
          `${
            queue.get().songs.length
          } Songs in Queue  -   ${helper.convertSeconds(totalLength)}`
        );
        message.channel.send(embed);
      });
    });
  }
};
