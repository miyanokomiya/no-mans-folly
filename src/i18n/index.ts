import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const en = {
  translation: {
    loading: "Loading...",
    "app.privacy_policy": "Privacy Policy of No-man's folly",
    "app.documentation": "Documentation",
    workspace: "Workspace",
    open_workspace: "Open [[(l)WORKSPACE]]",
    select_workspace:
      "Select <tag_folder>a folder</tag_folder> as a workspace, then all updates are automatically saved there.",
    local_folder: "Local folder",
    "local_folder.unsupported": "This browser doesn't support local folder.",
    google_drive: "Google Drive",
    "noworkspace.warning":
      "You can start with no workspace, but your data will be gone unless it's saved to a workspace before you leave this page.",
    "noworkspace.start": "Start with no workspace",
    update_sw: "New content available, click on reload button to update.",
    reload: "Reload",
    cancel: "Cancel",
    options: "Options",

    export: {
      title: "Export",
      export_frames: "Export frames",
      target_frames: "Target frames",
      options: {
        all_frames: "All",
        imagetype: "Image type",
        hideframe: "Hide frame",
        sequence_prefix: "Add sequence number to name",
        svg_options: "SVG options",
        round_float: "Round floating point",
        print_options: "Print options",
        hidename_onprint: "Hide frame name",
      },
      imagetypes: {
        print: "Print",
      },
    },

    exconnection: {
      revoke: "Revoke connections",
      "revoke.description": "You can revoke external connections via below button.",
      "revoke.visibility": "This button is visible even if there's no connection.",
    },

    error: {
      "network.maybe_offline": "Network error happened. The device may be offline.",
    },

    term: {
      "workspace.desc":
        'A workspace is a folder where a diagram data is saved. Each sheet is saved as a separate file. All asset files are saved in the "assets" folder.',
      follysvg:
        "Folly SVG is an SVG file containing meta data of shapes. You can restore the shapes by dropping the file to the canvas.",
      lock: "Lock",
      "lock.desc": "Prevents shapes from moving. You can still modify, resize or rotate locked shapes.",
      linejump: "Jump",
      "linejump.desc": "Jump over background lines. This works only between straight segments.",
      makepolygon: "Make polygon",
      "makepolygon.desc": "Convert a line into a polyline or a polygon. Elbow lines are not available.",
      attach_vertex: "Attach vertex",
      "attach_vertex.desc": "Remotely attach the vertex to a shape.",
      attach_vertices: "Attach all vertices",
      "attach_vertices.desc": "Remotely attach all vertices to a shape.",
    },

    contextmenu: {
      delete: "Delete",
      duplicate: "Duplicate",
      "duplicate.withingroup": "Duplicate within group",
      duplicate_as_path: "Duplicate as paths",
      group: "Group",
      ungroup: "Ungroup",
      create_frame: "Create frame",
      lock: "[[LOCK]]",
      unlock: "Unlock",
      "copy.png": "Copy as PNG",
      "export.shapes.as": "Export selected shapes as",
      "export.range.as": "Export selected range as",
      "export.png": "PNG",
      "export.svg": "SVG",
      "export.follysvg": "[[FOLLY_SVG]]",
      "flip.h": "Flip horizontally",
      "flip.v": "Flip vertically",
      "vertex.delete": "Delete vertex",
      "vertex.detach": "Detach vertex",
      "vertex.attach": "[[ATTACH_LINE_VERTEX]]",
      "vertex.attach.all": "[[ATTACH_LINE_VERTICES]]",
      "vertex.vnnode.create": "Create VNNode",
      "vertex.vnnode.insert": "Insert VNNode",
      "vertex.vnnode.split": "Split by VNNode",
      "segment.refine": "Refine segment",
    },

    floatmenu: {
      grow_direction: "Grow direction",
    },

    states: {
      vn_create_polygon: {
        no_available_area: "No available area in the viewport.",
      },
    },
  },
};
type TranslationResource = typeof en;

const ja: TranslationResource = {
  translation: {
    loading: "読込中...",
    "app.privacy_policy": "No-man's folly プライバシーポリシー",
    "app.documentation": "ドキュメンテーション",
    workspace: "ワークスペース",
    open_workspace: "[[WORKSPACE]]選択",
    select_workspace:
      "<tag_folder>フォルダ</tag_folder>をワークスペースとして選択します。全ての変更は自動的にワークスペースに保存されます。",
    local_folder: "ローカルフォルダ",
    "local_folder.unsupported": "このブラウザはローカルフォルダをサポートしていません。",
    google_drive: "Google Drive",
    "noworkspace.warning": "ワークスペースを選択しないままページを離脱すると全ての変更は失われます。",
    "noworkspace.start": "ワークスペースなし",
    update_sw: "アプリケーションに更新があります。リロードボタン押下で更新します。",
    reload: "リロード",
    cancel: "キャンセル",
    options: "設定",

    export: {
      title: "エクスポート",
      export_frames: "フレームエクスポート",
      target_frames: "対象フレーム",
      options: {
        all_frames: "全て",
        imagetype: "画像タイプ",
        hideframe: "フレーム非表示",
        sequence_prefix: "名前に番号付与",
        svg_options: "SVGオプション",
        round_float: "浮動小数点を丸める",
        print_options: "印刷オプション",
        hidename_onprint: "フレーム名前非表示",
      },
      imagetypes: {
        print: "印刷",
      },
    },

    exconnection: {
      revoke: "連携解除",
      "revoke.description": "下のボタンを押下することですべての外部連携を解除します。",
      "revoke.visibility": "このボタンは外部連携の有無に関わらず常に表示されます。",
    },

    error: {
      "network.maybe_offline": "通信エラーが発生しました。端末がオフラインの可能性があります。",
    },

    term: {
      "workspace.desc":
        'ワークスペースは、ダイアグラムの保存先となるフォルダです。各シートは別々のファイルとして保存され、アセットファイルは"assets"フォルダに格納されます。',
      follysvg:
        "Folly SVGはシェイプのメタ情報を含んだSVGファイルです。このファイルをキャンバスにドロップすることでシェイプの復元が可能です。",
      lock: "ロック",
      "lock.desc": "シェイプの移動を防ぎます。リサイズや回転などその他の編集は制限されません。",
      linejump: "ジャンプ",
      "linejump.desc": "背後のラインをジャンプします。直線同士でのみジャンプが発生します。",
      makepolygon: "ポリゴン化",
      "makepolygon.desc": "ラインをポリライン、またはポリゴンに変換します。エルボーラインは非対応です。",
      attach_vertex: "頂点接続",
      "attach_vertex.desc": "頂点を遠隔でシェイプに接続します。",
      attach_vertices: "全頂点接続",
      "attach_vertices.desc": "全頂点を遠隔でシェイプに接続します。",
    },

    contextmenu: {
      delete: "削除",
      duplicate: "複製",
      "duplicate.withingroup": "グループ内複製",
      duplicate_as_path: "パスとして複製",
      group: "グループ化",
      ungroup: "グループ解除",
      create_frame: "フレーム作成",
      lock: "[[LOCK]]",
      unlock: "ロック解除",
      "copy.png": "PNGコピー",
      "export.shapes.as": "選択シェイプエクスポート",
      "export.range.as": "選択範囲エクスポート",
      "export.png": "PNG",
      "export.svg": "SVG",
      "export.follysvg": "[[FOLLY_SVG]]",
      "flip.h": "水平反転",
      "flip.v": "垂直反転",
      "vertex.delete": "頂点削除",
      "vertex.detach": "頂点接続解除",
      "vertex.attach": "[[ATTACH_LINE_VERTEX]]",
      "vertex.attach.all": "[[ATTACH_LINE_VERTICES]]",
      "vertex.vnnode.create": "VNノード作成",
      "vertex.vnnode.insert": "VNノード挿入",
      "vertex.vnnode.split": "VNノードで分割",
      "segment.refine": "辺精密編集",
    },

    floatmenu: {
      grow_direction: "拡大方向",
    },

    states: {
      vn_create_polygon: {
        no_available_area: "ビューポート内に利用可能なエリアがありません。",
      },
    },
  },
};

i18next
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    supportedLngs: ["en", "ja"],
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },

    resources: { en, ja },
  });

export const i18n = i18next;
