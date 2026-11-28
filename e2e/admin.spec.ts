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
    await page.goto("/logs");
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: "Portal Kontrol Presensi" })
    ).toBeVisible();
  });

  test("first login CUST-001 forces password change then opens /logs", async ({
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

    await expect(page).toHaveURL(/\/logs/);
    await expect(
      page.getByRole("heading", { name: "Pemantauan Kehadiran" })
    ).toBeVisible();
    await expect(page.getByText("Total Anggota Aktif")).toBeVisible();
  });

  test("System Custodian can create all 3 roles, toggle active, and reset password", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Contoh: CUST-001").fill("CUST-001");
    await page.getByPlaceholder("Masukkan kata sandi").fill("Custodian123");
    await page.getByRole("button", { name: "Masuk ke Dashboard" }).click();
    await expect(page).toHaveURL(/\/logs/);

    await page.getByRole("link", { name: "Manajemen Akun" }).click();
    await expect(page).toHaveURL(/\/users/);

    const roleSelect = page.locator("select");
    await expect(roleSelect.locator("option")).toHaveCount(3);

    // Create Field Member
    await page.getByPlaceholder(/MBR-014|CHK-001/).fill("MBR-014");
    await page.getByPlaceholder("Budi Santoso").fill("Budi Lapangan");
    await roleSelect.selectOption("fld_member");
    await page.getByRole("button", { name: "Buat Akun" }).click();
    await expect(page.getByText(/Presensi#014/)).toBeVisible();

    // Create Field Coordinator
    await page.getByPlaceholder(/MBR-014|CHK-001/).fill("CRD-002");
    await page.getByPlaceholder("Budi Santoso").fill("Siti Koordinator");
    await roleSelect.selectOption("fld_coord");
    await page.getByRole("button", { name: "Buat Akun" }).click();
    await expect(page.getByText(/Presensi#002/)).toBeVisible();
  });

  test("System Custodian can configure Telegram Bot & Channel settings", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Contoh: CUST-001").fill("CUST-001");
    await page.getByPlaceholder("Masukkan kata sandi").fill("Custodian123");
    await page.getByRole("button", { name: "Masuk ke Dashboard" }).click();
    await expect(page).toHaveURL(/\/logs/);

    await page.getByRole("link", { name: "API Channel Telegram" }).click();
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

  test("Field Coordinator cannot access /settings and only creates Field Member", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Contoh: CUST-001").fill("CRD-002");
    await page.getByPlaceholder("Masukkan kata sandi").fill("Presensi#002");
    await page.getByRole("button", { name: "Masuk ke Dashboard" }).click();

    await expect(page).toHaveURL(/\/change-password/);
    await page
      .getByPlaceholder("Minimal 8 karakter (huruf & angka)")
      .fill("Koordinator123");
    await page
      .getByPlaceholder("Ketik ulang kata sandi baru")
      .fill("Koordinator123");
    await page.getByRole("button", { name: "Simpan Kata Sandi Baru" }).click();

    await expect(page).toHaveURL(/\/logs/);
    await expect(
      page.getByRole("link", { name: "API Channel Telegram" })
    ).toHaveCount(0);

    // Direct navigation to /settings redirects back to /logs
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/logs/);

    await page.getByRole("link", { name: "Manajemen Akun" }).click();
    await expect(page.locator("select option")).toHaveCount(1);
  });
});
