module.exports = (name, canBeNull = false) => `${name} CHAR(36) ${canBeNull ? "" : "NOT NULL"}`
