import { useCallback, useEffect, useState } from "react";

const baseURL = import.meta.env.BASE_URL;

interface Props {
  name: string;
  onIconDown?: (url: string, id: string) => void;
}

export const ShapeLibraryGroup: React.FC<Props> = ({ name, onIconDown }) => {
  const [loading, setLoading] = useState(true);
  const [indexData, setIndexData] = useState<any>();

  const basePath = `./${baseURL}shapes/${name}`;

  const fetchIndex = useCallback(async () => {
    if (indexData) return;

    const res = await fetch(`${basePath}/index.json`);
    const data = await res.json();
    setIndexData(data);
    setLoading(false);
  }, [loading, indexData]);

  useEffect(() => {
    fetchIndex();
  }, []);

  return (
    <div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {Object.entries(indexData).map(([key, item]) => (
            <ListItem
              key={key}
              name={key}
              item={item as ListItemData}
              level={0}
              path={basePath}
              onIconDown={onIconDown}
            />
          ))}
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
                  <li key={key} className="">
                    <IconButton path={currentPath} name={key} id={item[key] as string} onDown={onIconDown} />
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
  path: string;
  name: string;
  id: string;
  onDown?: (url: string, id: string) => void;
}

export const IconButton: React.FC<IconButtonProps> = ({ path, name, id, onDown }) => {
  const url = path + "/" + name;
  const handleDown = useCallback(() => {
    onDown?.(url, id);
  }, [onDown]);

  return (
    <button type="button" onMouseDown={handleDown}>
      <img src={url} alt={name} className="w-10 h-10" />
    </button>
  );
};
