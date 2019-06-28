const commando = require("discord.js-commando");
const Discord = require("discord.js");
const { RichEmbed } = require("discord.js");
const helper = require("../../helpers");
const models = require("../../models");

module.exports = class PlayCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "nowplaying",
      group: "util",
      memberName: "nowplaying",
      description: ""
    });
  }

  async run(message) {
    if (message.member.voiceChannel) {
      if (!servers[message.guild.id]) {
        servers[message.guild.id] = {};
      }
      const dbserver = await helper.retrieveServer(message.guild.id);
      const queue = await helper.retrieveQueue(dbserver.id);
      const server = servers[message.guild.id];
      const embed = new Discord.RichEmbed()
        .setColor("#0099ff")
        .addField(
          `${queue.songs[0].get().title}`,
          `${helper.convertSeconds(
            Math.floor(server.dispatcher.time / 1000)
          )} / ${helper.convertSeconds(
            queue.songs[0].get().lengthSeconds
          )} - [Link](${queue.songs[0].get().url})`
        );
      message.channel.send(embed).then(message => message.delete(5000));
    } else {
      message.reply("You need to be in a voice channel.");
    }
  }
};
