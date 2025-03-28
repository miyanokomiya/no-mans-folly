import * as playwright from "playwright";

// Ref: https://github.com/microsoft/playwright-mcp/blob/main/src/context.ts
export class Context {
  private _browser: playwright.Browser | undefined;
  private _page: playwright.Page | undefined;
  private _console: playwright.ConsoleMessage[] = [];
  private _createPagePromise: Promise<playwright.Page> | undefined;

  async createPage(): Promise<playwright.Page> {
    if (this._createPagePromise) return this._createPagePromise;
    this._createPagePromise = (async () => {
      const { browser, page } = await this._createPage();
      page.on("console", (event) => this._console.push(event));
      page.on("framenavigated", (frame) => {
        if (!frame.parentFrame()) this._console.length = 0;
      });
      page.on("close", () => this._onPageClose());
      page.setDefaultNavigationTimeout(60000);
      page.setDefaultTimeout(5000);
      this._page = page;
      this._browser = browser;
      return page;
    })();
    return this._createPagePromise;
  }

  private _onPageClose() {
    const browser = this._browser;
    const page = this._page;
    void page
      ?.context()
      ?.close()
      .then(() => browser?.close())
      .catch(() => {});

    this._createPagePromise = undefined;
    this._browser = undefined;
    this._page = undefined;
    this._console.length = 0;
  }

  existingPage(): playwright.Page {
    if (!this._page) throw new Error("Navigate to a location to create a page");
    return this._page;
  }

  async console(): Promise<playwright.ConsoleMessage[]> {
    return this._console;
  }

  async close() {
    await this._page?.close();
  }

  private async _createPage(): Promise<{ browser?: playwright.Browser; page: playwright.Page }> {
    const browser = await playwright.chromium.launch({ headless: false, devtools: false });
    const context = await browser.newContext({
      baseURL: "http://localhost:5173",
      screen: { width: 500, height: 500 },
    });
    const [page] = context.pages();
    return { page };
  }
}
