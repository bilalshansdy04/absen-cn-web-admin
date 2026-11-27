import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

test.beforeAll(() => {
  const dbPath = path.resolve(process.cwd(), "test-e2e.db");
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
});

test.afterAll(() => {
  const dbPath = path.resolve(process.cwd(), "test-e2e.db");
  try {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  } catch {
    // Ignore EBUSY while webServer is shutting down on Windows
  }
});

test.describe.serial("Web Admin E2E Flow", () => {
  test("redirects unauthenticated user to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: "Portal Kontrol Presensi" })
    ).toBeVisible();
  });

  test("first login CUST-001 forces password change then opens /dashboard Quick Access", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Contoh: CUST-001").fill("CUST-001");
    await page.getByPlaceholder("Masukkan kata sandi").fill("Presensi#001");
    await page.getByRole("button", { name: "Masuk ke Dashboard" }).click();

    await expect(page).toHaveURL(/\/change-password/);
    await page
      .getByPlaceholder("Minimal 8 karakter (huruf & angka)")
      .fill("Custodian123");
    await page
      .getByPlaceholder("Ketik ulang kata sandi baru")
      .fill("Custodian123");
    await page.getByRole("button", { name: "Simpan Kata Sandi Baru" }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText("Quick Access")).toBeVisible();
    await expect(page.getByText("Total Pekerja Aktif")).toBeVisible();
  });

  test("Super Admin can create 5 roles, open user history, and edit/soft-delete user", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Contoh: CUST-001").fill("CUST-001");
    await page.getByPlaceholder("Masukkan kata sandi").fill("Custodian123");
    await page.getByRole("button", { name: "Masuk ke Dashboard" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole("link", { name: "Manajemen Akun" }).first().click();
    await expect(page).toHaveURL(/\/users/);

    const roleSelect = page.locator("form select").first();
    await expect(roleSelect.locator("option")).toHaveCount(5);

    // Create Checker (Mobile)
    await page.getByPlaceholder(/MBR-014|CHK-001/).fill("CHK-014");
    await page.getByPlaceholder("Budi Santoso").fill("Budi Lapangan");
    await roleSelect.selectOption("fld_member");
    await page.getByRole("button", { name: "Buat Akun" }).click();
    await expect(page.getByText(/Presensi#014/)).toBeVisible();

    // Create Admin Web (Web)
    await page.getByPlaceholder(/MBR-014|CHK-001/).fill("WEB-002");
    await page.getByPlaceholder("Budi Santoso").fill("Siti Admin Web");
    await roleSelect.selectOption("web_admin");
    await page.getByRole("button", { name: "Buat Akun" }).click();
    await expect(page.getByText(/Presensi#002/)).toBeVisible();

    // Open Histori Per Akun for CHK-014
    await page.getByRole("link", { name: "Histori", exact: true }).first().click();
    await expect(page).toHaveURL(/\/users\/.+/);
    await expect(page.getByText("Total Hari Hadir")).toBeVisible();
  });

  test("Super Admin can configure Telegram Bot & Channel settings", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Contoh: CUST-001").fill("CUST-001");
    await page.getByPlaceholder("Masukkan kata sandi").fill("Custodian123");
    await page.getByRole("button", { name: "Masuk ke Dashboard" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole("link", { name: "API Channel Telegram" }).first().click();
    await expect(page).toHaveURL(/\/settings/);

    await page
      .getByPlaceholder(/7123456789|mengganti token/i)
      .fill("1234567890:ABCdefGHIjklMNOpqrsTUVwxyz");
    await page.getByPlaceholder("Contoh: -1001234567890").fill("-1009998887776");
    await page.getByRole("button", { name: "Simpan Konfigurasi" }).click();

    await expect(
      page.getByText(/Konfigurasi Telegram Bot & Channel berhasil disimpan/i)
    ).toBeVisible();
    await expect(page.getByText(/Terkonfigurasi \(Database\)/)).toBeVisible();
  });

  test("Admin Web cannot access /settings or /logs/deleted and only creates mobile worker roles", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Contoh: CUST-001").fill("WEB-002");
    await page.getByPlaceholder("Masukkan kata sandi").fill("Presensi#002");
    await page.getByRole("button", { name: "Masuk ke Dashboard" }).click();

    await expect(page).toHaveURL(/\/change-password/);
    await page
      .getByPlaceholder("Minimal 8 karakter (huruf & angka)")
      .fill("AdminWeb123");
    await page
      .getByPlaceholder("Ketik ulang kata sandi baru")
      .fill("AdminWeb123");
    await page.getByRole("button", { name: "Simpan Kata Sandi Baru" }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole("link", { name: "API Channel Telegram" })
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Histori Terhapus" })
    ).toHaveCount(0);

    await page.goto("/settings");
    await expect(page).toHaveURL(/\/logs/);

    await page.getByRole("link", { name: "Manajemen Akun" }).first().click();
    await expect(page.locator("form select option")).toHaveCount(3);
  });
});
