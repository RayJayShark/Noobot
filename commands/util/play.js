const commando = require("discord.js-commando");
const YTDL = require("ytdl-core");
const { RichEmbed } = require("discord.js");

module.exports = class PlayCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "play",
      group: "util",
      memberName: "play",
      description: ""
    });
  }

  play(connection, message) {
    const server = servers[message.guild.id];
    YTDL.getBasicInfo(server.queue[0]).then(result => {
      this.client.user.setActivity(result.title);
      message.channel.send(`Now playing: ${result.title}`);
    });
    server.dispatcher = connection.playStream(
      YTDL(server.queue[0], { filter: "audioonly" })
    );
    server.queue.shift();
    server.dispatcher.on("end", () => {
      if (server.queue[0]) {
        this.play(connection, message);
      } else {
        connection.disconnect();
        this.client.user.setActivity(null);
      }
    });
  }

  async run(message, argu) {
    if (message.member.voiceChannel) {
      if (!message.guild.voiceConnection) {
        if (!servers[message.guild.id]) {
          servers[message.guild.id] = { queue: [] };
        }
        message.member.voiceChannel.join().then(connection => {
          const server = servers[message.guild.id];
          server.queue.push(argu);
          this.play(connection, message);
        });
      } else if (message.guild.voiceConnection) {
        const server = servers[message.guild.id];
        server.queue.push(argu);
      }
    } else {
      message.reply("You need to be in a voice channel.");
    }
  }
};
