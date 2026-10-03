import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  // UI preview tests explicitly opt into a mock preview; the running app uses real Supabase.
  await page.route("**/api/config", (route) =>
    route.fulfill({ json: { configured: false, preview: true } }),
  );
});
const preview = async (page) => {
  await page.goto("/judge/login");
  await page.getByRole("button", { name: "Explore judge preview" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome, Preview." }),
  ).toBeVisible();
};
test("judge can score, navigate immediately, and return without losing changes", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.portalTools = new Map();
    Object.defineProperty(document, "modelContext", {
      value: {
        registerTool(tool, { signal }) {
          window.portalTools.set(tool.name, tool);
          signal.addEventListener("abort", () =>
            window.portalTools.delete(tool.name),
          );
        },
      },
    });
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await preview(page);
  await expect(
    page.getByText("192 entries", { exact: false }).first(),
  ).toBeVisible();
  await page.getByRole("link", { name: "Continue judging" }).first().click();
  await expect(
    page.getByRole("heading", { name: "The last ferry home" }),
  ).toBeVisible();
  await page.getByLabel("Score out of 10").fill("9.25");
  await page.getByLabel("Remarks optional").fill("A memorable frame.");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Kinetic Dust" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await expect(page.getByLabel("Score out of 10")).toHaveValue("9.25");
  await expect(page.getByLabel("Remarks optional")).toHaveValue(
    "A memorable frame.",
  );
  await expect(page.getByRole("status")).toContainText(
    "Preview change recorded",
  );
  await page.getByLabel("Score out of 10").fill("11");
  await expect(
    page.getByRole("button", { name: "Next", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Score out of 10").fill("0");
  await expect(page.getByRole("status")).toContainText(
    "Preview change recorded",
  );
  await page
    .getByRole("link", { name: "Dashboard", exact: true })
    .first()
    .click();
  await expect(page.locator(".overall-card h2")).toContainText("1 / 192");
  const progress = await page.evaluate(() =>
    window.portalTools.get("get_judging_progress").execute({}),
  );
  expect(progress.categories.find((c) => c.category === "mobile")).toEqual({
    category: "mobile",
    completed: 1,
    total: 117,
  });
  expect(
    await page.evaluate(() => {
      try {
        window.portalTools
          .get("get_judging_progress")
          .execute({ judge_id: "other" });
        return false;
      } catch {
        return true;
      }
    }),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/judge-dashboard.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Story", exact: false }).first().click();
  await expect(page.locator(".story-frame")).toHaveCount(8);
  expect(errors).toEqual([]);
});
test("admin can filter, search, inspect remarks, and export results", async ({
  page,
}) => {
  await page.goto("/admin/login");
  await page.getByRole("button", { name: "Explore admin preview" }).click();
  await expect(
    page.getByRole("heading", { name: "The bigger picture." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Results", exact: true }).click();
  await page.getByRole("button", { name: "Device", exact: true }).click();
  await expect(page.locator(".table-summary")).toContainText("60 entries");
  await page
    .getByRole("textbox", { name: "Search entries" })
    .fill("Endless Wonders");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "View remarks for D-001" }).click();
  await expect(page.getByRole("dialog")).toContainText("No remark");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  expect((await downloaded).suggestedFilename()).toBe(
    "lens-e-uthsob-results.csv",
  );
  await page.getByRole("textbox", { name: "Search entries" }).fill("");
  await page.screenshot({
    path: "test-results/admin-results.png",
    fullPage: true,
  });
});
test("judge routes require login and mobile layout stays within the viewport", async ({
  page,
}) => {
  await page.goto("/judge/mobile");
  await expect(page).toHaveURL(/\/judge\/login$/);
  await page.setViewportSize({ width: 390, height: 844 });
  await preview(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Continue judging" }).first().click();
  await expect(page.getByLabel("Score out of 10")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mobile-judging.png",
    fullPage: true,
  });
});
test("failed live saves retain a draft across reload and recover on retry", async ({
  page,
  request,
}) => {
  const entries = await (await request.get("/catalog.json")).json();
  const judge = {
    id: "11111111-1111-4111-a111-111111111111",
    name: "Recovery Judge",
    username: "recovery",
    active: true,
  };
  let failing = true;
  const saved = new Map();
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/config")
      return route.fulfill({ json: { configured: true, preview: false } });
    if (path === "/api/judge/me") return route.fulfill({ json: { judge } });
    if (path === "/api/judge/data")
      return route.fulfill({ json: { entries, scores: [...saved.values()] } });
    if (path === "/api/judge/score") {
      if (failing)
        return route.fulfill({
          status: 503,
          json: { error: "Temporary connection failure" },
        });
      const score = route.request().postDataJSON();
      saved.set(score.entry_id, score);
      return route.fulfill({ json: { score } });
    }
    throw new Error(`Unexpected endpoint ${path}`);
  });
  await page.goto("/judge/mobile");
  await expect(page.getByLabel("Score out of 10")).toBeVisible();
  await page.getByLabel("Score out of 10").fill("8.5");
  await page.getByLabel("Remarks optional").fill("Recover this remark.");
  await expect(page.getByRole("status")).toContainText("Save failed");
  expect(
    await page.evaluate(
      (id) => JSON.parse(localStorage.getItem(`uthsob:drafts:${id}`) || "[]"),
      judge.id,
    ),
  ).toEqual([
    {
      entry_id: entries.find((e) => e.serial === "M-001").id,
      score: 8.5,
      remark: "Recover this remark.",
    },
  ]);
  await page.reload();
  await expect(page.getByLabel("Score out of 10")).toHaveValue("8.5");
  await expect(page.getByLabel("Remarks optional")).toHaveValue(
    "Recover this remark.",
  );
  await expect(page.getByRole("status")).toContainText("Save failed");
  failing = false;
  await page.getByRole("button", { name: "Retry now" }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  expect(
    await page.evaluate(
      (id) => localStorage.getItem(`uthsob:drafts:${id}`),
      judge.id,
    ),
  ).toBeNull();
  await page
    .getByRole("link", { name: "Dashboard", exact: true })
    .first()
    .click();
  await expect(page.locator(".overall-card h2")).toContainText("1 / 192");
});
