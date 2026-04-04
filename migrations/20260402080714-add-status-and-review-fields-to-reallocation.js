export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn("reallocation", "status", {
    type: Sequelize.ENUM("Pending", "Reviewed", "Approved"),
    defaultValue: "Pending",
    allowNull: false,
  });

  await queryInterface.addColumn("reallocation", "reviewedBy", {
    type: Sequelize.STRING,
    allowNull: true,
  });

  await queryInterface.addColumn("reallocation", "reviewedAt", {
    type: Sequelize.DATE,
    allowNull: true,
  });

  await queryInterface.addColumn("reallocation", "reviewComment", {
    type: Sequelize.TEXT,
    allowNull: true,
  });

  await queryInterface.addColumn("reallocation", "approvedBy", {
    type: Sequelize.STRING,
    allowNull: true,
  });

  await queryInterface.addColumn("reallocation", "approvedAt", {
    type: Sequelize.DATE,
    allowNull: true,
  });
}

export async function down(queryInterface) {
  await queryInterface.removeColumn("reallocation", "status");
  await queryInterface.removeColumn("reallocation", "reviewedBy");
  await queryInterface.removeColumn("reallocation", "reviewedAt");
  await queryInterface.removeColumn("reallocation", "reviewComment");
  await queryInterface.removeColumn("reallocation", "approvedBy");
  await queryInterface.removeColumn("reallocation", "approvedAt");
}
