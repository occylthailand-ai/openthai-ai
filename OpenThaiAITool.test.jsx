/**
 * OpenThaiAiTool.test.jsx
 * Unit Tests สำหรับ React Frontend ของ OpenThaiAi
 *
 * Stack: Vitest + React Testing Library
 * คำสั่งติดตั้ง:
 *   npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
 *
 * คำสั่งรัน Test:
 *   npx vitest run                  <- รันครั้งเดียว
 *   npx vitest                      <- watch mode (รันซ้ำเมื่อโค้ดเปลี่ยน)
 *   npx vitest --coverage           <- ดู coverage report
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import OpenThaiAiTool from "./OpenThaiAiTool";

// ─────────────────────────────────────────────
// MOCK — จำลอง fetch (Claude API / n8n webhook)
// ─────────────────────────────────────────────
const mockApiResponse = {
  script: {
    hook: "ผ้าไหมอีสานแท้ ทอมือ 100% ราคาโรงงาน!",
    story: "ชุมชนบ้านทอผ้า จ.สุรินทร์ ทอกันมา 3 ชั่วคน เส้นไหมธรรมชาติ ย้อมสีจากพืช ลายขิดโบราณที่หาไม่ได้จากที่ไหน",
    cta: "กดติดตาม แล้วคอมเม้นต์ว่าอยากได้ลายไหน",
  },
  caption: "ผ้าไหมอีสานแท้ 100% จากชุมชนสุรินทร์ #OTOPไทย",
  hashtags: [
    "#ผ้าไหม", "#OTOPไทย", "#handmade", "#ThaiSilk",
    "#ของดีไทย", "#TikTokShop", "#ชุมชน", "#ไหมแท้",
    "#สุรินทร์", "#ผ้าทอมือ",
  ],
  quality_score: 8.5,
  learning: "Hook แบบ Contrast ได้ผลดีกับสินค้า OTOP เพราะสร้างความน่าสนใจทันที",
};

// Mock global fetch
global.fetch = vi.fn();

// ─────────────────────────────────────────────
// SETUP / TEARDOWN
// ─────────────────────────────────────────────
beforeEach(() => {
  fetch.mockResolvedValue({
    ok: true,
    json: async () => mockApiResponse,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

// ═════════════════════════════════════════════
// GROUP 1: Rendering — แสดงผลถูกต้อง
// ═════════════════════════════════════════════
describe("1. Rendering — แสดงผลเริ่มต้น", () => {

  it("แสดง input ชื่อสินค้า", () => {
    render(<OpenThaiAiTool />);
    const input = screen.getByPlaceholderText(/ชื่อสินค้า|product name/i);
    expect(input).toBeInTheDocument();
  });

  it("แสดง dropdown ประเภทสินค้า (5 ประเภท OTOP + Global)", () => {
    render(<OpenThaiAiTool />);
    const select = screen.getByLabelText(/ประเภทสินค้า|category/i);
    expect(select).toBeInTheDocument();
    // ตรวจ option ครบ
    expect(screen.getByRole("option", { name: /อาหาร/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /ผ้า.*สิ่งทอ|textile/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /ของใช้.*หัตถกรรม|craft/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /สมุนไพร.*ความงาม|herb/i })).toBeInTheDocument();
  });

  it("แสดง dropdown ประเภท Hook (5 แบบ)", () => {
    render(<OpenThaiAiTool />);
    const hookSelect = screen.getByLabelText(/hook|ประเภทฮุค/i);
    expect(hookSelect).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /story/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /process|asmr/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /contrast/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /question/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /transformation/i })).toBeInTheDocument();
  });

  it("ปุ่ม Generate ต้อง disabled เมื่อ input ชื่อสินค้าว่างเปล่า", () => {
    render(<OpenThaiAiTool />);
    const btn = screen.getByRole("button", { name: /generate|สร้าง/i });
    expect(btn).toBeDisabled();
  });

  it("ไม่แสดงผลลัพธ์ตอนเริ่มต้น (output section ยังว่าง)", () => {
    render(<OpenThaiAiTool />);
    expect(screen.queryByTestId("output-section")).not.toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════
// GROUP 2: User Interaction — ผู้ใช้กรอกข้อมูล
// ═════════════════════════════════════════════
describe("2. User Interaction — กรอกข้อมูล", () => {

  it("กรอกชื่อสินค้าแล้ว state อัปเดต (input value เปลี่ยน)", async () => {
    render(<OpenThaiAiTool />);
    const input = screen.getByPlaceholderText(/ชื่อสินค้า|product name/i);
    await userEvent.type(input, "ผ้าไหมอีสานแท้");
    expect(input).toHaveValue("ผ้าไหมอีสานแท้");
  });

  it("เลือก dropdown ประเภทสินค้า → category state เปลี่ยน", async () => {
    render(<OpenThaiAiTool />);
    const select = screen.getByLabelText(/ประเภทสินค้า|category/i);
    await userEvent.selectOptions(select, "textile");
    expect(select).toHaveValue("textile");
  });

  it("เลือก Hook type → hookType state เปลี่ยน", async () => {
    render(<OpenThaiAiTool />);
    const hookSelect = screen.getByLabelText(/hook|ประเภทฮุค/i);
    await userEvent.selectOptions(hookSelect, "contrast");
    expect(hookSelect).toHaveValue("contrast");
  });

  it("ปุ่ม Generate ต้อง enable หลังกรอกชื่อสินค้า", async () => {
    render(<OpenThaiAiTool />);
    const input = screen.getByPlaceholderText(/ชื่อสินค้า|product name/i);
    const btn = screen.getByRole("button", { name: /generate|สร้าง/i });
    await userEvent.type(input, "ผ้าไหม");
    expect(btn).not.toBeDisabled();
  });
});

// ═════════════════════════════════════════════
// GROUP 3: API Call — เรียก Claude API / n8n
// ═════════════════════════════════════════════
describe("3. API Call — เรียก backend", () => {

  it("เรียก fetch หลังกด Generate", async () => {
    render(<OpenThaiAiTool />);
    await userEvent.type(
      screen.getByPlaceholderText(/ชื่อสินค้า|product name/i),
      "ผ้าไหม"
    );
    await userEvent.click(screen.getByRole("button", { name: /generate|สร้าง/i }));
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("ส่ง payload ถูกต้อง (productName, category, hookType)", async () => {
    render(<OpenThaiAiTool />);
    await userEvent.type(
      screen.getByPlaceholderText(/ชื่อสินค้า|product name/i),
      "ผ้าไหมสุรินทร์"
    );
    await userEvent.selectOptions(
      screen.getByLabelText(/ประเภทสินค้า|category/i),
      "textile"
    );
    await userEvent.selectOptions(
      screen.getByLabelText(/hook|ประเภทฮุค/i),
      "story"
    );
    await userEvent.click(screen.getByRole("button", { name: /generate|สร้าง/i }));

    const [, options] = fetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body).toMatchObject({
      productName: "ผ้าไหมสุรินทร์",
      category: "textile",
      hookType: "story",
    });
  });

  it("แสดง loading spinner ระหว่างรอ API", async () => {
    // ทำให้ fetch ช้า (pending)
    fetch.mockImplementationOnce(() => new Promise(() => {}));
    render(<OpenThaiAiTool />);
    await userEvent.type(
      screen.getByPlaceholderText(/ชื่อสินค้า|product name/i),
      "ผ้าไหม"
    );
    await userEvent.click(screen.getByRole("button", { name: /generate|สร้าง/i }));
    expect(
      screen.getByRole("status") ||
      screen.getByTestId("loading-spinner") ||
      screen.getByText(/กำลังสร้าง|loading/i)
    ).toBeInTheDocument();
  });

  it("ปุ่ม Generate ต้อง disable ระหว่าง loading (ป้องกัน double submit)", async () => {
    fetch.mockImplementationOnce(() => new Promise(() => {}));
    render(<OpenThaiAiTool />);
    await userEvent.type(
      screen.getByPlaceholderText(/ชื่อสินค้า|product name/i),
      "ผ้าไหม"
    );
    const btn = screen.getByRole("button", { name: /generate|สร้าง/i });
    await userEvent.click(btn);
    expect(btn).toBeDisabled();
  });
});

// ═════════════════════════════════════════════
// GROUP 4: Output Display — แสดงผลลัพธ์
// ═════════════════════════════════════════════
describe("4. Output Display — แสดงผลจาก API", () => {

  async function generateContent() {
    render(<OpenThaiAiTool />);
    await userEvent.type(
      screen.getByPlaceholderText(/ชื่อสินค้า|product name/i),
      "ผ้าไหม"
    );
    await userEvent.click(screen.getByRole("button", { name: /generate|สร้าง/i }));
    await waitFor(() => screen.getByTestId("output-section"));
  }

  it("แสดง Hook script (3 วิ) จาก API", async () => {
    await generateContent();
    expect(screen.getByText(mockApiResponse.script.hook)).toBeInTheDocument();
  });

  it("แสดง Story script (20 วิ) จาก API", async () => {
    await generateContent();
    expect(screen.getByText(mockApiResponse.script.story)).toBeInTheDocument();
  });

  it("แสดง CTA script (7 วิ) จาก API", async () => {
    await generateContent();
    expect(screen.getByText(mockApiResponse.script.cta)).toBeInTheDocument();
  });

  it("แสดง Hashtags ครบ 10 อัน", async () => {
    await generateContent();
    mockApiResponse.hashtags.forEach((tag) => {
      expect(screen.getByText(tag)).toBeInTheDocument();
    });
  });

  it("แสดง Quality Score ถูกต้อง", async () => {
    await generateContent();
    expect(screen.getByText(/8\.5|8,5/)).toBeInTheDocument();
  });

  it("Score ≥ 7 แสดงสีเขียว (success)", async () => {
    await generateContent();
    const scoreEl = screen.getByTestId("quality-score");
    expect(scoreEl).toHaveClass("score-high"); // class ตาม implementation
  });

  it("แสดง Learning Layer (คำอธิบายจาก AI)", async () => {
    await generateContent();
    expect(screen.getByText(mockApiResponse.learning)).toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════
// GROUP 5: Error Handling — จัดการข้อผิดพลาด
// ═════════════════════════════════════════════
describe("5. Error Handling — จัดการ error", () => {

  it("แสดง error message เมื่อ API ตอบ 500", async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500 });
    render(<OpenThaiAiTool />);
    await userEvent.type(
      screen.getByPlaceholderText(/ชื่อสินค้า|product name/i),
      "ผ้าไหม"
    );
    await userEvent.click(screen.getByRole("button", { name: /generate|สร้าง/i }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument()
    );
  });

  it("แสดง error message เมื่อ network timeout / fetch throw", async () => {
    fetch.mockRejectedValueOnce(new Error("Network error"));
    render(<OpenThaiAiTool />);
    await userEvent.type(
      screen.getByPlaceholderText(/ชื่อสินค้า|product name/i),
      "ผ้าไหม"
    );
    await userEvent.click(screen.getByRole("button", { name: /generate|สร้าง/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/ลองใหม่|กรุณาลองอีกครั้ง|error/i)
      ).toBeInTheDocument()
    );
  });

  it("error message หายไปเมื่อ generate ใหม่สำเร็จ", async () => {
    // ครั้งแรก error
    fetch.mockRejectedValueOnce(new Error("Network error"));
    render(<OpenThaiAiTool />);
    const input = screen.getByPlaceholderText(/ชื่อสินค้า|product name/i);
    await userEvent.type(input, "ผ้าไหม");
    await userEvent.click(screen.getByRole("button", { name: /generate|สร้าง/i }));
    await waitFor(() => screen.getByText(/ลองใหม่|error/i));

    // ครั้งที่สอง success (fetch กลับไปใช้ mock ปกติ)
    await userEvent.click(screen.getByRole("button", { name: /generate|สร้าง/i }));
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    );
  });
});
