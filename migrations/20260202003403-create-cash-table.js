"use strict";

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("cash", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },

      organization: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      as_at_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },

      account_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      currency: {
        type: Sequelize.ENUM("GHS", "USD", "GBP", "EUR"),
        allowNull: false,
      },

      balance: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
      },

      status: {
        type: Sequelize.ENUM("Pending", "Reviewed", "Approved"),
        defaultValue: "Pending",
        allowNull: false,
      },

      reviewedBy: Sequelize.STRING,
      reviewedAt: Sequelize.DATE,
      reviewComment: Sequelize.TEXT,

      approvedBy: Sequelize.STRING,
      approvedAt: Sequelize.DATE,

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addConstraint("cash", {
      fields: ["organization", "as_at_date", "account_name", "currency"],
      type: "unique",
      name: "unique_cash_snapshot",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("cash");
  },
};
