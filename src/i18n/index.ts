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
    "exconnection.revoke": "Revoke connections",
    "exconnection.revoke.description": "You can revoke external connections via below button.",
    "exconnection.revoke.visibility": "This button is visible even if there's no connection.",
    "error.network.maybe_offline": "Network error happened. The device may be offline.",

    "term.workspace.desc":
      'A workspace is a folder where a diagram data is saved. Each sheet is saved as a separate file. All asset files are saved in the "assets" folder.',
    "term.follysvg":
      "Folly SVG is an SVG file containing meta data of shapes. You can restore the shapes by dropping the file to the canvas.",
    "term.lock": "Lock",
    "term.lock.desc": "Prevents shapes from moving. You can still modify, resize or rotate locked shapes.",
    "term.linejump": "Jump",
    "term.linejump.desc": "Jump over background lines. This works only between straight segments.",
    "term.makepolygon": "Make polygon",
    "term.makepolygon.desc": "To make a polygon, source line has to be neither an elbow nor a segment.",

    "contextmenu.delete": "Delete",
    "contextmenu.duplicate": "Duplicate",
    "contextmenu.duplicate.withingroup": "Duplicate within group",
    "contextmenu.group": "Group",
    "contextmenu.ungroup": "Ungroup",
    "contextmenu.lock": "[[LOCK]]",
    "contextmenu.unlock": "Unlock",
    "contextmenu.copy.png": "Copy as PNG",
    "contextmenu.export.shapes.as": "Export selected shapes as",
    "contextmenu.export.range.as": "Export selected range as",
    "contextmenu.export.png": "PNG",
    "contextmenu.export.svg": "SVG",
    "contextmenu.export.follysvg": "[[FOLLY_SVG]]",
    "contextmenu.flip.h": "Flip horizontally",
    "contextmenu.flip.v": "Flip vertically",
    "contextmenu.vertex.delete": "Delete vertex",
    "contextmenu.vertex.detach": "Detach vertex",
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
    "exconnection.revoke": "連携解除",
    "exconnection.revoke.description": "下のボタンを押下することですべての外部連携を解除します。",
    "exconnection.revoke.visibility": "このボタンは外部連携の有無に関わらず常に表示されます。",
    "error.network.maybe_offline": "通信エラーが発生しました。端末がオフラインの可能性があります。",

    "term.workspace.desc":
      'ワークスペースは、ダイアグラムの保存先となるフォルダです。各シートは別々のファイルとして保存され、アセットファイルは"assets"フォルダに格納されます。',
    "term.follysvg":
      "Folly SVGはシェイプのメタ情報を含んだSVGファイルです。このファイルをキャンバスにドロップすることでシェイプの復元が可能です。",
    "term.lock": "ロック",
    "term.lock.desc": "シェイプの移動を防ぎます。リサイズや回転などその他の編集は制限されません。",
    "term.linejump": "ジャンプ",
    "term.linejump.desc": "背後のラインをジャンプします。直線同士でのみジャンプが発生します。",
    "term.makepolygon": "ポリゴン化",
    "term.makepolygon.desc": "エルボー、あるいは単一線分はポリゴン化できません。",

    "contextmenu.delete": "削除",
    "contextmenu.duplicate": "複製",
    "contextmenu.duplicate.withingroup": "グループ内複製",
    "contextmenu.group": "グループ化",
    "contextmenu.ungroup": "グループ解除",
    "contextmenu.lock": "[[LOCK]]",
    "contextmenu.unlock": "ロック解除",
    "contextmenu.copy.png": "PNGコピー",
    "contextmenu.export.shapes.as": "選択シェイプエクスポート",
    "contextmenu.export.range.as": "選択範囲エクスポート",
    "contextmenu.export.png": "PNG",
    "contextmenu.export.svg": "SVG",
    "contextmenu.export.follysvg": "[[FOLLY_SVG]]",
    "contextmenu.flip.h": "水平反転",
    "contextmenu.flip.v": "垂直反転",
    "contextmenu.vertex.delete": "頂点削除",
    "contextmenu.vertex.detach": "頂点接続解除",
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
