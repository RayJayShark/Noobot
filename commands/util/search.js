const commando = require("discord.js-commando");
const helper = require("../../helpers");
const Discord = require("discord.js");

module.exports = class SkipCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "search",
      group: "util",
      memberName: "search",
      description: ""
    });
  }

  async run(message, args) {
    const threeResults = await helper.ytSearchWithChoice(args);
    const server = await helper.retrieveServer(message.guild.id);
    const queue = await helper.retrieveQueue(server.id);
    const embed = new Discord.RichEmbed()
      .setTitle("Select a result:")
      .addField(
        `1.  ${threeResults[0].title}`,
        `${helper.convertSeconds(threeResults[0].lengthSeconds)} - [Link](${
          threeResults[0].url
        })`
      )
      .addField(
        `2.  ${threeResults[1].title}`,
        `${helper.convertSeconds(threeResults[1].lengthSeconds)} - [Link](${
          threeResults[1].url
        })`
      )
      .addField(
        `3.  ${threeResults[2].title}`,
        `${helper.convertSeconds(threeResults[2].lengthSeconds)} - [Link](${
          threeResults[2].url
        })`
      );

    const sent = await message.channel.send(embed);

    sent.react("1⃣").then(() => {
      sent.react("2⃣").then(() => {
        sent.react("3⃣");
      });
    });

    const filter = (reaction, user) => {
      return (
        ["1⃣", "2⃣", "3⃣"].includes(reaction.emoji.name) &&
        user.id === message.author.id
      );
    };

    sent
      .awaitReactions(filter, {
        max: 1,
        time: 15000,
        errors: ["time"]
      })
      .then(collected => {
        const reaction = collected.first();
        let arrIndex;
        if (reaction.emoji.name === "1⃣") {
          arrIndex = 0;
        } else if (reaction.emoji.name === "2⃣") {
          arrIndex = 1;
        } else if (reaction.emoji.name === "3⃣") {
          arrIndex = 2;
        }
        if (message.member.voiceChannel) {
          if (!message.guild.voiceConnection) {
            if (!servers[message.guild.id]) {
              servers[message.guild.id] = {};
            }
            message.member.voiceChannel.join().then(connection => {
              helper.play(connection, message);
            });
          }
          helper.songQueueJoin(threeResults[arrIndex].url, queue);
          sent.delete(1000);
        } else {
          message.reply("You need to be in a voice channel.");
        }
      })
      .catch(() => {
        sent.delete();
      });
  }
};
