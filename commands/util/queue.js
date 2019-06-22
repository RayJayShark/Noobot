const commando = require("discord.js-commando");
const Discord = require("discord.js");
const YTDL = require("ytdl-core");
const helper = require("../../helpers");

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
    const server = servers[message.guild.id];
    let embed;
    if (server.queue.length === 0) {
      embed = new Discord.RichEmbed()
        .setColor("#ff0000")
        .setAuthor("There are no other songs after this.");
    } else if (server.queue.length <= 5 && server.queue.length >= 1) {
      embed = new Discord.RichEmbed()
        .setColor("#0099ff")
        .setAuthor(`There's ${server.queue.length} songs coming up:`);

      server.queue.forEach((url, index) => {
        YTDL.getBasicInfo(url, (err, info) => {
          embed.addField(
            `${index + 1}. ${info.title}`,
            `${helper.convertSeconds(info.length_seconds)}`
          );
        });
      });
    } else if (server.queue.length > 5) {
      embed = new Discord.RichEmbed()
        .setColor("#0099ff")
        .setAuthor(
          `The Queue Currently Has ${
            server.queue.length
          } Songs in It.\nHere's the next 5 Songs in the Queue:`
        );
      const firstFive = server.queue.slice(0, 5);
      firstFive.forEach((url, index) => {
        YTDL.getBasicInfo(url, (err, info) => {
          embed.addField(
            `${index + 1}. ${info.title}`,
            `${helper.convertSeconds(info.length_seconds)}`
          );
        });
      });
    }

    setTimeout(() => {
      message.channel.send(embed).then(r => r.delete(7000));
    }, 1500);
  }
};
