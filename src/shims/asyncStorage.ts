type StorageValue = string | null;

const memoryStore = new Map<string, string>();

const AsyncStorage = {
  async getItem(key: string): Promise<StorageValue> {
    return memoryStore.has(key) ? memoryStore.get(key)! : null;
  },
  async setItem(key: string, value: string): Promise<void> {
    memoryStore.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    memoryStore.delete(key);
  },
  async clear(): Promise<void> {
    memoryStore.clear();
  },
  async getAllKeys(): Promise<string[]> {
    return Array.from(memoryStore.keys());
  },
  async multiGet(keys: string[]): Promise<[string, StorageValue][]> {
    return Promise.all(keys.map(async (key) => [key, await AsyncStorage.getItem(key)] as [string, StorageValue]));
  },
  async multiSet(entries: [string, string][]): Promise<void> {
    entries.forEach(([key, value]) => memoryStore.set(key, value));
  },
};

export default AsyncStorage;
export const {
  getItem,
  setItem,
  removeItem,
  clear,
  getAllKeys,
  multiGet,
  multiSet,
} = AsyncStorage;

