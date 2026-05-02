

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("reallocation", {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },

    activity: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    organization: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },

    economicClassification: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    sourceOfFunding: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    naturalAccount: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    description: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    amountReallocated: {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },

    amountReleased: {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0,
    },

    actualExpenditure: {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0,
    },

    actualPayment: {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0,
    },

    userId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "Users",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },

    status: {
      type: Sequelize.ENUM("Pending", "Reviewed", "Approved"),
      allowNull: false,
      defaultValue: "Pending",
    },

    reviewedBy: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    reviewedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },

    reviewComment: {
      type: Sequelize.TEXT,
      allowNull: true,
    },

    approvedBy: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    approvedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },

    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },

    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable("reallocation");

  // clean ENUM (important for Postgres)
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_reallocation_status";',
  );
}
