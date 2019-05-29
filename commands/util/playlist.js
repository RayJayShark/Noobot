const commando = require("discord.js-commando");
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
    const server = servers[message.guild.id];
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
        });
        break;
    }
  }
};
