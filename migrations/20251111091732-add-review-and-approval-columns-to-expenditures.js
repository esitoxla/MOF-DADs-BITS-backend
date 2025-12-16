"use strict";

export async function up(queryInterface, Sequelize) {
  const table = await queryInterface.describeTable("expenditures");

  // STATUS
  if (!table.status) {
    await queryInterface.addColumn("expenditures", "status", {
      type: Sequelize.ENUM("Pending", "Reviewed", "Approved"),
      defaultValue: "Pending",
      after: "userId",
    });
  }

  // REVIEWED BY
  if (!table.reviewedBy) {
    await queryInterface.addColumn("expenditures", "reviewedBy", {
      type: Sequelize.STRING,
      allowNull: true,
      after: "status",
    });
  }

  // REVIEWED AT
  if (!table.reviewedAt) {
    await queryInterface.addColumn("expenditures", "reviewedAt", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "reviewedBy",
    });
  }

  // REVIEW COMMENT
  if (!table.reviewComment) {
    await queryInterface.addColumn("expenditures", "reviewComment", {
      type: Sequelize.TEXT,
      allowNull: true,
      after: "reviewedAt",
    });
  }

  // APPROVED BY
  if (!table.approvedBy) {
    await queryInterface.addColumn("expenditures", "approvedBy", {
      type: Sequelize.STRING,
      allowNull: true,
      after: "reviewComment",
    });
  }

  // APPROVED AT
  if (!table.approvedAt) {
    await queryInterface.addColumn("expenditures", "approvedAt", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "approvedBy",
    });
  }
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn("expenditures", "status");
  await queryInterface.removeColumn("expenditures", "reviewedBy");
  await queryInterface.removeColumn("expenditures", "reviewedAt");
  await queryInterface.removeColumn("expenditures", "reviewComment");
  await queryInterface.removeColumn("expenditures", "approvedBy");
  await queryInterface.removeColumn("expenditures", "approvedAt");
}
