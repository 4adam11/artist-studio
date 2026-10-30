import { promises as fs } from 'node:fs';
import path from 'node:path';

// A small JSON-file database. All data is kept in memory and written to
// <dataDir>/db.json after every change, so content survives restarts without
// needing a separate database server. Writes go to a temp file first and are
// then renamed into place, so a crash mid-write never leaves a corrupt file.
export async function createStore({ dataDir, seed }) {
  await fs.mkdir(dataDir, { recursive: true });
  const file = path.join(dataDir, 'db.json');

  let data;
  try {
    data = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    data = structuredClone(seed);
  }
  for (const collection of Object.keys(seed)) {
    if (!Array.isArray(data[collection])) data[collection] = [];
  }

  let queue = Promise.resolve();
  function save() {
    const snapshot = JSON.stringify(data, null, 2);
    const write = queue.then(async () => {
      const tmp = `${file}.tmp`;
      await fs.writeFile(tmp, snapshot);
      await fs.rename(tmp, file);
    });
    queue = write.catch(() => {});
    return write;
  }

  const find = (collection, id) => data[collection].find((item) => item.id === Number(id));

  await save();

  return {
    all: (collection) => data[collection],
    find,
    where: (collection, predicate) => data[collection].filter(predicate),

    async insert(collection, doc) {
      const id = data[collection].reduce((max, item) => Math.max(max, item.id), 0) + 1;
      const item = { id, ...doc };
      data[collection].push(item);
      await save();
      return item;
    },

    async update(collection, id, patch) {
      const item = find(collection, id);
      if (!item) return null;
      Object.assign(item, patch);
      await save();
      return item;
    },

    async remove(collection, id) {
      const index = data[collection].findIndex((item) => item.id === Number(id));
      if (index === -1) return false;
      data[collection].splice(index, 1);
      await save();
      return true;
    },

    async removeWhere(collection, predicate) {
      data[collection] = data[collection].filter((item) => !predicate(item));
      await save();
    },

    save
  };
}
