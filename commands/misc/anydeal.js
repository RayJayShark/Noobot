const commando = require("discord.js-commando");
const Discord = require("discord.js");
const helper = require("../../helpers");

module.exports = class AnyDealCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "anydeal",
      aliases: ["deal", "any", "ad"],
      group: "misc",
      memberName: "anydeal",
      description: "Finds the cheapest price for a game."
    });
  }

  async run(message, args) {
    if (!args.length) {
      return;
    }

    const authorId = message.author.id;
    message.channel
      .send(`Searching IsThereAnyDeal for \`${args}\`...`)
      .then(async message => {
        const returnedGames = await helper.fetchForGameTitle(args);
        const [game1, game2, game3, game4, game5] = returnedGames;

        if (!returnedGames.length) {
          return await message.channel
            .send(`No results for ${args}.`)
            .then(noResults => {
              message.delete(5000);
              noResults.delete(5000);
            });
        }

        const embed = new Discord.RichEmbed()
          .setTitle("Which Game?")
          .setColor("#FF0000");

        game1 &&
          embed.addField(
            `1.  ${game1.title}`,
            `Currently [$${game1.price_new} on ${game1.shop.name}](${game1.urls.buy})`
          );

        game2 &&
          embed.addField(
            `2.  ${game2.title}`,
            `Currently [$${game2.price_new} on ${game2.shop.name}](${game2.urls.buy})`
          );

        game3 &&
          embed.addField(
            `3.  ${game3.title}`,
            `Currently [$${game3.price_new} on ${game3.shop.name}](${game3.urls.buy})`
          );

        game4 &&
          embed.addField(
            `4.  ${game4.title}`,
            `Currently [$${game4.price_new} on ${game4.shop.name}](${game4.urls.buy})`
          );

        game5 &&
          embed.addField(
            `5.  ${game5.title}`,
            `Currently [$${game5.price_new} on ${game5.shop.name}](${game5.urls.buy})`
          );

        message.edit(embed).then(message => {
          const filter = (reaction, user) => {
            return (
              ["❌", "1⃣", "2⃣", "3⃣", "4⃣", "5⃣"].includes(
                reaction.emoji.name
              ) && user.id === authorId
            );
          };

          message
            .react("❌")
            .then(() => game1 && message.react("1⃣"))
            .catch(() => helper.earlyEmoteReact())
            .then(() => game2 && message.react("2⃣"))
            .catch(() => helper.earlyEmoteReact())
            .then(() => game3 && message.react("3⃣"))
            .catch(() => helper.earlyEmoteReact())
            .then(() => game4 && message.react("4⃣"))
            .catch(() => helper.earlyEmoteReact())
            .then(() => game5 && message.react("5⃣"))
            .catch(() => helper.earlyEmoteReact());

          message
            .awaitReactions(filter, {
              max: 1,
              time: 10000,
              errors: ["time"]
            })
            .then(async collected => {
              const reaction = collected.first();
              let plainTitle, gameTitle;
              if (reaction.emoji.name === "❌") {
                return message.delete(100);
              } else if (reaction.emoji.name === "1⃣") {
                plainTitle = game1.plain;
                gameTitle = game1.title;
              } else if (reaction.emoji.name === "2⃣") {
                plainTitle = game2.plain;
                gameTitle = game2.title;
              } else if (reaction.emoji.name === "3⃣") {
                plainTitle = game3.plain;
                gameTitle = game3.title;
              } else if (reaction.emoji.name === "4⃣") {
                plainTitle = game4.plain;
                gameTitle = game4.title;
              } else if (reaction.emoji.name === "5⃣") {
                plainTitle = game5.plain;
                gameTitle = game5.title;
              }

              const pricesForGame = await helper.fetchForGamePrices(plainTitle);
              const pricesForEmbed = new Discord.RichEmbed().setTitle(
                gameTitle
              );

              pricesForGame.forEach(({ current_price, url, store }) =>
                pricesForEmbed.addField(
                  `Price: $${current_price}`,
                  `Purchase from [${store}](${url})`
                )
              );

              message
                .delete(100)
                .then(() =>
                  message.channel
                    .send(pricesForEmbed)
                    .then(message => message.delete(10000))
                );
            })
            .catch(() =>
              message.delete(500).catch(() => helper.earlyEmoteReact())
            );
        });
      });
  }
};
