import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const en = {
  translation: {
    loading: "Loading...",
    "app.privacy_policy": "Privacy Policy of No-man's folly",
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
    "term.workspace":
      'A workspace is a folder where a diagram data is saved. Each sheet is saved as a separate file. All asset files are saved in the "assets" folder.',
  },
};
type TranslationResource = typeof en;

const ja: TranslationResource = {
  translation: {
    loading: "読込中...",
    "app.privacy_policy": "No-man's folly プライバシーポリシー",
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
    "term.workspace":
      'ワークスペースは、ダイアグラムの保存先となるフォルダです。各シートは別々のファイルとして保存され、アセットファイルは"assets"フォルダに格納されます。',
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
