"use strict";

export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn("expenditures", "appropriationBalance", {
    type: Sequelize.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn("expenditures", "appropriationBalance");
}
