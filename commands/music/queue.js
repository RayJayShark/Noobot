const commando = require("discord.js-commando");
const models = require("../../models");
const helper = require("../../helpers");

module.exports = class QueueCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "queue",
      group: "music",
      memberName: "queue",
      description: "Shows upcoming songs for a server's queue."
    });
  }

  async run(message, args) {
    const command = args.split(" ")[0].toLowerCase();
    const server = await helper.retrieveServer(message.guild.id);
    const queue = await helper.retrieveQueue(server.id);
    queue.songs.shift();

    if (queue.songs.length) {
      if (command) {
        switch (command) {
          case "edit":
            helper.createPagination(queue.songs, message, false, true);
            break;

          case "clear":
            if (!queue.songs.length) {
              return;
            }
            const queueLengthBeforeClear = queue.songs.length;
            queue.songs.forEach(song =>
              models.SongQueue.destroy({
                where: { queueId: queue.id, songId: song.id }
              })
            );
            message.channel
              .send(
                `Successfully removed ${queueLengthBeforeClear} songs from Queue.`
              )
              .then(message => message.delete(5000));
            break;

          default:
            break;
        }
      } else {
        helper.createPagination(queue.songs, message);
      }
    } else {
      message.channel
        .send("No songs in queue.")
        .then(message => message.delete(5000));
    }
  }
};
