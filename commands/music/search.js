const commando = require("discord.js-commando");
const helper = require("../../helpers");
const Discord = require("discord.js");

module.exports = class SearchCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "search",
      group: "music",
      memberName: "search",
      description:
        "Searches YouTube - Returns Top 3 Results with reaction choice."
    });
  }

  async run(message, args) {
    if (message.member.voiceChannel) {
      const threeResults = await helper.ytSearchWithChoice(args);
      const server = await helper.retrieveServer(message.guild.id);
      const queue = await helper.retrieveQueue(server.id);
      const manager = this.client.manager;

      const filter = (reaction, user) => {
        return (
          ["1⃣", "2⃣", "3⃣"].includes(reaction.emoji.name) &&
          user.id === message.author.id
        );
      };
      const embed = new Discord.RichEmbed()
        .setTitle("Select a result:")
        .addField(
          `1.  ${threeResults[0].info.title}`,
          `${threeResults[0].info.author} - ${helper.convertSeconds(
            threeResults[0].info.length / 1000
          )} - [Link](${threeResults[0].info.uri})`
        )
        .addField(
          `2.  ${threeResults[1].info.title}`,
          `${threeResults[1].info.author} - ${helper.convertSeconds(
            threeResults[1].info.length / 1000
          )} - [Link](${threeResults[1].info.uri})`
        )
        .addField(
          `3.  ${threeResults[2].info.title}`,
          `${threeResults[2].info.author} - ${helper.convertSeconds(
            threeResults[2].info.length / 1000
          )} - [Link](${threeResults[2].info.uri})`
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
          time: 10000,
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

          helper.joinIfNotPlaying(manager, server, message);
          helper.songQueueJoin(threeResults[arrIndex], queue);
          message.channel
            .send(`Added \`${threeResults[arrIndex].info.title}\` queue!`)
            .then(message => message.delete(2000));
        })
        .catch(() => {
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
