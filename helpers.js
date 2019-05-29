const YTDL = require("ytdl-core");

module.exports = class Helpers {
  static play(connection, message, client) {
    const server = servers[message.guild.id];
    YTDL.getBasicInfo(server.queue[0]).then(result => {
      client.user.setActivity(result.title);
      message.channel.send(`Now playing: ${result.title}`);
    });
    server.dispatcher = connection.playStream(
      YTDL(server.queue[0], { filter: "audioonly" })
    );
    server.queue.shift();
    server.dispatcher.on("end", () => {
      if (server.queue[0]) {
        this.play(connection, message, client);
      } else {
        client.user.setActivity(null);
        connection.disconnect();
      }
    });
  }
};
