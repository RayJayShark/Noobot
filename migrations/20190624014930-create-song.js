"use strict";
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable("Songs", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      title: {
        type: Sequelize.STRING
      },
      url: {
        type: Sequelize.STRING
      },
      lengthSeconds: {
        type: Sequelize.INTEGER
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
        }
      },
      queueId: {
        type: Sequelize.INTEGER,
        references: {
          model: {
            tableName: "Queues",
            key: "id"
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL"
        }
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
    return queryInterface.dropTable("Songs");
  }
};
