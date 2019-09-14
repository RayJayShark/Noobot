const commando = require("discord.js-commando");
const Discord = require("discord.js");
const helper = require("../../helpers");

module.exports = class GetYtCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "getyt",
      aliases: ["yt", "gyt"],
      group: "music",
      memberName: "getyt",
      description: "Retrieves YouTube link from Single Spotify Song URL."
    });
  }
  async run(message, args) {
    if (args.includes("open.spotify.com/track/")) {
      const url = await helper.getSpotifyUrl(args);
      if (url === "Quota") {
        message.channel
          .send(
            "Reached maximum YouTube Quota, wait a few minutes and try again."
          )
          .then(message => message.delete(5000));
      } else {
        message.channel.send(url);
      }
    } else {
      message.channel
        .send("This command is for Single Spotify Song URLs.")
        .then(message => message.delete(5000));
    }
  }
};
