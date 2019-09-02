const commando = require("discord.js-commando");
const Discord = require("discord.js");
const { RichEmbed } = require("discord.js");
const helper = require("../../helpers");
const models = require("../../models");

module.exports = class NowPlayingCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "nowplaying",
      aliases: ["np"],
      group: "music",
      memberName: "nowplaying",
      description: "Displays the current song playing with timestamp."
    });
  }

  async run(message) {
    if (!servers[message.guild.id]) {
      servers[message.guild.id] = {};
    }
    const dbserver = await helper.retrieveServer(message.guild.id);
    const queue = await helper.retrieveQueue(dbserver.id);
    if (queue.songs.length === 0) {
      message.channel
        .send("There is nothing currently playing.")
        .then(message => {
          message.delete(5000);
        });
    } else {
      const server = servers[message.guild.id];
      const twentyDashes = "▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬";
      const playingDotIndex = Math.floor(
        server.dispatcher.time /
          1000 /
          queue.songs[0].get().lengthSeconds /
          0.05
      );
      const playingBar =
        twentyDashes.slice(0, playingDotIndex) +
        "🔵" +
        twentyDashes.slice(playingDotIndex, 19);
      const embed = new Discord.RichEmbed()
        .setColor("#0099ff")
        .setTitle(`${queue.songs[0].get().title}`)
        .setURL(`${queue.songs[0].get().url}`)
        .setFooter(
          `${playingBar} ${helper.convertSeconds(
            Math.floor(server.dispatcher.time / 1000)
          )} /${helper.convertSeconds(queue.songs[0].get().lengthSeconds)}`
        );
      message.channel.send(embed).then(message => message.delete(7000));
    }
  }
};
