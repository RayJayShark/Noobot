const commando = require("discord.js-commando");
const Discord = require("discord.js");
const helper = require("../../helpers");

module.exports = class PlayCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "play",
      group: "music",
      memberName: "play",
      description:
        "Plays a YouTube Link/Playlist or Spotify Song/Playlist/Album Link."
    });
  }

  async run(message, args) {
    if (message.member.voiceChannel) {
      const dbserver = await helper.retrieveServer(message.guild.id);
      let queue = await helper.retrieveQueue(dbserver.id);
      let waitingForReaction = false;
      if (!servers[message.guild.id]) {
        servers[message.guild.id] = {};
      }
      //Normal Word Search for YouTube - No URL.
      if (
        !args.includes("youtube") &&
        !args.includes("youtu.be") &&
        !args.includes("spotify")
      ) {
        const url = await helper.searchYoutube(args, message);
        if (url === "Quota") {
          message.channel
            .send(
              "Reached maximum YouTube Quota, wait a few minutes and try again."
            )
            .then(message => message.delete(5000));
        } else {
          helper.songQueueJoin(url, queue);
          message.channel
            .send("Added to queue!")
            .then(message => message.delete(2000));
        }
      }
      //YouTube Playlist
      else if (args.includes("youtube.com/playlist")) {
        const playlist = await helper.youtubePlaylist(args);
        playlist.forEach(async url => {
          helper.songQueueJoin(url, queue);
        });
        message.channel
          .send("Added to queue!")
          .then(message => message.delete(2000));
      }
      //Spotify Playlist or Album Link
      else if (args.includes("spotify")) {
        if (args.includes("/playlist/") || args.includes("/album/")) {
          const spotyPlaylist = [
            ...(await helper.getSpotifyUrl(args, message))
          ];
          if (spotyPlaylist[0] === "Quota") {
            message.channel
              .send(
                "Reached maximum YouTube Quota, wait a few minutes and try again."
              )
              .then(message => message.delete(5000));
          } else {
            spotyPlaylist.forEach(async url => {
              helper.songQueueJoin(url, queue);
            });
            message.channel
              .send("Added to queue!")
              .then(message => message.delete(2000));
          }
        } else {
          const url = await helper.getSpotifyUrl(args, message);
          if (url === "Quota") {
            message.channel
              .send(
                "Reached maximum YouTube Quota, wait a few minutes and try again."
              )
              .then(message => message.delete(5000));
          } else {
            helper.songQueueJoin(url, queue);
            message.channel
              .send("Added to queue!")
              .then(message => message.delete(2000));
          }
        }
      }
      //Normal YouTube Link
      else if (args.includes("youtube") || args.includes("youtu.be")) {
        if (args.includes("?list") || args.includes("&list")) {
          waitingForReaction = true;
          const filter = (reaction, user) => {
            return (
              ["1⃣", "2⃣"].includes(reaction.emoji.name) &&
              user.id === message.author.id
            );
          };

          const embed = new Discord.RichEmbed()
            .setTitle("YouTube Playlist Link Detected")
            .setColor("#FF0000")
            .addField("1.  Queue just the song.", "---------------------------")
            .addField("2.  Queue the playlist.", "---------------------------");

          const sent = await message.channel.send(embed);

          sent.react("1⃣").then(() => sent.react("2⃣"));
          sent
            .awaitReactions(filter, {
              max: 1,
              time: 7000,
              errors: ["time"]
            })
            .then(async collected => {
              const reaction = collected.first();
              if (reaction.emoji.name === "1⃣") {
                helper.songQueueJoin(args.split("list")[0], queue);
                waitingForReaction = false;
                message.channel.send(`Added to queue.`).then(message => {
                  message.delete(2000);
                  sent.delete(1900);
                });
              } else if (reaction.emoji.name === "2⃣") {
                helper.songQueueJoin(args.split("list")[0], queue);
                const ytPlaylistUrls = await helper.youtubePlaylist(args);
                ytPlaylistUrls.forEach(url => {
                  helper.songQueueJoin(url, queue);
                });
                waitingForReaction = false;
                message.channel.send(`Added all to queue.`).then(message => {
                  message.delete(2000);
                  sent.delete(2000);
                });
              }
            })
            .catch(err => sent.delete());
        } else {
          helper.songQueueJoin(args, queue);
          message.channel
            .send("Added to queue!")
            .then(message => message.delete(2000));
        }
      }
      if (!message.guild.voiceConnection) {
        const awaitReaction = setInterval(() => {
          if (!waitingForReaction) {
            clearInterval(awaitReaction);
            helper.retrieveQueue(dbserver.id).then(queue => {
              if (queue.songs.length > 0) {
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
        }, 1000);
      }
    } else {
      message.reply("You need to be in a voice channel.");
    }
  }
};
