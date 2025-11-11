"use strict";

export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn("expenditures", "status", {
    type: Sequelize.ENUM("Pending", "Reviewed", "Approved"),
    defaultValue: "Pending",
    after: "userId", // ensures it appears right after userId
  });

  await queryInterface.addColumn("expenditures", "reviewedBy", {
    type: Sequelize.STRING,
    allowNull: true,
    after: "status",
  });

  await queryInterface.addColumn("expenditures", "reviewedAt", {
    type: Sequelize.DATE,
    allowNull: true,
    after: "reviewedBy",
  });

  await queryInterface.addColumn("expenditures", "reviewComment", {
    type: Sequelize.TEXT,
    allowNull: true,
    after: "reviewedAt",
  });

  await queryInterface.addColumn("expenditures", "approvedBy", {
    type: Sequelize.STRING,
    allowNull: true,
    after: "reviewComment",
  });

  await queryInterface.addColumn("expenditures", "approvedAt", {
    type: Sequelize.DATE,
    allowNull: true,
    after: "approvedBy",
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn("expenditures", "status");
  await queryInterface.removeColumn("expenditures", "reviewedBy");
  await queryInterface.removeColumn("expenditures", "reviewedAt");
  await queryInterface.removeColumn("expenditures", "reviewComment");
  await queryInterface.removeColumn("expenditures", "approvedBy");
  await queryInterface.removeColumn("expenditures", "approvedAt");
}
