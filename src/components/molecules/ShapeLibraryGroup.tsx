import { useCallback, useEffect, useMemo, useState } from "react";
import { TextInput } from "../atoms/inputs/TextInput";
import { ImageWithSkeleton } from "../atoms/ImageWithSkeleton";

const baseURL = process.env.ASSETS_PATH!;

interface GroupAccordionProps {
  selectedName: string;
  name: string;
  type: "shapes" | "templates";
  size?: "md" | "lg";
  onClick?: (name: string) => void;
  onIconDown?: (url: string, id: string) => void;
}

export const GroupAccordion: React.FC<GroupAccordionProps> = ({
  selectedName,
  name,
  type,
  size,
  onClick,
  onIconDown,
}) => {
  const handleClick = useCallback(() => {
    onClick?.(name);
  }, [name, onClick]);

  return (
    <div>
      <button type="button" onClick={handleClick} className="border rounded p-2 w-full text-left">
        {name}
      </button>
      {selectedName === name ? (
        <div className="pl-2">
          <ShapeLibraryGroup name={name.toLowerCase()} type={type} size={size} onIconDown={onIconDown} />
        </div>
      ) : undefined}
    </div>
  );
};

interface ShapeLibraryGroupProps {
  name: string;
  type: "shapes" | "templates";
  size?: "md" | "lg";
  onIconDown?: (url: string, id: string) => void;
}

export const ShapeLibraryGroup: React.FC<ShapeLibraryGroupProps> = ({ name, type, size, onIconDown }) => {
  const [loading, setLoading] = useState(true);
  const [indexData, setIndexData] = useState<ListItemData>();
  const basePath = `${baseURL}${type}/${name}`;

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

  const sortedIndexData = useSortedObjectItems(indexData);

  const indexDataForSearch = useMemo(() => {
    if (!indexData) return;

    const base = new Map<string, { url: string; tag: string; name: string }>();
    makePathMap(base, basePath, indexData);

    const ret = new Map<string, { url: string; tag: string; name: string }>();
    Array.from(base.entries())
      .sort(([, a], [, b]) => a.url.localeCompare(b.url))
      .forEach(([key, value]) => {
        ret.set(key, value);
      });
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

  const rootItems = useMemo(() => {
    if (!indexDataForSearch) return;
    if (filteredIndexData) return filteredIndexData;

    const items = sortedIndexData.filter((data): data is [string, string] => typeof data[1] === "string");
    if (items.length === 0) return;

    return items.map((data) => {
      const item = indexDataForSearch.get(data[1])!;
      return { id: data[1], url: item.url, name: item.name };
    });
  }, [filteredIndexData, indexDataForSearch, sortedIndexData]);

  return (
    <div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          <div className="py-1">
            <TextInput value={keyword} onChange={handleKeywordChange} placeholder="Search items" autofocus keepFocus />
          </div>
          {rootItems ? (
            rootItems.length === 0 ? (
              <div className="p-4 text-center">No result</div>
            ) : (
              <ul className="p-1 flex flex-wrap gap-1">
                {rootItems.map(({ url, id, name }) => {
                  return <IconItem key={url} url={url} name={name} id={id} size={size} onDown={onIconDown} />;
                })}
              </ul>
            )
          ) : (
            sortedIndexData.map(([key, item]) => (
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
  size?: "md" | "lg";
  onIconDown?: (url: string, id: string) => void;
}

const ListItem: React.FC<ListItemProps> = ({ name, item, level, path, size, onIconDown }) => {
  const [expanded, setExpanded] = useState(false);

  const toggle = useCallback(() => {
    setExpanded((v) => !v);
  }, []);

  const currentPath = `${path}/${name}`;
  const items: string[] = [];
  const groups: string[] = [];
  useSortedObjectItems(item).forEach(([key, data]) => {
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
                  <IconItem
                    key={key}
                    url={currentPath + "/" + key}
                    name={key}
                    id={item[key] as string}
                    size={size}
                    onDown={onIconDown}
                  />
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
  size?: "md" | "lg";
  onDown?: (url: string, id: string) => void;
}

export const IconItem: React.FC<IconButtonProps> = ({ url, name, id, size, onDown }) => {
  const handleDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onDown?.(url, id);
    },
    [onDown, id, url],
  );

  const wrapperClass = size === "lg" ? "w-full h-auto max-h-32" : "w-10 h-10";
  const skeletonClass = size === "lg" ? "w-full h-32" : "w-full h-full";

  return (
    <li className={wrapperClass}>
      <button type="button" onPointerDown={handleDown} className="w-full h-full cursor-grab touch-none" title={name}>
        <ImageWithSkeleton
          src={url}
          alt={name}
          className="w-full max-h-full object-contain"
          skeletonClassName={skeletonClass}
        />
      </button>
    </li>
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

function useSortedObjectItems<T>(data?: { [key: string]: T }): [string, T][] {
  return useMemo(
    () =>
      data
        ? Object.keys(data)
            .sort()
            .map((key) => [key, data[key]])
        : [],
    [data],
  );
}
