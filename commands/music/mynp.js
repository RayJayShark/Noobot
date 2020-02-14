const commando = require("discord.js-commando");
const Discord = require("discord.js");
const helper = require("../../helpers");

module.exports = class GetYtCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "mynp",
      aliases: ["sp"],
      group: "music",
      memberName: "mynp",
      description:
        "Retrieves the song the is currently listening to on Spotify.",
      args: [
        {
          key: "user",
          prompt: "Optional user to get now playing Spotify song.",
          type: "user",
          default: ""
        }
      ]
    });
  }

  async run(message, { user }) {
    await message.delete();

    let presence = {};
    if (user === "") {
      presence = message.author.presence;
    } else {
      const guildUser = await message.guild.member(user);
      presence = guildUser.presence;
    }

    const game = presence.game;

    if (!game || game.name !== "Spotify") {
      return;
    }

    const result = await helper.lavalinkHelper(game.details + " " + game.state);

    if (result.info) {
      await message.channel.sendMessage(result.info.uri);
    }
  }
};
