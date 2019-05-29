const commando = require("discord.js-commando");
const YTDL = require("ytdl-core");
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

  async run(message, argu) {
    const command = argu.split(" ")[0];
    const plName = argu.split(" ")[1];
    const url = argu.split(" ")[2];

    switch (command) {
      case "create":
        fs.readFile("playlists.json", "utf8", (err, data) => {
          const playlists = JSON.parse(data);
          const currentServer = playlists[message.guild.id];
          if (currentServer) {
            if (currentServer.some(pl => pl.playlistName === plName)) {
              message.channel.send(
                "Playlist name already exists, pick a different name."
              );
            } else if (currentServer.some(pl => pl.playlistName !== plName)) {
              const copyOfPlaylist = {
                ...playlists,
                [message.guild.id]: [
                  ...playlists[message.guild.id],
                  {
                    playlistName: plName,
                    creator: `${message.author.username}#${
                      message.author.discriminator
                    }`,
                    songs: url ? [url] : []
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
        fs.readFile("playlists.json", "utf8", (err, data) => {
          async function processTitles(array) {
            const playlistTitles = [];
            for (let i = 0; i < array.length; i++) {
              let res = await YTDL.getBasicInfo(array[i]).then(result => {
                return `${i + 1}: ${result.title}`;
              });
              playlistTitles.push(res);
            }
            message.channel.send(playlistTitles);
          }
          const playlists = JSON.parse(data);
          const found = playlists[message.guild.id].filter(
            playlist => playlist.playlistName === plName
          );
          processTitles(found[0].songs);
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
                  helper.play(connection, message, this.client);
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
