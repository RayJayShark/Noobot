"use strict";
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable("SongPlaylists", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      songId: {
        type: Sequelize.INTEGER,
        references: {
          model: {
            tableName: "Songs",
            key: "id"
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL"
        },
        allowNull: false
      },
      playlistId: {
        type: Sequelize.INTEGER,
        references: {
          model: {
            tableName: "Playlists",
            key: "id"
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL"
        },
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable("SongPlaylists");
  }
};
