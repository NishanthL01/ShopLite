import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import axios from "axios";

import {
  LayoutDashboard,
  Package,
  Receipt,
  AlertTriangle,
  BarChart3,
  Plus,
  Trash2,
  Search,
  X,
  CheckCircle,
  Clock,
  Pencil,
  TrendingUp,
  Boxes,
  Printer,
  IndianRupee,
  RefreshCw,
  ShoppingCart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

import "./App.css";

const API = "http://localhost:8080/api";

type Product = {
  id: number;
  name: string;
  price: number;
  stockQuantity: number;
  reorderThreshold: number;
};

type BillItem = {
  id?: number;
  product: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type Bill = {
  id: number;
  billDate: string;
  totalAmount: number;
  status: "DRAFT" | "FINALIZED";
  items: BillItem[];
};

type Page =
  | "dashboard"
  | "products"
  | "billing"
  | "low-stock"
  | "sales";

type ProductFormData = {
  name: string;
  price: number;
  stockQuantity: number;
  reorderThreshold: number;
};

function App() {
  const [page, setPage] =
    useState<Page>("dashboard");

  const [products, setProducts] =
    useState<Product[]>([]);

  const [bills, setBills] =
    useState<Bill[]>([]);

  const [lowStock, setLowStock] =
    useState<Product[]>([]);

  const [dailySales, setDailySales] =
    useState<number>(0);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [showAddModal, setShowAddModal] =
    useState(false);

  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  const [billItems, setBillItems] =
    useState<
      {
        productId: number;
        quantity: number;
      }[]
    >([]);

  const [selectedProduct, setSelectedProduct] =
    useState<number | "">("");

  const [billQuantity, setBillQuantity] =
    useState<number>(1);

  const [creatingBill, setCreatingBill] =
    useState(false);

  const [billToPrint, setBillToPrint] =
    useState<Bill | null>(null);

  /*
   * ==============================
   * LOCAL DATE
   * ==============================
   */

  const getLocalDate = () => {
    const now = new Date();

    return (
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0")
    );
  };

  /*
   * ==============================
   * LOAD DATA
   * ==============================
   */

  const loadData = async () => {
    try {
      setLoading(true);

      const [
        productsResponse,
        billsResponse,
        lowStockResponse,
      ] = await Promise.all([
        axios.get(API + "/products"),
        axios.get(API + "/bills"),
        axios.get(API + "/products/low-stock"),
      ]);

      const today = getLocalDate();

      const salesResponse =
        await axios.get(
          API +
            "/bills/sales?date=" +
            today
        );

      setProducts(
        productsResponse.data
      );

      setBills(
        billsResponse.data
      );

      setLowStock(
        lowStockResponse.data
      );

      /*
       * IMPORTANT:
       * Backend returns:
       *
       * {
       *   date: "2026-09-28",
       *   totalSales: 2915
       * }
       */

      setDailySales(
        Number(
          salesResponse.data.totalSales
        ) || 0
      );

      console.log(
        "Today's Sales:",
        salesResponse.data.totalSales
      );

    } catch (error) {
      console.error(
        "Failed to load dashboard data:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /*
   * PRINT CLEANUP
   */

  useEffect(() => {
    const handleAfterPrint = () => {
      setBillToPrint(null);
    };

    window.addEventListener(
      "afterprint",
      handleAfterPrint
    );

    return () => {
      window.removeEventListener(
        "afterprint",
        handleAfterPrint
      );
    };
  }, []);

  /*
   * ==============================
   * FORMATTERS
   * ==============================
   */

  const formatMoney = (
    value: number
  ) => {
    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      }
    ).format(value);
  };

  const formatDate = (
    date: string
  ) => {
    return new Date(
      date
    ).toLocaleString(
      "en-IN",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  };

  /*
   * ==============================
   * PRODUCT CRUD
   * ==============================
   */

  const handleAddProduct = async (
    data: ProductFormData
  ) => {
    try {
      await axios.post(
        API + "/products",
        data
      );

      setShowAddModal(false);

      await loadData();

    } catch (error: any) {
      alert(
        error?.response?.data?.message ||
        "Failed to add product"
      );
    }
  };

  const handleUpdateProduct = async (
    data: ProductFormData
  ) => {
    if (!editingProduct) {
      return;
    }

    try {
      await axios.put(
        API +
          "/products/" +
          editingProduct.id,
        data
      );

      setEditingProduct(null);

      await loadData();

    } catch (error: any) {
      alert(
        error?.response?.data?.message ||
        "Failed to update product"
      );
    }
  };

  const handleDeleteProduct = async (
    id: number
  ) => {
    const confirmed =
      window.confirm(
        "Delete this product?"
      );

    if (!confirmed) {
      return;
    }

    try {
      await axios.delete(
        API +
          "/products/" +
          id
      );

      await loadData();

    } catch (error: any) {
      alert(
        error?.response?.data?.message ||
        "Failed to delete product"
      );
    }
  };

  /*
   * ==============================
   * SEARCH
   * ==============================
   */

  const filteredProducts =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return products;
      }

      return products.filter(
        (product) =>
          product.name
            .toLowerCase()
            .includes(query)
      );
    }, [
      products,
      search,
    ]);

  /*
   * ==============================
   * BILLING
   * ==============================
   */

  const addBillItem = () => {
    if (
      selectedProduct === ""
    ) {
      alert(
        "Select a product"
      );

      return;
    }

    if (
      billQuantity <= 0
    ) {
      alert(
        "Quantity must be greater than zero"
      );

      return;
    }

    const product =
      products.find(
        (item) =>
          item.id ===
          Number(
            selectedProduct
          )
      );

    if (!product) {
      return;
    }

    if (
      billQuantity >
      product.stockQuantity
    ) {
      alert(
        "Only " +
          product.stockQuantity +
          " units available"
      );

      return;
    }

    const exists =
      billItems.some(
        (item) =>
          item.productId ===
          product.id
      );

    if (exists) {
      alert(
        "Product already added"
      );

      return;
    }

    setBillItems([
      ...billItems,
      {
        productId:
          product.id,
        quantity:
          billQuantity,
      },
    ]);

    setSelectedProduct("");

    setBillQuantity(1);
  };

  const removeBillItem = (
    productId: number
  ) => {
    setBillItems(
      billItems.filter(
        (item) =>
          item.productId !==
          productId
      )
    );
  };

  const billTotal =
    billItems.reduce(
      (total, item) => {
        const product =
          products.find(
            (p) =>
              p.id ===
              item.productId
          );

        if (!product) {
          return total;
        }

        return (
          total +
          product.price *
            item.quantity
        );
      },
      0
    );

  /*
   * CREATE DRAFT
   */

  const handleCreateBill =
    async () => {
      if (
        billItems.length === 0
      ) {
        alert(
          "Add at least one product"
        );

        return;
      }

      try {
        setCreatingBill(true);

        await axios.post(
          API + "/bills",
          {
            items: billItems.map(
              (item) => ({
                productId:
                  item.productId,
                quantity:
                  item.quantity,
              })
            ),
          }
        );

        setBillItems([]);

        setSelectedProduct("");

        setBillQuantity(1);

        await loadData();

        alert(
          "Draft bill created successfully"
        );

      } catch (error: any) {
        alert(
          error?.response?.data?.message ||
          "Failed to create bill"
        );
      } finally {
        setCreatingBill(false);
      }
    };

  /*
   * FINALIZE BILL
   */

  const handleFinalize = async (
    id: number
  ) => {
    try {
      await axios.put(
        API +
          "/bills/" +
          id +
          "/finalize"
      );

      /*
       * Refresh everything:
       * sales
       * products
       * stock
       * bills
       * low stock
       */

      await loadData();

      alert(
        "Bill finalized successfully"
      );

    } catch (error: any) {
      alert(
        error?.response?.data?.message ||
        "Failed to finalize bill"
      );
    }
  };

  /*
   * PRINT
   */

  const handlePrintBill = (
    bill: Bill
  ) => {
    setBillToPrint(bill);

    setTimeout(() => {
      window.print();
    }, 300);
  };

  /*
   * ==============================
   * DASHBOARD DATA
   * ==============================
   */

  const totalStockUnits =
    products.reduce(
      (sum, product) =>
        sum +
        product.stockQuantity,
      0
    );

  const totalInventoryValue =
    products.reduce(
      (sum, product) =>
        sum +
        product.price *
          product.stockQuantity,
      0
    );

  const healthyProducts =
    products.filter(
      (product) =>
        product.stockQuantity >
        product.reorderThreshold
    ).length;

  const lowStockCount =
    lowStock.length;

  const draftBills =
    bills.filter(
      (bill) =>
        bill.status ===
        "DRAFT"
    ).length;

  const finalizedBills =
    bills.filter(
      (bill) =>
        bill.status ===
        "FINALIZED"
    ).length;

  const stockHealth =
    products.length === 0
      ? 0
      : Math.round(
          (healthyProducts /
            products.length) *
            100
        );

  /*
   * ==============================
   * NAVIGATION
   * ==============================
   */

  const NavItem = ({
    icon,
    label,
    value,
    badge,
  }: {
    icon: ReactNode;
    label: string;
    value: Page;
    badge?: number;
  }) => (
    <button
      className={
        "nav-item " +
        (page === value
          ? "active"
          : "")
      }
      onClick={() =>
        setPage(value)
      }
    >
      {icon}

      <span>
        {label}
      </span>

      {badge !== undefined &&
        badge > 0 && (
          <b className="nav-badge">
            {badge}
          </b>
        )}
    </button>
  );

  /*
   * ==============================
   * DASHBOARD
   * ==============================
   */

  const Dashboard = () => (
    <div className="page">

      <div className="page-header">

        <div>
          <div className="eyebrow">
            SHOP OVERVIEW
          </div>

          <h1>
            Dashboard
          </h1>

          <p>
            Monitor inventory,
            billing and daily
            performance.
          </p>
        </div>

        <button
          className="refresh-btn"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={
              loading
                ? "spin"
                : ""
            }
          />

          Refresh
        </button>

      </div>

      {/* MAIN STATS */}

      <div className="stats-grid">

        <div className="stat-card">

          <div className="stat-icon blue">
            <Package size={21} />
          </div>

          <div className="stat-content">

            <span>
              Total Products
            </span>

            <strong>
              {products.length}
            </strong>

            <small>
              Active inventory items
            </small>

          </div>

        </div>

        <div className="stat-card">

          <div className="stat-icon purple">
            <Boxes size={21} />
          </div>

          <div className="stat-content">

            <span>
              Stock Units
            </span>

            <strong>
              {totalStockUnits}
            </strong>

            <small>
              Units currently available
            </small>

          </div>

        </div>

        <div className="stat-card sales-card">

          <div className="stat-icon green">
            <IndianRupee size={21} />
          </div>

          <div className="stat-content">

            <span>
              Today's Sales
            </span>

            <strong>
              {formatMoney(
                dailySales
              )}
            </strong>

            <small>
              Finalized bills only
            </small>

          </div>

        </div>

        <div className="stat-card">

          <div className="stat-icon orange">
            <AlertTriangle
              size={21}
            />
          </div>

          <div className="stat-content">

            <span>
              Low Stock
            </span>

            <strong>
              {lowStockCount}
            </strong>

            <small>
              Items need attention
            </small>

          </div>

        </div>

      </div>

      {/* SECONDARY STATS */}

      <div className="stats-grid secondary-stats">

        <div className="mini-stat-card">

          <Activity size={17} />

          <div>
            <span>
              Stock Health
            </span>

            <strong>
              {stockHealth}%
            </strong>
          </div>

          <ArrowUpRight
            size={16}
          />

        </div>

        <div className="mini-stat-card">

          <Receipt size={17} />

          <div>
            <span>
              Total Bills
            </span>

            <strong>
              {bills.length}
            </strong>
          </div>

        </div>

        <div className="mini-stat-card">

          <CheckCircle size={17} />

          <div>
            <span>
              Completed
            </span>

            <strong>
              {finalizedBills}
            </strong>
          </div>

        </div>

        <div className="mini-stat-card">

          <Clock size={17} />

          <div>
            <span>
              Draft Bills
            </span>

            <strong>
              {draftBills}
            </strong>
          </div>

        </div>

      </div>

      {/* DASHBOARD PANELS */}

      <div className="dashboard-grid">

        {/* INVENTORY */}

        <div className="panel">

          <div className="panel-header">

            <div>
              <h2>
                Inventory Overview
              </h2>

              <p>
                Current stock health
              </p>
            </div>

            <button
              className="text-btn"
              onClick={() =>
                setPage("products")
              }
            >
              View All
              <ArrowUpRight
                size={14}
              />
            </button>

          </div>

          <div className="inventory-list">

            {products.length ===
            0 ? (
              <div className="empty-state">
                No products available
              </div>
            ) : (
              products
                .slice(0, 6)
                .map(
                  (product) => {

                    const isLow =
                      product.stockQuantity <=
                      product.reorderThreshold;

                    const max =
                      Math.max(
                        product.stockQuantity,
                        product.reorderThreshold,
                        1
                      );

                    const percentage =
                      Math.min(
                        100,
                        Math.round(
                          (product.stockQuantity /
                            max) *
                            100
                        )
                      );

                    return (
                      <div
                        className="inventory-item"
                        key={
                          product.id
                        }
                      >

                        <div className="inventory-top">

                          <div>
                            <strong>
                              {product.name}
                            </strong>

                            <span>
                              Reorder at{" "}
                              {
                                product.reorderThreshold
                              }
                            </span>
                          </div>

                          <b
                            className={
                              isLow
                                ? "low-value"
                                : "good-value"
                            }
                          >
                            {
                              product.stockQuantity
                            }{" "}
                            units
                          </b>

                        </div>

                        <div className="progress-track">

                          <div
                            className={
                              "progress-fill " +
                              (isLow
                                ? "danger-progress"
                                : "good-progress")
                            }
                            style={{
                              width:
                                percentage +
                                "%",
                            }}
                          />

                        </div>

                      </div>
                    );
                  }
                )
            )}

          </div>

        </div>

        {/* SALES */}

        <div className="panel sales-panel">

          <div className="panel-header">

            <div>
              <h2>
                Today's Performance
              </h2>

              <p>
                Sales overview
              </p>
            </div>

            <div className="live-dot">
              <span />
              Live
            </div>

          </div>

          <div className="sales-highlight">

            <span>
              TOTAL SALES
            </span>

            <strong>
              {formatMoney(
                dailySales
              )}
            </strong>

            <p>
              Revenue from finalized
              bills today
            </p>

          </div>

          <div className="performance-grid">

            <div>
              <ShoppingCart
                size={17}
              />

              <span>
                Bills
              </span>

              <strong>
                {finalizedBills}
              </strong>
            </div>

            <div>
              <Clock
                size={17}
              />

              <span>
                Pending
              </span>

              <strong>
                {draftBills}
              </strong>
            </div>

            <div>
              <Package
                size={17}
              />

              <span>
                Inventory
              </span>

              <strong>
                {formatMoney(
                  totalInventoryValue
                )}
              </strong>
            </div>

          </div>

        </div>

      </div>

      {/* LOW STOCK ALERT */}

      {lowStock.length > 0 && (

        <div className="alert-panel">

          <div className="alert-icon">
            <AlertTriangle
              size={20}
            />
          </div>

          <div>

            <strong>
              Low stock alert
            </strong>

            <p>
              {lowStock.length}{" "}
              product
              {lowStock.length > 1
                ? "s"
                : ""}{" "}
              need restocking.
            </p>

          </div>

          <button
            className="secondary-btn"
            onClick={() =>
              setPage(
                "low-stock"
              )
            }
          >
            Review Stock
          </button>

        </div>

      )}

    </div>
  );

  /*
   * ==============================
   * PRODUCTS PAGE
   * ==============================
   */

  const ProductsPage = () => (
    <div className="page">

      <div className="page-header">

        <div>
          <div className="eyebrow">
            INVENTORY
          </div>

          <h1>
            Products
          </h1>

          <p>
            Manage products,
            pricing and stock levels.
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={() =>
            setShowAddModal(true)
          }
        >
          <Plus size={16} />
          Add Product
        </button>

      </div>

      <div className="toolbar">

        <div className="search-box">

          <Search size={17} />

          <input
            placeholder="Search products..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />

          {search && (
            <button
              onClick={() =>
                setSearch("")
              }
            >
              <X size={14} />
            </button>
          )}

        </div>

        <span className="result-count">
          {filteredProducts.length}{" "}
          products
        </span>

      </div>

      <div className="panel">

        <div className="table-wrapper">

          <table>

            <thead>
              <tr>
                <th>ID</th>
                <th>Product</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Reorder</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>

              {filteredProducts.length ===
              0 ? (

                <tr>
                  <td
                    colSpan={7}
                    className="empty-cell"
                  >
                    No products found
                  </td>
                </tr>

              ) : (

                filteredProducts.map(
                  (product) => {

                    const isLow =
                      product.stockQuantity <=
                      product.reorderThreshold;

                    return (
                      <tr
                        key={
                          product.id
                        }
                      >

                        <td>
                          <span className="id-pill">
                            #{product.id}
                          </span>
                        </td>

                        <td>
                          <strong>
                            {product.name}
                          </strong>
                        </td>

                        <td>
                          {formatMoney(
                            product.price
                          )}
                        </td>

                        <td>
                          <strong>
                            {
                              product.stockQuantity
                            }
                          </strong>
                        </td>

                        <td>
                          {
                            product.reorderThreshold
                          }
                        </td>

                        <td>
                          <span
                            className={
                              "status-badge " +
                              (isLow
                                ? "warning"
                                : "success")
                            }
                          >
                            {isLow
                              ? "Low Stock"
                              : "Healthy"}
                          </span>
                        </td>

                        <td>

                          <div className="action-buttons">

                            <button
                              className="icon-btn"
                              title="Edit"
                              onClick={() =>
                                setEditingProduct(
                                  product
                                )
                              }
                            >
                              <Pencil
                                size={15}
                              />
                            </button>

                            <button
                              className="icon-btn danger"
                              title="Delete"
                              onClick={() =>
                                handleDeleteProduct(
                                  product.id
                                )
                              }
                            >
                              <Trash2
                                size={15}
                              />
                            </button>

                          </div>

                        </td>

                      </tr>
                    );
                  }
                )
              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );

  /*
   * ==============================
   * BILLING PAGE
   * ==============================
   */

  const BillingPage = () => (
    <div className="page">

      <div className="page-header">

        <div>
          <div className="eyebrow">
            TRANSACTIONS
          </div>

          <h1>
            Billing
          </h1>

          <p>
            Create, finalize and print
            customer bills.
          </p>
        </div>

      </div>

      <div className="billing-layout">

        {/* CREATE BILL */}

        <div className="panel">

          <div className="panel-header">

            <div>
              <h2>
                Create New Bill
              </h2>

              <p>
                Add products to the
                current transaction.
              </p>
            </div>

            <div className="bill-icon">
              <Receipt size={20} />
            </div>

          </div>

          <div className="billing-form">

            <div className="form-row billing-row">

              <div className="form-group">

                <label>
                  Product
                </label>

                <select
                  value={
                    selectedProduct
                  }
                  onChange={(event) =>
                    setSelectedProduct(
                      event.target.value ===
                        ""
                        ? ""
                        : Number(
                            event.target.value
                          )
                    )
                  }
                >

                  <option value="">
                    Select product
                  </option>

                  {products
                    .filter(
                      (product) =>
                        product.stockQuantity >
                        0
                    )
                    .map(
                      (product) => (
                        <option
                          key={
                            product.id
                          }
                          value={
                            product.id
                          }
                        >
                          {product.name}
                          {" — "}
                          {formatMoney(
                            product.price
                          )}
                          {" — Stock "}
                          {
                            product.stockQuantity
                          }
                        </option>
                      )
                    )}

                </select>

              </div>

              <div className="form-group quantity-group">

                <label>
                  Quantity
                </label>

                <input
                  type="number"
                  min="1"
                  value={
                    billQuantity
                  }
                  onChange={(event) =>
                    setBillQuantity(
                      Number(
                        event.target.value
                      )
                    )
                  }
                />

              </div>

              <button
                className="secondary-btn add-item-btn"
                onClick={
                  addBillItem
                }
              >
                <Plus size={16} />
                Add
              </button>

            </div>

            <div className="bill-items">

              {billItems.length ===
              0 ? (

                <div className="empty-state bill-empty">

                  <ShoppingCart
                    size={28}
                  />

                  <strong>
                    Your bill is empty
                  </strong>

                  <span>
                    Select products
                    above to add them.
                  </span>

                </div>

              ) : (

                billItems.map(
                  (item) => {

                    const product =
                      products.find(
                        (p) =>
                          p.id ===
                          item.productId
                      );

                    if (!product) {
                      return null;
                    }

                    return (
                      <div
                        className="bill-item"
                        key={
                          item.productId
                        }
                      >

                        <div className="bill-product">

                          <div className="bill-product-icon">
                            <Package
                              size={16}
                            />
                          </div>

                          <div>
                            <strong>
                              {
                                product.name
                              }
                            </strong>

                            <span>
                              {item.quantity}
                              {" × "}
                              {formatMoney(
                                product.price
                              )}
                            </span>
                          </div>

                        </div>

                        <div className="bill-item-right">

                          <strong>
                            {formatMoney(
                              product.price *
                                item.quantity
                            )}
                          </strong>

                          <button
                            className="icon-btn danger"
                            onClick={() =>
                              removeBillItem(
                                item.productId
                              )
                            }
                          >
                            <Trash2
                              size={15}
                            />
                          </button>

                        </div>

                      </div>
                    );
                  }
                )
              )}

            </div>

            <div className="bill-total">

              <span>
                Grand Total
              </span>

              <strong>
                {formatMoney(
                  billTotal
                )}
              </strong>

            </div>

            <button
              className="primary-btn full-width"
              disabled={
                creatingBill ||
                billItems.length ===
                  0
              }
              onClick={
                handleCreateBill
              }
            >

              <Receipt size={17} />

              {creatingBill
                ? "Creating..."
                : "Create Draft Bill"}

            </button>

          </div>

        </div>

      </div>

      {/* BILL HISTORY */}

      <div className="panel">

        <div className="panel-header">

          <div>
            <h2>
              Bill History
            </h2>

            <p>
              Recent transactions
            </p>
          </div>

          <span className="count-chip">
            {bills.length} Bills
          </span>

        </div>

        <div className="table-wrapper">

          <table>

            <thead>
              <tr>
                <th>Bill</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>

              {[...bills]
                .sort(
                  (a, b) =>
                    b.id -
                    a.id
                )
                .map(
                  (bill) => (
                    <tr
                      key={
                        bill.id
                      }
                    >

                      <td>
                        <span className="bill-number">
                          #{bill.id}
                        </span>
                      </td>

                      <td>
                        {formatDate(
                          bill.billDate
                        )}
                      </td>

                      <td>
                        {
                          bill.items
                            ?.length
                        }
                      </td>

                      <td>
                        <strong>
                          {formatMoney(
                            bill.totalAmount
                          )}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={
                            "status-badge " +
                            (bill.status ===
                            "FINALIZED"
                              ? "success"
                              : "pending")
                          }
                        >
                          {bill.status ===
                          "FINALIZED"
                            ? "Finalized"
                            : "Draft"}
                        </span>
                      </td>

                      <td>

                        <div className="bill-actions">

                          {bill.status ===
                          "DRAFT" ? (

                            <button
                              className="primary-btn small"
                              onClick={() =>
                                handleFinalize(
                                  bill.id
                                )
                              }
                            >
                              <CheckCircle
                                size={14}
                              />
                              Finalize
                            </button>

                          ) : (

                            <>

                              <span className="completed-text">
                                <CheckCircle
                                  size={13}
                                />
                                Completed
                              </span>

                              <button
                                className="secondary-btn small"
                                onClick={() =>
                                  handlePrintBill(
                                    bill
                                  )
                                }
                              >
                                <Printer
                                  size={14}
                                />
                                Print
                              </button>

                            </>
                          )}

                        </div>

                      </td>

                    </tr>
                  )
                )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );

  /*
   * ==============================
   * LOW STOCK
   * ==============================
   */

  const LowStockPage = () => (
    <div className="page">

      <div className="page-header">

        <div>
          <div className="eyebrow">
            INVENTORY ALERTS
          </div>

          <h1>
            Low Stock
          </h1>

          <p>
            Products that need
            restocking.
          </p>
        </div>

      </div>

      {lowStock.length > 0 && (

        <div className="alert-panel">

          <div className="alert-icon">
            <AlertTriangle
              size={20}
            />
          </div>

          <div>

            <strong>
              {lowStock.length}{" "}
              items require attention
            </strong>

            <p>
              Current stock is at or
              below the configured
              reorder level.
            </p>

          </div>

        </div>
      )}

      <div className="panel">

        <div className="table-wrapper">

          <table>

            <thead>
              <tr>
                <th>Product</th>
                <th>Current Stock</th>
                <th>Reorder Level</th>
                <th>Units Needed</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>

              {lowStock.length ===
              0 ? (

                <tr>
                  <td
                    colSpan={5}
                    className="empty-cell"
                  >
                    <CheckCircle
                      size={20}
                    />
                    All products have
                    healthy stock.
                  </td>
                </tr>

              ) : (

                lowStock.map(
                  (product) => {

                    const needed =
                      Math.max(
                        0,
                        product.reorderThreshold -
                          product.stockQuantity
                      );

                    return (
                      <tr
                        key={
                          product.id
                        }
                      >

                        <td>
                          <strong>
                            {product.name}
                          </strong>
                        </td>

                        <td>
                          <strong className="low-value">
                            {
                              product.stockQuantity
                            }
                          </strong>
                        </td>

                        <td>
                          {
                            product.reorderThreshold
                          }
                        </td>

                        <td>
                          +{needed}
                        </td>

                        <td>
                          <span className="status-badge warning">
                            Reorder Required
                          </span>
                        </td>

                      </tr>
                    );
                  }
                )
              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );

  /*
   * ==============================
   * SALES PAGE
   * ==============================
   */

  const SalesPage = () => {

    const finalized =
      bills.filter(
        (bill) =>
          bill.status ===
          "FINALIZED"
      );

    return (
      <div className="page">

        <div className="page-header">

          <div>
            <div className="eyebrow">
              REVENUE
            </div>

            <h1>
              Sales
            </h1>

            <p>
              Track finalized
              transactions.
            </p>
          </div>

        </div>

        <div className="stats-grid">

          <div className="stat-card sales-card">

            <div className="stat-icon green">
              <TrendingUp
                size={21}
              />
            </div>

            <div className="stat-content">

              <span>
                Today's Sales
              </span>

              <strong>
                {formatMoney(
                  dailySales
                )}
              </strong>

              <small>
                {getLocalDate()}
              </small>

            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon blue">
              <Receipt size={21} />
            </div>

            <div className="stat-content">

              <span>
                Finalized Bills
              </span>

              <strong>
                {finalized.length}
              </strong>

              <small>
                Completed transactions
              </small>

            </div>

          </div>

        </div>

        <div className="panel">

          <div className="panel-header">

            <div>
              <h2>
                Finalized Sales
              </h2>

              <p>
                Completed transactions
              </p>
            </div>

          </div>

          <div className="table-wrapper">

            <table>

              <thead>
                <tr>
                  <th>Bill</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>

                {[...finalized]
                  .sort(
                    (a, b) =>
                      b.id -
                      a.id
                  )
                  .map(
                    (bill) => (
                      <tr
                        key={
                          bill.id
                        }
                      >

                        <td>
                          <span className="bill-number">
                            #{bill.id}
                          </span>
                        </td>

                        <td>
                          {formatDate(
                            bill.billDate
                          )}
                        </td>

                        <td>
                          {
                            bill.items
                              ?.length
                          }
                        </td>

                        <td>
                          <strong>
                            {formatMoney(
                              bill.totalAmount
                            )}
                          </strong>
                        </td>

                        <td>
                          <button
                            className="secondary-btn small"
                            onClick={() =>
                              handlePrintBill(
                                bill
                              )
                            }
                          >
                            <Printer
                              size={14}
                            />
                            Print
                          </button>
                        </td>

                      </tr>
                    )
                  )}

              </tbody>

            </table>

          </div>

        </div>

      </div>
    );
  };

  /*
   * ==============================
   * ADD PRODUCT MODAL
   * ==============================
   */

  const AddProductModal = () => {

    const [form, setForm] =
      useState<ProductFormData>({
        name: "",
        price: 0,
        stockQuantity: 0,
        reorderThreshold: 5,
      });

    const submit = (
      event: FormEvent
    ) => {
      event.preventDefault();

      if (
        !form.name.trim()
      ) {
        alert(
          "Product name is required"
        );
        return;
      }

      if (
        form.price <= 0
      ) {
        alert(
          "Price must be greater than zero"
        );
        return;
      }

      if (
        form.stockQuantity < 0
      ) {
        alert(
          "Stock cannot be negative"
        );
        return;
      }

      handleAddProduct(
        form
      );
    };

    return (
      <div
        className="modal-overlay"
        onClick={() =>
          setShowAddModal(false)
        }
      >

        <div
          className="modal"
          onClick={(event) =>
            event.stopPropagation()
          }
        >

          <div className="modal-header">

            <div>
              <h2>
                Add Product
              </h2>

              <p>
                Create a new inventory
                item.
              </p>
            </div>

            <button
              className="icon-btn"
              onClick={() =>
                setShowAddModal(false)
              }
            >
              <X size={18} />
            </button>

          </div>

          <form
            onSubmit={submit}
          >

            <div className="form-group">

              <label>
                Product Name
              </label>

              <input
                value={form.name}
                placeholder="Example: Rice Premium"
                onChange={(event) =>
                  setForm({
                    ...form,
                    name:
                      event.target.value,
                  })
                }
              />

            </div>

            <div className="form-row">

              <div className="form-group">

                <label>
                  Price
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      price:
                        Number(
                          event.target.value
                        ),
                    })
                  }
                />

              </div>

              <div className="form-group">

                <label>
                  Stock
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    form.stockQuantity
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      stockQuantity:
                        Number(
                          event.target.value
                        ),
                    })
                  }
                />

              </div>

            </div>

            <div className="form-group">

              <label>
                Reorder Threshold
              </label>

              <input
                type="number"
                min="0"
                value={
                  form.reorderThreshold
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    reorderThreshold:
                      Number(
                        event.target.value
                      ),
                  })
                }
              />

            </div>

            <div className="modal-actions">

              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  setShowAddModal(false)
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-btn"
              >
                <Plus size={16} />
                Add Product
              </button>

            </div>

          </form>

        </div>

      </div>
    );
  };

  /*
   * ==============================
   * EDIT PRODUCT MODAL
   * ==============================
   */

  const EditProductModal = ({
    product,
  }: {
    product: Product;
  }) => {

    const [form, setForm] =
      useState<ProductFormData>({
        name: product.name,
        price: product.price,
        stockQuantity:
          product.stockQuantity,
        reorderThreshold:
          product.reorderThreshold,
      });

    const submit = (
      event: FormEvent
    ) => {
      event.preventDefault();

      handleUpdateProduct(
        form
      );
    };

    return (
      <div
        className="modal-overlay"
        onClick={() =>
          setEditingProduct(null)
        }
      >

        <div
          className="modal"
          onClick={(event) =>
            event.stopPropagation()
          }
        >

          <div className="modal-header">

            <div>
              <h2>
                Edit Product
              </h2>

              <p>
                Update inventory details.
              </p>
            </div>

            <button
              className="icon-btn"
              onClick={() =>
                setEditingProduct(null)
              }
            >
              <X size={18} />
            </button>

          </div>

          <form
            onSubmit={submit}
          >

            <div className="form-group">

              <label>
                Product Name
              </label>

              <input
                value={form.name}
                onChange={(event) =>
                  setForm({
                    ...form,
                    name:
                      event.target.value,
                  })
                }
              />

            </div>

            <div className="form-row">

              <div className="form-group">

                <label>
                  Price
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      price:
                        Number(
                          event.target.value
                        ),
                    })
                  }
                />

              </div>

              <div className="form-group">

                <label>
                  Stock
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    form.stockQuantity
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      stockQuantity:
                        Number(
                          event.target.value
                        ),
                    })
                  }
                />

              </div>

            </div>

            <div className="form-group">

              <label>
                Reorder Threshold
              </label>

              <input
                type="number"
                min="0"
                value={
                  form.reorderThreshold
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    reorderThreshold:
                      Number(
                        event.target.value
                      ),
                  })
                }
              />

            </div>

            <div className="modal-actions">

              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  setEditingProduct(null)
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-btn"
              >
                <CheckCircle
                  size={16}
                />
                Save Changes
              </button>

            </div>

          </form>

        </div>

      </div>
    );
  };

  /*
   * ==============================
   * MAIN APP
   * ==============================
   */

  return (
    <div className="app-shell">

      <aside className="sidebar">

        <div className="brand">

          <div className="brand-icon">
            <Boxes size={21} />
          </div>

          <div>
            <strong>
              ShopLite
            </strong>

            <span>
              Inventory & Billing
            </span>
          </div>

        </div>

        <div className="sidebar-label">
          MAIN MENU
        </div>

        <nav className="nav">

          <NavItem
            icon={
              <LayoutDashboard
                size={17}
              />
            }
            label="Dashboard"
            value="dashboard"
          />

          <NavItem
            icon={
              <Package size={17} />
            }
            label="Products"
            value="products"
          />

          <NavItem
            icon={
              <Receipt size={17} />
            }
            label="Billing"
            value="billing"
          />

          <NavItem
            icon={
              <AlertTriangle
                size={17}
              />
            }
            label="Low Stock"
            value="low-stock"
            badge={
              lowStock.length
            }
          />

          <NavItem
            icon={
              <BarChart3 size={17} />
            }
            label="Sales"
            value="sales"
          />

        </nav>

        <div className="sidebar-bottom">

          <div className="sidebar-status">

            <span className="status-dot" />

            System Online

          </div>

          <small>
            ShopLite v1.0
          </small>

        </div>

      </aside>

      <main className="main">

        {page ===
          "dashboard" && (
          <Dashboard />
        )}

        {page ===
          "products" && (
          <ProductsPage />
        )}

        {page ===
          "billing" && (
          <BillingPage />
        )}

        {page ===
          "low-stock" && (
          <LowStockPage />
        )}

        {page ===
          "sales" && (
          <SalesPage />
        )}

      </main>

      {showAddModal && (
        <AddProductModal />
      )}

      {editingProduct && (
        <EditProductModal
          product={
            editingProduct
          }
        />
      )}

      {/* PRINT BILL */}

      {billToPrint && (
        <div className="print-bill">

          <div className="print-header">

            <h1>
              ShopLite
            </h1>

            <p>
              Small Shop Inventory &
              Billing System
            </p>

          </div>

          <div className="print-divider" />

          <div className="print-details">

            <div>
              <strong>
                Bill ID
              </strong>

              <span>
                #{billToPrint.id}
              </span>
            </div>

            <div>
              <strong>
                Date
              </strong>

              <span>
                {formatDate(
                  billToPrint.billDate
                )}
              </span>
            </div>

            <div>
              <strong>
                Status
              </strong>

              <span>
                {billToPrint.status}
              </span>
            </div>

          </div>

          <table className="print-table">

            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Subtotal</th>
              </tr>
            </thead>

            <tbody>

              {billToPrint.items?.map(
                (
                  item,
                  index
                ) => (
                  <tr
                    key={
                      item.id ??
                      index
                    }
                  >

                    <td>
                      {index + 1}
                    </td>

                    <td>
                      {
                        item.product
                          ?.name
                      }
                    </td>

                    <td>
                      {item.quantity}
                    </td>

                    <td>
                      {formatMoney(
                        item.unitPrice
                      )}
                    </td>

                    <td>
                      {formatMoney(
                        item.subtotal
                      )}
                    </td>

                  </tr>
                )
              )}

            </tbody>

          </table>

          <div className="print-total">

            <span>
              Grand Total
            </span>

            <strong>
              {formatMoney(
                billToPrint.totalAmount
              )}
            </strong>

          </div>

          <div className="print-footer">

            <p>
              Thank you for shopping
              with us!
            </p>

            <small>
              Generated by ShopLite
            </small>

          </div>

        </div>
      )}

    </div>
  );
}

export default App;