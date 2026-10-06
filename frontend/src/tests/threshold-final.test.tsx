import {
  beforeEach,
  afterEach,
  expect,
  it,
  vi,
} from "vitest";
import { createElement } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes,
} from "react-router-dom";

import ProductDetails from "../pages/productDetails";

import {
  checkProductNow,
  getProductHistory,
  setProductThreshold,
} from "../api/productApi";

import {
  clearAuth,
  setAuthData,
} from "../utills/auth";

import { retailerLink } from "../utills/retailer";

import type {
  ProductHistoryResponse,
} from "../types/product";

vi.mock("../api/productApi", () => ({
  checkProductNow: vi.fn(),
  getProductHistory: vi.fn(),
  setProductThreshold: vi.fn(),
}));

vi.mock(
  "../components/pricechart/priceChart",
  () => ({
    default: () =>
      createElement(
        "div",
        null,
        "Price chart",
      ),
  }),
);

const data: ProductHistoryResponse = {
  product: {
    id: 1,
    name: "Tracked phone",
    url: "https://daraz.com.np/products/phone-i123-s456.html",
    price: 1000,
    image_url: null,
    availability: "available",
    target_price: null,
    threshold_reached: false,
    email_alerts_available: true,
  },
  history: [
    {
      id: 1,
      product_id: 1,
      price: 1000,
      checked_at: "2026-10-02T12:00:00Z",
    },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();

  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );

  setAuthData(
    "test-token",
    {
      id: 1,
      email: "signed-in@example.com",
      created_at: "2026-01-01",
    },
  );

  vi.mocked(getProductHistory).mockResolvedValue(
    data,
  );
});

afterEach(() => {
  cleanup();
  clearAuth();
  vi.unstubAllGlobals();
});

const showDetails = () =>
  render(
    createElement(
      MemoryRouter,
      {
        initialEntries: ["/product/1"],
      },
      createElement(
        Routes,
        null,
        createElement(Route, {
          path: "/product/:id",
          element: createElement(ProductDetails),
        }),
      ),
    ),
  );

it(
  "saves and removes a product target, shows the signed-in email and retailer buying link",
  async () => {
    vi.mocked(
      setProductThreshold,
    ).mockImplementation(
      async (_id, target) => ({
        ...data.product,
        target_price: target,
      }),
    );

    showDetails();

    const input =
      await screen.findByLabelText(
        "Target Price (Rs.)",
      );

    expect(
      screen.getByText(
        "signed-in@example.com",
      ),
    ).toBeTruthy();

    expect(
      screen
        .getByRole("link", {
          name: /Buy on Daraz/,
        })
        .getAttribute("href"),
    ).toBe(data.product.url);

    fireEvent.change(input, {
      target: {
        value: "850.50",
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Save Target",
      }),
    );

    await waitFor(() =>
      expect(
        setProductThreshold,
      ).toHaveBeenCalledWith(
        1,
        850.5,
      ),
    );

    expect(
      await screen.findByText(
        /Target saved/,
      ),
    ).toBeTruthy();

    expect(
      screen.getByText(
        "Rs. 850.50",
      ),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove Alert",
      }),
    );

    await waitFor(() =>
      expect(
        setProductThreshold,
      ).toHaveBeenLastCalledWith(
        1,
        null,
      ),
    );

    expect(
      await screen.findByText(
        "No target price set.",
      ),
    ).toBeTruthy();

    expect(
      screen.getByText(
        "Price alert removed.",
      ),
    ).toBeTruthy();

    expect(
      screen.getByText(
        "Price chart",
      ),
    ).toBeTruthy();
  },
);

it(
  "keeps a failed target save retryable and does not lose product history",
  async () => {
    vi.mocked(
      setProductThreshold,
    )
      .mockRejectedValueOnce(
        new Error("Timeout"),
      )
      .mockResolvedValueOnce({
        ...data.product,
        target_price: 800,
      });

    showDetails();

    const input =
      await screen.findByLabelText(
        "Target Price (Rs.)",
      );

    fireEvent.change(input, {
      target: {
        value: "800",
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Save Target",
      }),
    );

    expect(
      await screen.findByRole("alert"),
    ).toHaveProperty(
      "textContent",
      "Could not save your target price. Please try again.",
    );

    expect(
      screen.getByText(
        "Price chart",
      ),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Save Target",
      }),
    );

    expect(
      await screen.findByText(
        /Target saved/,
      ),
    ).toBeTruthy();
  },
);

it(
  "prevents overlapping manual checks and threshold edits",
  async () => {
    let complete!: (
      response: ProductHistoryResponse,
    ) => void;

    vi.mocked(
      checkProductNow,
    ).mockReturnValue(
      new Promise((resolve) => {
        complete = resolve;
      }),
    );

    showDetails();

    const input =
      await screen.findByLabelText(
        "Target Price (Rs.)",
      );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Check now",
      }),
    );

    expect(
      (
        input as HTMLInputElement
      ).disabled,
    ).toBe(true);

    expect(
      (
        screen.getByRole("button", {
          name: "Please wait…",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);

    complete(data);

    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "Save Target",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
  },
);

it(
  "rejects invalid target input without calling the API",
  async () => {
    showDetails();

    const input =
      await screen.findByLabelText(
        "Target Price (Rs.)",
      );

    fireEvent.change(input, {
      target: {
        value: "2.001",
      },
    });

    fireEvent.submit(
      input.closest("form")!,
    );

    expect(
      await screen.findByRole("alert"),
    ).toBeTruthy();

    expect(
      setProductThreshold,
    ).not.toHaveBeenCalled();
  },
);

it(
  "shows a delivery outage and an already reached target without claiming delivery",
  async () => {
    vi.mocked(
      getProductHistory,
    ).mockResolvedValue({
      ...data,
      product: {
        ...data.product,
        target_price: 1200,
        threshold_reached: true,
        email_alerts_available: false,
      },
    });

    showDetails();

    expect(
      await screen.findByText(
        /Email alerts are temporarily unavailable/,
      ),
    ).toBeTruthy();

    expect(
      screen.getByText(
        /an email alert was queued/,
      ),
    ).toBeTruthy();
  },
);

it(
  "keeps buying URLs on supported retailers and preserves product query identity",
  () => {
    expect(
      retailerLink(
        "https://onlinesaathi.com/product/a?id=2",
      )?.url,
    ).toContain("id=2");

    expect(
      retailerLink(
        "https://hamrobazaar.com/product/a",
      )?.name,
    ).toBe("HamroBazar");

    expect(
      retailerLink(
        "https://my-choice-ecom.vercel.app/product/a?id=3",
      )?.name,
    ).toBe("MyChoice");

    expect(
      retailerLink(
        "https://www.my-choice-ecom.vercel.app/product/a",
      )?.name,
    ).toBe("MyChoice");

    for (const url of [
      "javascript:alert(1)",
      "https://daraz.com.np.attacker.test/",
      "https://user:pass@daraz.com.np/",
      "https://daraz.com.np:8443/",
    ]) {
      expect(
        retailerLink(url),
      ).toBeNull();
    }
  },
);