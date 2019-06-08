const commando = require("discord.js-commando");
const helper = require("../../helpers");
var fs = require("fs");

module.exports = class PlaylistCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "playlist",
      aliases: ["pl"],
      group: "util",
      memberName: "playlist",
      description: ""
    });
  }

  async run(message, args) {
    const command = args.split(" ")[0];
    const plName = args.split(" ")[1];
    const url = args.split(" ")[2];

    switch (command) {
      case "create":
        fs.readFile("playlists.json", "utf8", async (err, data) => {
          const playlists = JSON.parse(data);
          const currentServer = playlists[message.guild.id];
          if (currentServer) {
            if (
              currentServer.some(
                pl => pl.playlistName.toLowerCase() === plName.toLowerCase()
              )
            ) {
              message.channel.send(
                "Playlist name already exists, pick a different name."
              );
            } else if (
              currentServer.some(
                pl => pl.playlistName.toLowerCase() !== plName.toLowerCase()
              )
            ) {
              if (args.includes("spotify")) {
                message.channel.send(
                  "Converting Spotify Playlist. This can take some time depending on how many songs are in the playlist. Give me a few seconds..."
                );
              }
              const copyOfPlaylist = {
                ...playlists,
                [message.guild.id]: [
                  ...playlists[message.guild.id],
                  {
                    playlistName: plName.toLowerCase(),
                    creator: `${message.author.username}#${
                      message.author.discriminator
                    }`,
                    songs: args.includes("spotify")
                      ? args.includes("/playlist/")
                        ? [...(await helper.getSpotifyUrl(url))]
                        : [await helper.getSpotifyUrl(url)]
                      : args.includes("youtube.com") && args.includes("&list=")
                      ? [...(await helper.youtubePlaylist(url))]
                      : [url] || []
                  }
                ]
              };
              fs.writeFileSync(
                "playlists.json",
                JSON.stringify(copyOfPlaylist)
              );
              message.channel.send("Playlist created!");
            }
          } else if (!currentServer) {
            const copyOfPlaylist = { ...playlists };
            const addKeys = {
              [message.guild.id]: [
                {
                  playlistName: plName,
                  creator: `${message.author.username}#${
                    message.author.discriminator
                  }`,
                  songs: url ? [url] : []
                }
              ]
            };
            const newObj = Object.assign(copyOfPlaylist, addKeys);
            fs.writeFileSync("playlists.json", JSON.stringify(newObj));
            message.channel.send("Playlist created!");
          }
        });
        break;
      case "add":
        fs.readFile("playlists.json", "utf8", (err, data) => {
          const playlists = JSON.parse(data);
          const found = playlists[message.guild.id].filter(
            playlist => playlist.playlistName === plName
          );
          if (found[0].songs.includes(url)) {
            message.channel.send("This song is already in this playlist!");
          } else if (!found[0].songs.includes(url)) {
            const removed = playlists[message.guild.id].filter(
              playlist => playlist.playlistName !== plName
            );
            for (let i = 0; i < found.length; i++) {
              found[i].songs = [...found[i].songs, url];
            }
            const newPlaylist = {
              ...playlists,
              [message.guild.id]: [...removed, found[0]]
            };

            fs.writeFileSync("playlists.json", JSON.stringify(newPlaylist));
            message.channel.send(`Song added to Playlist: **${plName}**`);
          }
        });
        break;
      case "remove":
        fs.readFile("playlists.json", "utf8", (err, data) => {
          const playlists = JSON.parse(data);
          const found = playlists[message.guild.id].filter(
            playlist => playlist.playlistName === plName
          );
          if (found[0].songs.includes(url)) {
            const removed = playlists[message.guild.id].filter(
              playlist => playlist.playlistName !== plName
            );
            const removedSong = found[0].songs.filter(song => song !== url);
            found[0].songs = [...removedSong];
            const newPlaylist = {
              ...playlists,
              [message.guild.id]: [...removed, found[0]]
            };
            fs.writeFileSync("playlists.json", JSON.stringify(newPlaylist));
            message.channel.send(`Song removed from Playlist: **${plName}**`);
          } else {
            message.channel.send(
              "Song is not in selected playlist. Check your URL/Playlist name and try again."
            );
          }
        });
        break;
      case "view":
        fs.readFile("playlists.json", "utf8", async (err, data) => {
          const playlists = JSON.parse(data);
          const found = playlists[message.guild.id].filter(
            playlist => playlist.playlistName === plName
          );
          if (found[0].songs.length <= 50) {
            const urls = await helper.processTitles(found[0].songs);
            if (urls.length <= 25) {
              message.channel.send(urls);
            } else if (urls.length > 25 && urls.length <= 50) {
              const splitArray = urls.splice(Math.round(urls.length / 2));
              message.author.send(urls);
              message.author.send(splitArray);
            }
          } else if (found[0].songs.length > 50) {
            message.channel.send(
              `This playlist has ${
                found[0].songs.length
              } songs in it. I cannot post the entire list.`
            );
          }
        });
        break;
      case "play":
        fs.readFile("playlists.json", "utf8", (err, data) => {
          const playlists = JSON.parse(data);
          const found = playlists[message.guild.id].filter(
            playlist => playlist.playlistName === plName
          );
          if (found.length > 0) {
            if (message.member.voiceChannel) {
              if (!message.guild.voiceConnection) {
                if (!servers[message.guild.id]) {
                  servers[message.guild.id] = { queue: [] };
                }
                message.member.voiceChannel.join().then(connection => {
                  const server = servers[message.guild.id];
                  server.queue = found[0].songs;
                  helper.play(connection, message);
                });
              } else if (message.guild.voiceConnection) {
                const server = servers[message.guild.id];
                found[0].songs.forEach(song => server.queue.push(song));
              }
            } else {
              message.reply("You need to be in a voice channel.");
            }
          } else {
            message.channel.send("Playlist not found, try creating it first.");
          }
        });
        break;
    }
  }
};
