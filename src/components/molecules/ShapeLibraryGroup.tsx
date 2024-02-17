import { useCallback, useEffect, useMemo, useState } from "react";
import { TextInput } from "../atoms/inputs/TextInput";

const baseURL = process.env.ASSETS_PATH!;

interface Props {
  name: string;
  onIconDown?: (url: string, id: string) => void;
}

export const ShapeLibraryGroup: React.FC<Props> = ({ name, onIconDown }) => {
  const [loading, setLoading] = useState(true);
  const [indexData, setIndexData] = useState<any>();
  const basePath = `${baseURL}shapes/${name}`;

  const fetchIndex = useCallback(async () => {
    if (indexData) return;

    const res = await fetch(`${basePath}/index.json`);
    const data = await res.json();
    setIndexData(data);
    setLoading(false);
  }, [indexData, basePath]);

  useEffect(() => {
    fetchIndex();
  }, [fetchIndex]);

  const [keyword, setKeyword] = useState("");
  const handleKeywordChange = useCallback((val: string) => {
    setKeyword(val);
  }, []);

  const indexDataForSearch = useMemo(() => {
    if (!indexData) return;

    const ret = new Map<string, { url: string; tag: string; name: string }>();
    makePathMap(ret, basePath, indexData);
    return ret;
  }, [indexData, basePath]);

  const filteredIndexData = useMemo(() => {
    if (!keyword || !indexDataForSearch) return;

    const reg = new RegExp(keyword.toLowerCase());
    const ret: { url: string; id: string; name: string }[] = [];
    for (const [id, item] of indexDataForSearch) {
      if (reg.test(item.tag)) {
        ret.push({ id, url: item.url, name: item.name });
        if (40 <= ret.length) break;
      }
    }
    return ret;
  }, [keyword, indexDataForSearch]);

  return (
    <div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          <div className="py-1">
            <TextInput value={keyword} onChange={handleKeywordChange} placeholder="Search icons" autofocus keepFocus />
          </div>
          {filteredIndexData ? (
            filteredIndexData.length === 0 ? (
              <div>No result</div>
            ) : (
              <ul className="p-1 flex flex-wrap gap-1">
                {filteredIndexData.map(({ url, id, name }) => {
                  return (
                    <li key={url}>
                      <IconButton url={url} name={name} id={id} onDown={onIconDown} />
                    </li>
                  );
                })}
              </ul>
            )
          ) : (
            Object.entries(indexData).map(([key, item]) => (
              <ListItem
                key={key}
                name={key}
                item={item as ListItemData}
                level={0}
                path={basePath}
                onIconDown={onIconDown}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

interface ListItemData {
  [key: string]: ListItemData | string;
}

interface ListItemProps {
  name: string;
  item: ListItemData;
  level: number;
  path: string;
  onIconDown?: (url: string, id: string) => void;
}

const ListItem: React.FC<ListItemProps> = ({ name, item, level, path, onIconDown }) => {
  const [expanded, setExpanded] = useState(false);

  const toggle = useCallback(() => {
    setExpanded((v) => !v);
  }, []);

  const currentPath = `${path}/${name}`;
  const items: string[] = [];
  const groups: string[] = [];
  Object.entries(item).forEach(([key, data]) => {
    if (typeof data === "string") {
      items.push(key);
    } else {
      groups.push(key);
    }
  });

  return (
    <div style={{ marginLeft: `${level / 2}rem` }}>
      <button type="button" onClick={toggle} className="border rounded p-2 w-full text-left">
        <p>{name}</p>
      </button>
      {!expanded ? undefined : (
        <div>
          {items.length > 0 ? (
            <ul className="p-1 flex flex-wrap gap-1">
              {items.map((key) => {
                return (
                  <li key={key}>
                    <IconButton url={currentPath + "/" + key} name={key} id={item[key] as string} onDown={onIconDown} />
                  </li>
                );
              })}
            </ul>
          ) : undefined}
          {groups.length > 0 ? (
            <ul>
              {groups.map((key) => {
                const data = item[key] as ListItemData;
                return (
                  <li key={key}>
                    <ListItem name={key} item={data} level={level + 1} path={currentPath} onIconDown={onIconDown} />
                  </li>
                );
              })}
            </ul>
          ) : undefined}
        </div>
      )}
    </div>
  );
};

interface IconButtonProps {
  url: string;
  name: string;
  id: string;
  onDown?: (url: string, id: string) => void;
}

export const IconButton: React.FC<IconButtonProps> = ({ url, name, id, onDown }) => {
  const handleDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onDown?.(url, id);
    },
    [onDown, id, url],
  );

  return (
    <button type="button" onMouseDown={handleDown} className="cursor-grab" title={name}>
      <img src={url} alt={name} className="w-10 h-10" />
    </button>
  );
};

function makePathMap(
  ret: Map<string, { url: string; tag: string; name: string }>,
  currentPath: string,
  data: ListItemData,
) {
  Object.entries(data).forEach(([key, obj]) => {
    if (typeof obj === "string") {
      const url = currentPath + "/" + key;
      ret.set(obj, { url, tag: url.substring(0, url.lastIndexOf(".") ?? url).toLowerCase(), name: key });
    } else {
      makePathMap(ret, currentPath + "/" + key, obj);
    }
  });
}
