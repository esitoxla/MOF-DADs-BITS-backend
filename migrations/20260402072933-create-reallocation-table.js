
export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable("reallocation", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      activity: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      organization: {
        type: Sequelize.STRING,
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
        allowNull: false,
      },
      appropriation: {
        type: Sequelize.DECIMAL(15, 2),
      },
      appropriationBalance: {
        type: Sequelize.DECIMAL(15, 2),
      },
      allotment: {
        type: Sequelize.DECIMAL(15, 2),
      },
      allotmentBalance: {
        type: Sequelize.DECIMAL(15, 2),
      },
      releases: {
        type: Sequelize.DECIMAL(15, 2),
      },
      actualExpenditure: {
        type: Sequelize.DECIMAL(15, 2),
      },
      actualPayment: {
        type: Sequelize.DECIMAL(15, 2),
      },

      userId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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
  await queryInterface.addConstraint("reallocation", {
    fields: ["activity", "organization"],
    type: "unique",
    name: "unique_activity_per_org",
  });
  }

 //It's the rollback/undo function for your migration.
export async function down(queryInterface) {
  await queryInterface.dropTable("reallocation");
} 

   //Sequelize migrations always have two functions:
//  up — applies the migration (creates the table, adds columns, etc.)
// down — reverses it, as if the migration never ran

