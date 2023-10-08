interface CopyDataSet {
  "text/plain"?: string;
  [key: string]: any;
}

export interface StringItem {
  kind: "string";
  type: string;
  getAsString: () => Promise<string>;
}

export interface FileItem {
  kind: "file";
  type: string;
  getAsFile: () => Promise<File>;
}

export function newClipboard(
  generateCopyDataSet: () => CopyDataSet,
  handlePastedItems: (items: Array<StringItem | FileItem>) => Promise<void> | void,
) {
  function onCopy(e: ClipboardEvent) {
    if (!e.clipboardData) return;

    Object.entries(generateCopyDataSet()).forEach(([type, data]) => e.clipboardData!.setData(type, data));
    e.preventDefault();
  }

  async function onPaste(e: ClipboardEvent) {
    if (!e.clipboardData) return;

    e.preventDefault();
    const items = Array.from(e.clipboardData.items).map(createItem);
    if (items.length > 0) {
      await handlePastedItems(items);
    }
  }

  return {
    onCopy,
    onPaste,
  };
}

function createItem(item: DataTransferItem): StringItem | FileItem {
  return item.kind === "string"
    ? {
        kind: "string",
        type: item.type,
        getAsString: () => getAsString(item),
      }
    : {
        kind: "file",
        type: item.type,
        getAsFile: () => getAsFile(item),
      };
}

function getAsString(item: DataTransferItem): Promise<string> {
  if (item.kind === "string") {
    return new Promise((resolve) => {
      item.getAsString(resolve);
    });
  } else {
    return Promise.reject(`Can not read "${item.kind}" as string`);
  }
}

function getAsFile(item: DataTransferItem): Promise<File> {
  if (item.kind === "file") {
    const file = item.getAsFile();
    return file ? Promise.resolve(file) : Promise.reject("Failed to read read the file");
  } else {
    return Promise.reject(`Can not read "${item.kind}" as file`);
  }
}

const APP_ID = "no-mans-folly";

interface ClipboardData<T extends string, K> {
  app: typeof APP_ID;
  appVersion: string;
  type: T;
  data: K;
}

export function newClipboardSerializer<T extends string, K>(
  type: T,
): {
  serialize: (data: K) => string;
  deserialize: (text: string) => K;
} {
  return {
    serialize(data: K): string {
      return JSON.stringify({
        app: APP_ID,
        appVersion: process.env.APP_VERSION,
        type,
        data,
      });
    },
    /**
     * @throws {Error}
     */
    deserialize(text: string) {
      const json = JSON.parse(text) as ClipboardData<T, K>;
      if (json.app !== APP_ID || json.type !== type) throw new Error("Invalid data");

      return json.data;
    },
  };
}
