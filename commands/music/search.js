const commando = require("discord.js-commando");
const helper = require("../../helpers");
const Discord = require("discord.js");

module.exports = class SkipCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "search",
      group: "music",
      memberName: "search",
      description: "Searches YouTube - Returns Top 3 Results with reaction choice."
    });
  }

  async run(message, args) {
    if (message.member.voiceChannel) {
      const threeResults = await helper.ytSearchWithChoice(args);
      const server = await helper.retrieveServer(message.guild.id);
      const queue = await helper.retrieveQueue(server.id);
      const filter = (reaction, user) => {
        return (
          ["1⃣", "2⃣", "3⃣"].includes(reaction.emoji.name) &&
          user.id === message.author.id
        );
      };
      const embed = new Discord.RichEmbed()
        .setTitle("Select a result:")
        .addField(
          `1.  ${threeResults[0].title}`,
          `${threeResults[0].author} - ${helper.convertSeconds(
            threeResults[0].lengthSeconds
          )} - [Link](${threeResults[0].url})`
        )
        .addField(
          `2.  ${threeResults[1].title}`,
          `${threeResults[1].author} - ${helper.convertSeconds(
            threeResults[1].lengthSeconds
          )} - [Link](${threeResults[1].url})`
        )
        .addField(
          `3.  ${threeResults[2].title}`,
          `${threeResults[2].author} - ${helper.convertSeconds(
            threeResults[2].lengthSeconds
          )} - [Link](${threeResults[2].url})`
        );

      const sent = await message.channel.send(embed);

      sent
        .react("1⃣")
        .catch(err => earlyEmoteReact())
        .then(() => {
          sent
            .react("2⃣")
            .catch(err => earlyEmoteReact())
            .then(() => {
              sent.react("3⃣").catch(err => earlyEmoteReact());
            });
        });

      sent
        .awaitReactions(filter, {
          max: 1,
          time: 7000,
          errors: ["time"]
        })
        .then(collected => {
          const reaction = collected.first();
          let arrIndex;
          if (reaction.emoji.name === "1⃣") {
            arrIndex = 0;
            sent.delete(100);
          } else if (reaction.emoji.name === "2⃣") {
            arrIndex = 1;
            sent.delete(100);
          } else if (reaction.emoji.name === "3⃣") {
            arrIndex = 2;
            sent.delete(100);
          }
          if (!message.guild.voiceConnection) {
            if (!servers[message.guild.id]) {
              servers[message.guild.id] = {};
            }
            helper.retrieveQueue(server.id).then(queue => {
              if (queue) {
                message.member.voiceChannel
                  .join()
                  .then(connection => {
                    helper.play(connection, message);
                  })
                  .catch(ex => {
                    message.channel
                      .send("I don't have permission to join this channel.")
                      .then(message => message.delete(3000));
                  });
              }
            });
          }
          helper.songQueueJoin(threeResults[arrIndex].url, queue);
        })
        .catch(err => {
          sent.delete();
        });
    } else {
      message.reply("You need to be in a voice channel.");
    }

    //This is here if someone clicks an emote before all 3 are reacted to the message.
    function earlyEmoteReact() {
      return;
    }
  }
};
