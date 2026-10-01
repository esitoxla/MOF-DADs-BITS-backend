export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn("users", "phone", {
    type: Sequelize.STRING,
    allowNull: true,
  });
}

export async function down(queryInterface) {
  await queryInterface.removeColumn("users", "phone");
}
