"use strict";
module.exports = (sequelize, DataTypes) => {
  const SongPlaylist = sequelize.define(
    "SongPlaylist",
    {
      songId: DataTypes.INTEGER,
      playlistId: DataTypes.INTEGER
    },
    {}
  );
  SongPlaylist.associate = function(models) {
    // associations can be defined here
  };
  return SongPlaylist;
};
