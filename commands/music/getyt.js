const commando = require("discord.js-commando");
const Discord = require("discord.js");
const helper = require("../../helpers");

module.exports = class GetYtCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "getyt",
      aliases: ["yt"],
      group: "music",
      memberName: "getyt",
      description: "Retrieves YouTube link from Single Spotify Song URL."
    });
  }
  async run(message, args) {
    if (args.includes("open.spotify.com/track/")) {
      const url = await helper.getSpotifyUrl(args);
      const embed = new Discord.RichEmbed()
        .setAuthor("YouTube URL Found!")
        .setFooter(url)
        .setColor("#FF0000");
      message.channel.send(embed);
    } else {
      message.channel
        .send("This command is for Single Spotify Song URLs.")
        .then(message => message.delete(5000));
    }
  }
};
