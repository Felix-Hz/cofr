import {
  ApiError,
  createExpense,
  createTransfer,
  getCategories,
  getExpenses,
  loginWithEmail,
  registerWithEmail,
} from "./api";
import { saveToken } from "./auth";

function mockFetch(
  response: Partial<Response> & { json?: () => Promise<unknown>; text?: () => Promise<string> },
) {
  const res = {
    ok: response.ok ?? true,
    status: response.status ?? 200,
    headers: response.headers ?? new Headers({ "content-type": "application/json" }),
    json: response.json ?? (() => Promise.resolve({})),
    text: response.text ?? (() => Promise.resolve("")),
  } as Response;
  return vi.stubGlobal("fetch", vi.fn().mockResolvedValue(res));
}

describe("ApiError", () => {
  it("has correct name and status", () => {
    const err = new ApiError(404, "not found");
    expect(err.name).toBe("ApiError");
    expect(err.status).toBe(404);
    expect(err.message).toBe("not found");
  });
});

describe("fetchWithAuth", () => {
  it("injects Bearer token", async () => {
    mockFetch({ json: () => Promise.resolve([]) });
    saveToken("my-token");
    await getCategories();
    const call = vi.mocked(fetch).mock.calls[0];
    expect(call[1]?.headers).toHaveProperty("Authorization", "Bearer my-token");
  });

  it("omits auth when no token", async () => {
    mockFetch({
      json: () => Promise.resolve({ token: "t" }),
    });
    await loginWithEmail("a@b.com", "pass");
    const call = vi.mocked(fetch).mock.calls[0];
    // loginWithEmail uses raw fetch, not fetchWithAuth
    expect(call[1]?.headers).not.toHaveProperty("Authorization");
  });

  it("removes token on 401 and throws Response", async () => {
    saveToken("expired-token");
    mockFetch({ ok: false, status: 401 });
    await expect(getCategories()).rejects.toBeInstanceOf(Response);
    expect(localStorage.getItem("cofr_token")).toBeNull();
  });

  it("throws ApiError with detail on error", async () => {
    mockFetch({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ detail: "bad request" }),
    });
    await expect(getCategories()).rejects.toThrow(ApiError);
    try {
      await getCategories();
    } catch (e) {
      expect((e as ApiError).message).toBe("bad request");
      expect((e as ApiError).status).toBe(400);
    }
  });

  it("throws ApiError with fallback on non-JSON error", async () => {
    mockFetch({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("not json")),
    });
    await expect(getCategories()).rejects.toThrow(ApiError);
  });
});

describe("getExpenses", () => {
  it("builds query params correctly", async () => {
    mockFetch({
      json: () => Promise.resolve({ expenses: [], total_count: 0, limit: 10, offset: 0 }),
    });
    saveToken("t");
    await getExpenses({
      limit: 10,
      offset: 5,
      startDate: "2024-01-01",
      category: "food",
      collapseTransferPairs: true,
    });
    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain("limit=10");
    expect(url).toContain("offset=5");
    expect(url).toContain("start_date=2024-01-01");
    expect(url).toContain("category=food");
    expect(url).toContain("collapse_transfer_pairs=true");
  });
});

describe("createExpense", () => {
  it("serializes date as ISO string", async () => {
    const expenseResponse = {
      id: "e1",
      amount: 10,
      category_id: "c1",
      category_name: "Food",
      category_color_light: "#f00",
      category_color_dark: "#c00",
      category_type: "expense",
      description: "",
      created_at: "2024-01-01T00:00:00",
      currency: "NZD",
      account_id: "a1",
      account_name: "Checking",
    };
    mockFetch({ json: () => Promise.resolve(expenseResponse) });
    saveToken("t");
    const date = new Date("2024-06-15T12:00:00Z");
    await createExpense({
      amount: 10,
      category_id: "c1",
      currency: "NZD",
      description: "",
      is_opening_balance: false,
      created_at: date,
    });
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body.created_at).toBe(date.toISOString());
  });
});

describe("loginWithEmail", () => {
  it("calls correct endpoint", async () => {
    mockFetch({ json: () => Promise.resolve({ token: "t" }) });
    await loginWithEmail("a@b.com", "pass");
    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain("/auth/local/login");
  });
});

describe("registerWithEmail", () => {
  it("throws ApiError on 409", async () => {
    mockFetch({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ detail: "Email already registered" }),
    });
    await expect(registerWithEmail("a@b.com", "pass")).rejects.toThrow(ApiError);
  });
});

describe("createTransfer", () => {
  it("serializes date as ISO string", async () => {
    const transferResponse = {
      from_transaction: {
        id: "t1",
        amount: 50,
        category_id: null,
        category_name: "Transfer",
        category_color_light: "#000",
        category_color_dark: "#000",
        category_type: "expense",
        description: "",
        created_at: "2024-01-01T00:00:00",
        currency: "NZD",
        account_id: "a1",
        account_name: "Checking",
        is_transfer: true,
        transfer_direction: "from",
      },
      to_transaction: {
        id: "t2",
        amount: 50,
        category_id: null,
        category_name: "Transfer",
        category_color_light: "#000",
        category_color_dark: "#000",
        category_type: "income",
        description: "",
        created_at: "2024-01-01T00:00:00",
        currency: "NZD",
        account_id: "a2",
        account_name: "Savings",
        is_transfer: true,
        transfer_direction: "to",
      },
    };
    mockFetch({ json: () => Promise.resolve(transferResponse) });
    saveToken("t");
    const date = new Date("2024-06-15T12:00:00Z");
    await createTransfer({
      amount: 50,
      from_account_id: "a1",
      to_account_id: "a2",
      description: "",
      currency: "NZD",
      created_at: date,
    });
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body.created_at).toBe(date.toISOString());
  });
});
