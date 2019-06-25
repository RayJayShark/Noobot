'use strict';
module.exports = (sequelize, DataTypes) => {
  const SongQueue = sequelize.define('SongQueue', {
    songId: DataTypes.INTEGER,
    queueId: DataTypes.INTEGER
  }, {});
  SongQueue.associate = function(models) {
    // associations can be defined here
  };
  return SongQueue;
};