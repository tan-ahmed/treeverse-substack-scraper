const fs = require("fs");
const path = require("path");

// Ensure the data directory exists
const ensureDataDirectory = () => {
  const dataDir = path.join(__dirname, "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }
  return dataDir;
};

// Fetch with timeout using Axios or native fetch
const fetchWithTimeout = async (url, timeout = 10000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
};

// Save data to a JSON file
const saveToFile = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`✅ Data saved to ${filePath}`);
};

module.exports = {
  ensureDataDirectory,
  fetchWithTimeout,
  saveToFile,
};
