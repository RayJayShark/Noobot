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
    if (!args) {
      return;
    }
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
        const video = await helper.lavalinkHelper(args, message);

        if (video) {
          const {
            info: { title }
          } = video;

          helper.songQueueJoin(video, queue);
          message.channel
            .send(`Added \`${title}\` to Queue!`)
            .then(message => message.delete(2000));
        }
      }
      //YouTube Playlist
      else if (args.includes("youtube.com/playlist")) {
        const playlist = await helper.lavalinkForURLOnly(args);

        playlist.forEach(video => {
          helper.songQueueJoin(video, queue);
        });

        message.channel
          .send(`Added \`${playlist.length}\` Videos to queue!`)
          .then(message => message.delete(2000));
      }
      //Spotify Playlist or Album Link
      else if (args.includes("spotify")) {
        if (args.includes("/playlist/") || args.includes("/album/")) {
          const spotyPlaylist = [
            ...(await helper.getSpotifyUrl(args, message))
          ];

          spotyPlaylist.forEach(song => {
            helper.songQueueJoin(song, queue);
          });
          message.channel
            .send(`Added \`${spotyPlaylist.length}\` songs to queue!`)
            .then(message => message.delete(2000));
        } else {
          //Single Song Spotify Search
          const song = await helper.getSpotifyUrl(args, message);

          helper.songQueueJoin(song, queue);
          message.channel
            .send(`Added \`${song.info.title}\` to queue!`)
            .then(message => message.delete(2000));
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
                const [song] = await helper.lavalinkForURLOnly(
                  args.split("list")[0]
                );
                helper.songQueueJoin(song, queue);
                waitingForReaction = false;
                message.channel
                  .send(`Added \`${song.info.title}\` to queue.`)
                  .then(message => {
                    message.delete(2000);
                    sent.delete(1900);
                  });
              } else if (reaction.emoji.name === "2⃣") {
                const [song] = await helper.lavalinkForURLOnly(
                  args.split("list")[0]
                );
                helper.songQueueJoin(song, queue);
                const ytPlaylistUrls = await helper.lavalinkForURLOnly(args);
                ytPlaylistUrls.forEach(song => {
                  helper.songQueueJoin(song, queue);
                });
                waitingForReaction = false;
                message.channel
                  .send(`Added \`${ytPlaylistUrls.length}\` songs to queue.`)
                  .then(message => {
                    message.delete(2000);
                    sent.delete(2000);
                  });
              }
            })
            .catch(() => sent.delete());
        } else {
          const [song] = await helper.lavalinkForURLOnly(args);
          helper.songQueueJoin(song, queue);
          message.channel
            .send(`Added \`${song.info.title}\` to queue.`)
            .then(message => message.delete(2000));
        }
      }

      const awaitReaction = setInterval(() => {
        if (!waitingForReaction) {
          clearInterval(awaitReaction);
          helper.retrieveQueue(dbserver.id).then(queue => {
            const manager = this.client.manager;
            const data = {
              guild: message.guild.id,
              channel: message.member.voiceChannelID,
              host: "localhost"
            };

            const botPlayingMusic = manager.spawnPlayer(data);

            if (
              queue.songs.length > 0 &&
              !botPlayingMusic.playing &&
              !botPlayingMusic.paused
            ) {
              manager.leave(message.guild.id);
              const player = manager.join(data);

              helper.play(player, message, manager);
            }
          });
        }
      }, 1000);
    } else {
      message.reply("You need to be in a voice channel.");
    }
  }
};
