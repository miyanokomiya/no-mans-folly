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
    save_and_open_workspace: "Save and open [[(l)WORKSPACE]]",
    export_workspace: "Export [[(l)WORKSPACE]]",
    select_workspace: "Select a folder as a workspace, then all updates are automatically saved there.",
    local_folder: "Local folder",
    "local_folder.unsupported": "This browser doesn't support local folder.",
    google_drive: "Google Drive",
    "noworkspace.warning":
      "You can start with no workspace, but your data will be gone unless it's saved to a workspace before you leave this page.",
    "noworkspace.start": "Start with no workspace",
    update_sw: "New content available, click on reload button to update.",
    reload: "Reload",
    cancel: "Cancel",
    clear: "Clear",
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

    realtime: {
      disconnected: "Disconnected",
      connecting: "Connecting",
      connected: "Connected",
      disconnect: "Disconnect",
      connect: "Connect",
      about_workspace: {
        title: "Workspace operations",
        open: '"Open workspace" discards the room connection and open chosen workspace.',
        save_and_open:
          '"Save & Open workspace" keeps the room connection and merge the current workspace and chosen one.',
      },
      about_dataflow: {
        title: "Dataflow",
        dataflow:
          "The API server only manages WebSocket connections and data transfer across clients without storing workspace data.",
        host: "Anyone in the room may become the host who distributes workspace data.",
      },
      open_remote_diagram_confirm: "Opening the remote diagram will close the current one. Do you want to proceed?",
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
      symbol: "Symbol",
      "symbol.desc":
        "Symbol shape works as the link displaying the thumbnail of the target shapes.\nThe link only works within the sheet.",
      pin_to_shape: "Pin to shape",
      "pin_to_shape.desc": "Remotely pin to a shape.",
      linejump: "Jump",
      "linejump.desc": "Jumps over background lines. This works only between straight segments.",
      optimalhook: "Optimal hook",
      "optimalhook.desc": "Connects hooked shapes along the optimal path",
      makepolygon: "Make polygon",
      "makepolygon.desc": "Convert a line into a polyline or a polygon. Elbow lines are not available.",
      combine_lines: "Combine lines",
      "combine_lines.desc": "Only lines have the same line type, excluding elbow, can be combined.",
      attach_vertex: "Attach vertex",
      "attach_vertex.desc": "Remotely attach the vertex to a shape.",
      attach_vertices: "Attach all vertices",
      "attach_vertices.desc": "Remotely attach all vertices to a shape.",
      parse_svg: "Parse SVG",
      "parse_svg.desc":
        "Parse SVG and create shapes from it. Created shapes, especially texts, don't always match the original SVG.",
      sheet_to_shape: "Create shape",
      "sheet_to_shape.desc": "Create a shape that displays the thumbnail of the sheet.",
      nobounds: "No bounds within group",
      "nobounds.desc": "This shape doesn't contribute to the bounds of the parent group shape.",
    },

    header: {
      file: "File",
      open_workspace: "Open workspace",
      save_and_open_workspace: "Save & Open workspace",
      clear_workspace: "Clear workspace",
      disconnect_workspace: "Disconnect workspace",
      export_workspace: "Export workspace",
      clean_sheet: "Clean sheet",
    },

    contextmenu: {
      grid_on: "Grid on",
      grid_off: "Grid off",
      preview_on: "Preview on",
      preview_off: "Preview off",
      delete: "Delete",
      duplicate: "Duplicate",
      "duplicate.withingroup": "Duplicate within group",
      duplicate_as_path: "Duplicate as paths",
      pin_to_shape: "[[PIN_TO_SHAPE]]",
      unpin_from_shape: "Unpin from shape",
      group: "Group",
      ungroup: "Ungroup",
      create_symbol: "Create [[(l)SYMBOL]]",
      update_symbol: "Update [[(l)SYMBOL]]",
      align_layout: "Align layout",
      dissolve_layout: "Dissolve layout",
      create_frame: "Create frame",
      lock: "[[LOCK]]",
      unlock: "Unlock",
      "copy.png": "Copy as PNG",
      "export.shapes.as": "Export selected shapes as",
      "export.range.as": "Export selected range as",
      "export.png": "PNG",
      "export.svg": "SVG",
      "export.follysvg": "[[FOLLY_SVG]]",
      "import.parsesvg": "[[PARSE_SVG]]",
      "import.parsesvg.noshape": "No available shape found in the SVG.",
      "flip.h": "Flip horizontally",
      "flip.v": "Flip vertically",
      "vertex.delete": "Delete vertex",
      "vertex.detach": "Detach vertex",
      "vertex.detach.all": "Detach all vertices",
      "vertex.attach": "[[ATTACH_LINE_VERTEX]]",
      "vertex.attach.all": "[[ATTACH_LINE_VERTICES]]",
      "vertex.vnnode.create": "Create VNNode",
      "vertex.vnnode.insert": "Insert VNNode",
      "vertex.vnnode.split": "Split by VNNode",
      "segment.refine": "Refine segment",
      "line.combine": "[[COMBINE_LINES]]",
    },

    floatmenu: {
      grow_direction: "Grow direction",
    },

    states: {
      vn_create_polygon: {
        no_available_area: "No available area in the viewport.",
        too_many_edges: "Edge count limit exceeded in the viewport ({{edgeCount}} > {{maxCount}}).",
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
    save_and_open_workspace: "[[(l)WORKSPACE]]保存&選択",
    export_workspace: "[[(l)WORKSPACE]]エクスポート",
    select_workspace: "フォルダをワークスペースとして選択します。全ての変更は自動的にワークスペースに保存されます。",
    local_folder: "ローカルフォルダ",
    "local_folder.unsupported": "このブラウザはローカルフォルダをサポートしていません。",
    google_drive: "Google Drive",
    "noworkspace.warning": "ワークスペースを選択しないままページを離脱すると全ての変更は失われます。",
    "noworkspace.start": "ワークスペースなし",
    update_sw: "アプリケーションに更新があります。リロードボタン押下で更新します。",
    reload: "リロード",
    cancel: "キャンセル",
    clear: "クリア",
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

    realtime: {
      disconnected: "未接続",
      connecting: "接続中",
      connected: "接続済",
      disconnect: "切断",
      connect: "接続",
      about_workspace: {
        title: "ワークスペース操作",
        open: "「ワークスペース選択」はルームを切断し、選択したワークスペースを開きます。",
        save_and_open:
          "「ワークスペース保存&選択」はルームを維持し、現在のワークスペースと選択したワークスペースをマージします。",
      },
      about_dataflow: {
        title: "データフロー",
        dataflow:
          "APIサーバーはWebSocket接続とクライアント間のデータ通信の管理のみを行い、ワークスペースのデータを保存しません。",
        host: "ルーム内の誰もがワークスペースのデータ配信者となる可能性があります。",
      },
      open_remote_diagram_confirm: "リモートの図を開くと、現在の図は閉じられます。続行しますか？",
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
      symbol: "シンボル",
      "symbol.desc":
        "シンボルシェイプは対象シェイプのサムネイルを表示するリンクとして機能します。\nリンクはシート内でのみ機能します。",
      pin_to_shape: "シェイプにピン留め",
      "pin_to_shape.desc": "遠隔でシェイプにピン留めします。",
      linejump: "ジャンプ",
      "linejump.desc": "背後のラインをジャンプします。直線同士でのみジャンプが発生します。",
      optimalhook: "最適フック",
      "optimalhook.desc": "フックしたシェイプ間を最適経路で繋ぎます。",
      makepolygon: "ポリゴン化",
      "makepolygon.desc": "ラインをポリライン、またはポリゴンに変換します。エルボーラインは非対応です。",
      combine_lines: "ライン結合",
      "combine_lines.desc": "結合は同じラインタイプ（エルボーを除く）間でのみ可能です。",
      attach_vertex: "頂点接続",
      "attach_vertex.desc": "頂点を遠隔でシェイプに接続します。",
      attach_vertices: "全頂点接続",
      "attach_vertices.desc": "全頂点を遠隔でシェイプに接続します。",
      parse_svg: "SVG取り込み",
      "parse_svg.desc": "SVGを取り込み、シェイプを生成します。生成されたシェイプは元のSVGと一致しない場合があります。",
      sheet_to_shape: "シェイプ作成",
      "sheet_to_shape.desc": "シートのサムネイルを表示するシェイプを作成します。",
      nobounds: "グループ内サイズなし",
      "nobounds.desc": "このシェイプは親グループシェイプのサイズに影響しません。",
    },

    header: {
      file: "ファイル",
      open_workspace: "ワークスペース選択",
      save_and_open_workspace: "ワークスペース保存&選択",
      clear_workspace: "ワークスペースクリア",
      disconnect_workspace: "ワークスペース切断",
      export_workspace: "ワークスペースエクスポート",
      clean_sheet: "シートクリーン",
    },

    contextmenu: {
      grid_on: "グリッド表示",
      grid_off: "グリッド非表示",
      preview_on: "プレビュー表示",
      preview_off: "プレビュー非表示",
      delete: "削除",
      duplicate: "複製",
      "duplicate.withingroup": "グループ内複製",
      duplicate_as_path: "パスとして複製",
      pin_to_shape: "[[PIN_TO_SHAPE]]",
      unpin_from_shape: "ピン留め解除",
      group: "グループ化",
      ungroup: "グループ解除",
      create_symbol: "[[SYMBOL]]作成",
      update_symbol: "[[SYMBOL]]更新",
      align_layout: "整列レイアウト",
      dissolve_layout: "レイアウト解除",
      create_frame: "フレーム作成",
      lock: "[[LOCK]]",
      unlock: "ロック解除",
      "copy.png": "PNGコピー",
      "export.shapes.as": "選択シェイプエクスポート",
      "export.range.as": "選択範囲エクスポート",
      "export.png": "PNG",
      "export.svg": "SVG",
      "export.follysvg": "[[FOLLY_SVG]]",
      "import.parsesvg": "[[PARSE_SVG]]",
      "import.parsesvg.noshape": "取り込み可能なシェイプがSVGにありません。",
      "flip.h": "水平反転",
      "flip.v": "垂直反転",
      "vertex.delete": "頂点削除",
      "vertex.detach": "頂点接続解除",
      "vertex.detach.all": "全頂点接続解除",
      "vertex.attach": "[[ATTACH_LINE_VERTEX]]",
      "vertex.attach.all": "[[ATTACH_LINE_VERTICES]]",
      "vertex.vnnode.create": "VNノード作成",
      "vertex.vnnode.insert": "VNノード挿入",
      "vertex.vnnode.split": "VNノードで分割",
      "segment.refine": "辺精密編集",
      "line.combine": "[[COMBINE_LINES]]",
    },

    floatmenu: {
      grow_direction: "拡大方向",
    },

    states: {
      vn_create_polygon: {
        no_available_area: "ビューポート内に利用可能なエリアがありません。",
        too_many_edges: "画面内にラインが多すぎます。 ({{edgeCount}} > {{maxCount}}).",
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
