export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn("activities", "userId", {
    type: Sequelize.INTEGER,
    allowNull: false,
    references: {
      model: "Users",
      key: "id",
    },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  });
}

export async function down(queryInterface) {
  await queryInterface.removeColumn("activities", "userId");
}
