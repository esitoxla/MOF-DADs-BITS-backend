export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("activities", {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    organization: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    createdAt: {
      allowNull: false,
      type: Sequelize.DATE,
    },
    updatedAt: {
      allowNull: false,
      type: Sequelize.DATE,
    },
  });

  // Unique constraint (VERY IMPORTANT)
  await queryInterface.addConstraint("activities", {
    fields: ["name", "organization"],
    type: "unique",
    name: "unique_activity_per_org",
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable("activities");
}
