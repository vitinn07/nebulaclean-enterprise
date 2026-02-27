const { readJson, writeJson } = require('../utils/jsonDb');

const USERS_FILE = 'users.json';

async function getAllUsers() {
  const users = await readJson(USERS_FILE, []);
  return Array.isArray(users) ? users : [];
}

async function saveAllUsers(users) {
  await writeJson(USERS_FILE, users);
}

async function findByUsername(username) {
  const users = await getAllUsers();
  return users.find((u) => u.username.toLowerCase() === String(username).toLowerCase());
}

async function findById(id) {
  const users = await getAllUsers();
  return users.find((u) => u.id === id);
}

async function createUser(user) {
  const users = await getAllUsers();
  users.push(user);
  await saveAllUsers(users);
  return user;
}

async function deleteUser(id) {
  const users = await getAllUsers();
  const filtered = users.filter((u) => u.id !== id);
  await saveAllUsers(filtered);
  return users.length !== filtered.length;
}

module.exports = {
  getAllUsers,
  saveAllUsers,
  findByUsername,
  findById,
  createUser,
  deleteUser
};

