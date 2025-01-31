import { useCallback, useEffect, useMemo, useState } from "react";
import { TextInput } from "../atoms/inputs/TextInput";
import { ImageWithSkeleton } from "../atoms/ImageWithSkeleton";
import { getAssetSearchTag } from "../../utils/route";
import { newKeywordFilter } from "../../composables/keywordFilter";
import { ClickOrDragHandler } from "../atoms/ClickOrDragHandler";
import { Size } from "../../models";
import { useTranslation } from "react-i18next";

type IconEventHandler = (url: string, id: string, size: Size) => void;

const baseURL = process.env.ASSETS_PATH!;

interface GroupAccordionProps {
  selectedName: string;
  name: string;
  label: string;
  url?: string;
  type: "shapes" | "templates";
  size?: "md" | "lg";
  onClick?: (name: string) => void;
  onIconDragStart?: IconEventHandler;
  onIconClick?: IconEventHandler;
}

export const GroupAccordion: React.FC<GroupAccordionProps> = ({
  selectedName,
  name,
  label,
  url,
  type,
  size,
  onClick,
  onIconDragStart,
  onIconClick,
}) => {
  const handleClick = useCallback(() => {
    onClick?.(name);
  }, [name, onClick]);

  return (
    <div>
      <button type="button" onClick={handleClick} className="border rounded-xs p-2 w-full text-left">
        {label}
      </button>
      {selectedName === name ? (
        <div className="pl-2">
          {url ? (
            <div className="text-right">
              <span>From </span>
              <a href={url} target="_blank" rel="noopener" className="mb-2 text-blue-500 underline font-semibold">
                {label}
              </a>
            </div>
          ) : undefined}
          <ShapeLibraryGroup
            name={name.toLowerCase()}
            type={type}
            size={size}
            onIconDragStart={onIconDragStart}
            onIconClick={onIconClick}
          />
        </div>
      ) : undefined}
    </div>
  );
};

interface ShapeLibraryGroupProps {
  name: string;
  type: "shapes" | "templates";
  size?: "md" | "lg";
  onIconDragStart?: IconEventHandler;
  onIconClick?: IconEventHandler;
}

const ShapeLibraryGroup: React.FC<ShapeLibraryGroupProps> = ({ name, type, size, onIconDragStart, onIconClick }) => {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [indexData, setIndexData] = useState<ListItemData>();
  const basePath = `${baseURL}${type}/${name}`;
  const { t } = useTranslation();

  const fetchIndex = useCallback(async () => {
    if (indexData) return;

    try {
      setLoading(true);
      const res = await fetch(`${basePath}/index.json`);
      const data = await res.json();
      setIndexData(data);
      setErrorMessage(undefined);
    } catch (e) {
      console.error(e);
      setErrorMessage(t("error.network.maybe_offline"));
    } finally {
      setLoading(false);
    }
  }, [indexData, basePath, t]);

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

    const filterFn = newKeywordFilter({ keyword, maxHit: 40 });
    const hit = filterFn(indexDataForSearch, ([, item]) => item.tag);
    return hit.result.map(([id, item]) => ({ id, url: item.url, name: item.name }));
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

  if (loading) {
    return <div className="py-2 text-center">Loading...</div>;
  }

  if (errorMessage) {
    return <div className="py-2 text-red-500 font-semibold">{errorMessage}</div>;
  }

  return (
    <div>
      <div className="py-1">
        <TextInput
          value={keyword}
          onChange={handleKeywordChange}
          placeholder="Search items"
          autofocus
          keepFocus
          clearable
        />
      </div>
      {rootItems ? (
        rootItems.length === 0 ? (
          <div className="p-4 text-center">No result</div>
        ) : (
          <ul className="p-1 flex flex-wrap gap-1">
            {rootItems.map(({ url, id, name }) => {
              return (
                <IconItem
                  key={url}
                  url={url}
                  name={name}
                  id={id}
                  size={size}
                  onDragStart={onIconDragStart}
                  onClick={onIconClick}
                />
              );
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
            size={size}
            onIconDragStart={onIconDragStart}
            onIconClick={onIconClick}
          />
        ))
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
  onIconDragStart?: IconEventHandler;
  onIconClick?: IconEventHandler;
}

const ListItem: React.FC<ListItemProps> = ({ name, item, level, path, size, onIconDragStart, onIconClick }) => {
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
      <button type="button" onClick={toggle} className="border rounded-xs p-2 w-full text-left">
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
                    onDragStart={onIconDragStart}
                    onClick={onIconClick}
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
                    <ListItem
                      name={key}
                      item={data}
                      level={level + 1}
                      path={currentPath}
                      size={size}
                      onIconDragStart={onIconDragStart}
                      onIconClick={onIconClick}
                    />
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
  onDragStart?: IconEventHandler;
  onClick?: IconEventHandler;
}

export const IconItem: React.FC<IconButtonProps> = ({ url, name, id, size, onDragStart, onClick }) => {
  const [iconSize, setIconSize] = useState<Size>();

  const handleDragStart = useCallback(() => {
    if (!iconSize) return;
    onDragStart?.(url, id, iconSize);
  }, [onDragStart, id, url, iconSize]);

  const handleClick = useCallback(() => {
    if (!iconSize) return;
    onClick?.(url, id, iconSize);
  }, [onClick, id, url, iconSize]);

  const wrapperClass = size === "lg" ? "p-1" : "w-10 h-10";
  const imageClass = size === "lg" ? "max-w-full max-h-full object-contain" : "w-full h-full object-contain";
  const skeletonClass = size === "lg" ? "h-32" : "w-full h-full";

  return (
    <li title={name}>
      <ClickOrDragHandler
        className={"rounded-xs cursor-pointer hover:bg-gray-200 " + wrapperClass}
        onClick={handleClick}
        onDragStart={handleDragStart}
      >
        <ImageWithSkeleton
          src={url}
          alt={name}
          className={imageClass}
          skeletonClassName={skeletonClass}
          onLoad={setIconSize}
        />
      </ClickOrDragHandler>
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
      ret.set(obj, { url, tag: getAssetSearchTag(url), name: key });
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
