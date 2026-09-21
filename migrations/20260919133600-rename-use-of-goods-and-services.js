"use strict";

const OLD_VALUES = [
  "Use of Goods and Services",
  "Use and Goods and Services",
];
const NEW_VALUE = "Goods and Services";
const TABLES = ["expenditures", "reallocation", "loadeddata"];

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface) {
    for (const table of TABLES) {
      await queryInterface.sequelize.query(
        `UPDATE \`${table}\`
         SET economicClassification = :newValue
         WHERE economicClassification IN (:oldValues)`,
        {
          replacements: {
            newValue: NEW_VALUE,
            oldValues: OLD_VALUES,
          },
        },
      );
    }
  },

  async down(queryInterface) {
    for (const table of TABLES) {
      await queryInterface.sequelize.query(
        `UPDATE \`${table}\`
         SET economicClassification = :oldValue
         WHERE economicClassification = :newValue`,
        {
          replacements: {
            oldValue: "Use of Goods and Services",
            newValue: NEW_VALUE,
          },
        },
      );
    }
  },
};
