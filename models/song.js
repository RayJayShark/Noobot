"use strict";
module.exports = (sequelize, DataTypes) => {
  const Song = sequelize.define(
    "Song",
    {
      title: DataTypes.STRING,
      url: DataTypes.STRING,
      lengthSeconds: DataTypes.INTEGER,
      playlistId: DataTypes.INTEGER
    },
    {}
  );
  Song.associate = function(models) {
    Song.belongsTo(models.Playlist, {
      foreignKey: "playlistId",
      as: "playlist"
    });
    Song.belongsTo(models.Queue, {
      foreignKey: "queueId",
      as: "queue"
    });
  };
  return Song;
};
