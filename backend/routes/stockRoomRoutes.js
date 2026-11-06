const express = require("express");
const router = express.Router();
const GarmentStock = require("../models/GarmentStock");
const Item = require("../models/Item");
const Lead = require("../models/Lead");

// Unified garment stock records reflecting real project catalog & reference garment cuts
const SEED_GARMENTS = [
  {
    product: "Relaxed Boat T-Shirt",
    colour: "Blue",
    cut: "round neck",
    location: "Main Stockroom",
    type: "Stock",
    sizes: { XS: 4, S: 7, M: 6, L: 6, XL: 7, XXL: 8 },
    transactions: [
      {
        type: "Inward / Restock",
        size: "M",
        quantity: 10,
        impact: 10,
        notes: "Initial supplier production batch",
        loggedBy: "Elena Rostova (Stock Room Manager)",
      },
      {
        type: "Used",
        size: "M",
        quantity: 4,
        impact: -4,
        orderId: "ORD00001",
        clientName: "Divyanshi Enterprises",
        notes: "Sample batch allocation for DTF printing",
        loggedBy: "Elena Rostova (Stock Room Manager)",
      },
    ],
  },
  {
    product: "Relaxed Boat T-Shirt",
    colour: "Blue",
    cut: "v-neck",
    location: "Main Stockroom",
    type: "Stock",
    sizes: { XS: 7, S: 6, M: 6, L: 5, XL: 7, XXL: 5 },
    transactions: [
      {
        type: "Inward / Restock",
        size: "XS",
        quantity: 10,
        impact: 10,
        notes: "Intake from cutting floor",
        loggedBy: "Elena Rostova (Stock Room Manager)",
      },
    ],
  },
  {
    product: "Relaxed Boat T-Shirt",
    colour: "Orange",
    cut: "round neck",
    location: "Main Stockroom",
    type: "Stock",
    sizes: { XS: 3, S: 6, M: 6, L: 5, XL: 5, XXL: 6 },
    transactions: [
      {
        type: "Inward / Restock",
        size: "S",
        quantity: 10,
        impact: 10,
        notes: "Autumn color run replenishment",
        loggedBy: "Elena Rostova (Stock Room Manager)",
      },
    ],
  },
  {
    product: "T-Shirt",
    colour: "Black",
    cut: "100% Cotton",
    location: "Main Stockroom",
    type: "Stock",
    sizes: { XS: 12, S: 25, M: 40, L: 35, XL: 18, XXL: 8 },
    transactions: [
      {
        type: "Inward / Restock",
        size: "M",
        quantity: 50,
        impact: 50,
        notes: "Bulk intake from Tirupur textile mill",
        loggedBy: "Elena Rostova (Stock Room Manager)",
      },
      {
        type: "Reserved",
        size: "M",
        quantity: 10,
        impact: -10,
        orderId: "ORD00002",
        clientName: "Nexus Apparel",
        notes: "Reserved for batch order printing",
        loggedBy: "Elena Rostova (Stock Room Manager)",
      },
    ],
  },
  {
    product: "T-Shirt",
    colour: "White",
    cut: "Dry-Fit",
    location: "Main Stockroom",
    type: "Stock",
    sizes: { XS: 15, S: 25, M: 35, L: 30, XL: 20, XXL: 10 },
    transactions: [
      {
        type: "Inward / Restock",
        size: "ALL",
        quantity: 135,
        impact: 135,
        notes: "Sports dry-fit active stock intake",
        loggedBy: "Elena Rostova (Stock Room Manager)",
      },
    ],
  },
  {
    product: "T-Shirt",
    colour: "Blue",
    cut: "Cotton",
    location: "Main Stockroom",
    type: "Stock",
    sizes: { XS: 20, S: 30, M: 45, L: 35, XL: 25, XXL: 15 },
    transactions: [
      {
        type: "Inward / Restock",
        size: "M",
        quantity: 60,
        impact: 60,
        notes: "Regular cotton apparel stock",
        loggedBy: "Elena Rostova (Stock Room Manager)",
      },
    ],
  },
  {
    product: "T-Shirt",
    colour: "Red",
    cut: "Cotton",
    location: "Main Stockroom",
    type: "Stock",
    sizes: { XS: 10, S: 15, M: 25, L: 20, XL: 12, XXL: 5 },
  },
  {
    product: "Shirt",
    colour: "White",
    cut: "Cotton",
    location: "Main Stockroom",
    type: "Stock",
    sizes: { XS: 5, S: 12, M: 25, L: 20, XL: 15, XXL: 6 },
    transactions: [
      {
        type: "Inward / Restock",
        size: "M",
        quantity: 30,
        impact: 30,
        notes: "Formal shirt inventory arrival",
        loggedBy: "Elena Rostova (Stock Room Manager)",
      },
    ],
  },
  {
    product: "Shirt",
    colour: "Sky Blue",
    cut: "100% Cotton",
    location: "Main Stockroom",
    type: "Stock",
    sizes: { XS: 4, S: 10, M: 18, L: 16, XL: 10, XXL: 4 },
  },
  {
    product: "Shirt",
    colour: "Black",
    cut: "Lycra",
    location: "Main Stockroom",
    type: "Stock",
    sizes: { XS: 6, S: 12, M: 22, L: 18, XL: 12, XXL: 5 },
  },
  {
    product: "Hoodie",
    colour: "Black",
    cut: "Fleece",
    location: "Main Stockroom",
    type: "Stock",
    sizes: { XS: 8, S: 15, M: 28, L: 24, XL: 16, XXL: 8 },
    transactions: [
      {
        type: "Inward / Restock",
        size: "M",
        quantity: 35,
        impact: 35,
        notes: "Winter fleece apparel intake",
        loggedBy: "Elena Rostova (Stock Room Manager)",
      },
    ],
  },
  {
    product: "Hoodie",
    colour: "Navy",
    cut: "Poly-Cotton",
    location: "Main Stockroom",
    type: "Stock",
    sizes: { XS: 6, S: 12, M: 20, L: 18, XL: 12, XXL: 6 },
  },
  {
    product: "Hoodie",
    colour: "Grey",
    cut: "Cotton",
    location: "Main Stockroom",
    type: "Stock",
    sizes: { XS: 5, S: 10, M: 16, L: 14, XL: 10, XXL: 4 },
  },
  {
    product: "Sweatshirt",
    colour: "blue",
    cut: "cotton",
    location: "Main Stockroom",
    type: "Stock",
    sizes: { XS: 4, S: 8, M: 15, L: 12, XL: 8, XXL: 3 },
  },
  {
    product: "Sweatshirt",
    colour: "green",
    cut: "cotton",
    location: "Main Stockroom",
    type: "Stock",
    sizes: { XS: 3, S: 6, M: 12, L: 10, XL: 6, XXL: 2 },
  },
];

// Helper to calculate summary metrics
const calculateMetrics = (stocks) => {
  let totalItems = 0;
  let lowStockAlerts = 0;
  let itemsOutOfStock = 0;
  let activeReserved = 0;
  let overdueReservations = 0;
  let overduePieces = 0;
  const sizeKeys = ["XS", "S", "M", "L", "XL", "XXL"];
  const now = Date.now();
  const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

  stocks.forEach((stock) => {
    sizeKeys.forEach((sz) => {
      const qty = Number(stock.sizes?.[sz] || 0);
      totalItems += qty;
      const threshold = stock.lowStockThreshold || 2;
      if (qty === 0) {
        itemsOutOfStock += 1;
      } else if (qty <= threshold) {
        lowStockAlerts += 1;
      }
    });

    (stock.reservations || []).forEach((r) => {
      if (r.status === "Active") {
        const rQty = Number(r.quantity) || 0;
        activeReserved += rQty;
        const createdTime = new Date(r.createdAt || stock.createdAt || now).getTime();
        if (now - createdTime >= FIVE_DAYS_MS) {
          overdueReservations += 1;
          overduePieces += rQty;
        }
      }
    });
  });

  const availableItems = Math.max(0, totalItems - activeReserved);

  return {
    totalItems,
    availableItems,
    activeReserved,
    overdueReservations,
    overduePieces,
    lowStockAlerts,
    itemsOutOfStock,
  };
};

// GET /api/stock-room - Fetch all stock garments without location grouping
router.get("/", async (req, res) => {
  try {
    let stocks = await GarmentStock.find().sort({
      product: 1,
      colour: 1,
      cut: 1,
    });

    // If empty, seed
    if (stocks.length === 0) {
      await GarmentStock.insertMany(SEED_GARMENTS);
      stocks = await GarmentStock.find().sort({
        product: 1,
        colour: 1,
        cut: 1,
      });
    }

    const metrics = calculateMetrics(stocks);

    res.json({
      success: true,
      count: stocks.length,
      metrics,
      data: stocks,
    });
  } catch (error) {
    console.error("Error fetching stock room items:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/stock-room/order-allocations - Pending order garment requirements
router.get("/order-allocations", async (req, res) => {
  try {
    const activeOrders = await Lead.find(
      {
        $or: [
          { query: "order" },
          { orderId: { $exists: true, $ne: "" } },
          { orderStage: { $exists: true, $ne: "" } },
        ],
        isCompleted: { $ne: true },
      },
      {
        orderId: 1,
        taskId: 1,
        clientName: 1,
        companyName: 1,
        orderStage: 1,
        subStage: 1,
        stockTaskStage: 1,
        stockApproval: 1,
        items: 1,
        deliveryDate: 1,
        createdAt: 1,
      }
    ).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: activeOrders.length,
      data: activeOrders,
    });
  } catch (error) {
    console.error("Error fetching order allocations:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/stock-room/:id/history - Get transaction history for an item
router.get("/:id/history", async (req, res) => {
  try {
    const stock = await GarmentStock.findById(req.params.id);
    if (!stock) {
      return res
        .status(404)
        .json({ success: false, message: "Garment stock not found" });
    }

    const { size } = req.query;
    let transactions = stock.transactions || [];
    if (size) {
      transactions = transactions.filter(
        (t) => t.size === size || t.size === "ALL"
      );
    }

    transactions.sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

    res.json({
      success: true,
      product: stock.product,
      colour: stock.colour,
      cut: stock.cut,
      transactions,
    });
  } catch (error) {
    console.error("Error fetching stock history:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/stock-room/adjust - Stock inward, adjustment, or order fulfillment deduction
router.post("/adjust", async (req, res) => {
  try {
    const {
      stockId,
      size,
      type,
      quantity,
      notes,
      orderId,
      clientName,
      loggedBy,
    } = req.body;

    if (!stockId || !size) {
      return res
        .status(400)
        .json({ success: false, message: "stockId and size are required" });
    }

    const stock = await GarmentStock.findById(stockId);
    if (!stock) {
      return res
        .status(404)
        .json({ success: false, message: "Garment stock record not found" });
    }

    const validSizes = ["XS", "S", "M", "L", "XL", "XXL"];
    if (!validSizes.includes(size)) {
      return res.status(400).json({
        success: false,
        message: `Invalid size: ${size}. Valid sizes are ${validSizes.join(", ")}`,
      });
    }

    const qtyNum = Math.abs(parseInt(quantity, 10) || 0);
    const currentQty = Number(stock.sizes[size] || 0);
    let newQty = currentQty;
    let impact = 0;

    const actionType = type || "Inward / Restock";

    if (actionType === "Inward / Restock") {
      newQty = currentQty + qtyNum;
      impact = qtyNum;
    } else if (actionType === "Used" || actionType === "Reserved") {
      newQty = Math.max(0, currentQty - qtyNum);
      impact = -qtyNum;
    } else if (actionType === "Adjustment") {
      newQty = qtyNum;
      impact = qtyNum - currentQty;
    }

    stock.sizes[size] = newQty;

    stock.transactions.unshift({
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: actionType,
      size,
      quantity: qtyNum,
      impact,
      orderId: (orderId || "").trim(),
      clientName: (clientName || "").trim(),
      notes: (notes || "").trim() || `${actionType} of ${qtyNum} pcs for size ${size}`,
      loggedBy: (loggedBy || "Elena Rostova (Stock Room Manager)").trim(),
      createdAt: new Date(),
    });

    await stock.save();

    const allStocks = await GarmentStock.find();
    const metrics = calculateMetrics(allStocks);

    res.json({
      success: true,
      message: `Stock updated successfully for ${stock.product} (${size}): ${currentQty} → ${newQty}`,
      data: stock,
      metrics,
    });
  } catch (error) {
    console.error("Error adjusting stock:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/stock-room/restock - Multi-size restock for an existing garment record
router.post("/restock", async (req, res) => {
  try {
    const { stockId, sizes, notes, loggedBy } = req.body;

    if (!stockId || !sizes || typeof sizes !== "object") {
      return res.status(400).json({
        success: false,
        message: "stockId and sizes object are required.",
      });
    }

    const stock = await GarmentStock.findById(stockId);
    if (!stock) {
      return res.status(404).json({
        success: false,
        message: "Garment stock record not found.",
      });
    }

    const validSizes = ["XS", "S", "M", "L", "XL", "XXL"];
    let totalAdded = 0;
    const dateStr = new Date().toISOString().split("T")[0];
    const timeStr = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    validSizes.forEach((sz) => {
      const addQty = Math.max(0, parseInt(sizes[sz], 10) || 0);
      if (addQty > 0) {
        stock.sizes[sz] = Number(stock.sizes[sz] || 0) + addQty;
        totalAdded += addQty;

        stock.transactions.unshift({
          date: dateStr,
          time: timeStr,
          type: "Inward / Restock",
          size: sz,
          quantity: addQty,
          impact: addQty,
          notes: (notes || "").trim() || `Restock batch: +${addQty} pcs for size ${sz}`,
          loggedBy: (loggedBy || "Elena Rostova (Stock Room Manager)").trim(),
          createdAt: new Date(),
        });
      }
    });

    if (totalAdded === 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter a restock quantity greater than 0 for at least one size.",
      });
    }

    await stock.save();

    const allStocks = await GarmentStock.find();
    const metrics = calculateMetrics(allStocks);

    res.json({
      success: true,
      message: `Successfully restocked ${totalAdded} pcs into ${stock.product} (${stock.colour}, ${stock.cut})!`,
      data: stock,
      metrics,
    });
  } catch (error) {
    console.error("Error restocking garment:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/stock-room/item - Add new garment stock entry (no location required)
router.post("/item", async (req, res) => {
  try {
    const { product, colour, cut, type, sizes, lowStockThreshold } = req.body;

    if (!product || !colour || !cut) {
      return res.status(400).json({
        success: false,
        message: "product, colour, and cut are required.",
      });
    }

    const existing = await GarmentStock.findOne({
      product: product.trim(),
      colour: colour.trim(),
      cut: cut.trim(),
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `An inventory record for ${product} (${colour}, ${cut}) already exists.`,
      });
    }

    const newStock = await GarmentStock.create({
      product: product.trim(),
      colour: colour.trim(),
      cut: cut.trim(),
      location: "Main Stockroom",
      type: type || "Stock",
      sizes: sizes || { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
      lowStockThreshold: lowStockThreshold || 2,
      transactions: [
        {
          type: "Inward / Restock",
          size: "ALL",
          quantity: Object.values(sizes || {}).reduce(
            (a, b) => a + Number(b || 0),
            0
          ),
          impact: Object.values(sizes || {}).reduce(
            (a, b) => a + Number(b || 0),
            0
          ),
          notes: "Initial creation of garment inventory record",
          loggedBy: "Elena Rostova (Stock Room Manager)",
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Garment stock record created.",
      data: newStock,
    });
  } catch (error) {
    console.error("Error adding garment stock:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/stock-room/reset-real - Replace previous seed data with clean real project catalog
router.post("/reset-real", async (req, res) => {
  try {
    await GarmentStock.deleteMany({});
    await GarmentStock.insertMany(SEED_GARMENTS);
    const stocks = await GarmentStock.find().sort({
      product: 1,
      colour: 1,
      cut: 1,
    });
    const metrics = calculateMetrics(stocks);
    res.json({
      success: true,
      message: "Stock room updated with unified real garment catalog.",
      metrics,
      data: stocks,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/stock-room/reserve - Reserve garment stock for a specific Order ID
router.post("/reserve", async (req, res) => {
  try {
    const {
      stockId,
      size,
      orderId,
      clientName,
      quantity,
      notes,
      loggedBy,
    } = req.body;

    if (!stockId || !size || !orderId) {
      return res.status(400).json({
        success: false,
        message: "stockId, size, and orderId are required to reserve stock.",
      });
    }

    const stock = await GarmentStock.findById(stockId);
    if (!stock) {
      return res.status(404).json({ success: false, message: "Garment stock not found." });
    }

    const validSizes = ["XS", "S", "M", "L", "XL", "XXL"];
    if (!validSizes.includes(size)) {
      return res.status(400).json({
        success: false,
        message: `Invalid size ${size}. Valid sizes are ${validSizes.join(", ")}`,
      });
    }

    const qtyNum = parseInt(quantity, 10);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive number greater than 0.",
      });
    }

    const totalPhysical = Number(stock.sizes[size] || 0);
    const activeReserved = (stock.reservations || [])
      .filter((r) => r.size === size && r.status === "Active")
      .reduce((acc, r) => acc + (r.quantity || 0), 0);

    const availableToReserve = totalPhysical - activeReserved;

    if (qtyNum > availableToReserve) {
      return res.status(400).json({
        success: false,
        message: `Cannot reserve ${qtyNum} pcs. Only ${Math.max(0, availableToReserve)} pcs currently available to reserve for ${stock.product} (${stock.colour}, ${size}).`,
      });
    }

    const reservation = {
      orderId: orderId.trim(),
      clientName: (clientName || "").trim(),
      size,
      quantity: qtyNum,
      notes: (notes || "").trim() || `Reserved ${qtyNum} pcs for ${orderId}`,
      reservedBy: (loggedBy || "Elena Rostova (Stock Room Manager)").trim(),
      status: "Active",
      createdAt: new Date(),
    };

    if (!stock.reservations) stock.reservations = [];
    stock.reservations.unshift(reservation);

    stock.transactions.unshift({
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: "Reserved",
      size,
      quantity: qtyNum,
      impact: -qtyNum,
      orderId: orderId.trim(),
      clientName: (clientName || "").trim(),
      notes: (notes || "").trim() || `Reserved ${qtyNum} pcs for ${orderId}`,
      loggedBy: (loggedBy || "Elena Rostova (Stock Room Manager)").trim(),
      createdAt: new Date(),
    });

    await stock.save();

    res.json({
      success: true,
      message: `Successfully reserved ${qtyNum} pcs of ${stock.product} (${stock.colour}, ${size}) for order ${orderId}.`,
      data: stock,
      reservation: stock.reservations[0],
    });
  } catch (error) {
    console.error("Error creating reservation:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/stock-room/release-reservation - Release an active reservation back to available stock
router.post("/release-reservation", async (req, res) => {
  try {
    const { stockId, reservationId, loggedBy, notes } = req.body;
    if (!stockId || !reservationId) {
      return res.status(400).json({
        success: false,
        message: "stockId and reservationId are required.",
      });
    }

    if (!notes || !notes.trim()) {
      return res.status(400).json({
        success: false,
        message: "Release notes are mandatory (*). Please enter a reason before releasing this reservation.",
      });
    }

    const stock = await GarmentStock.findById(stockId);
    if (!stock) {
      return res.status(404).json({ success: false, message: "Garment stock not found." });
    }

    const targetRes = (stock.reservations || []).id
      ? stock.reservations.id(reservationId)
      : stock.reservations.find((r) => String(r._id) === String(reservationId));

    if (!targetRes) {
      return res.status(404).json({ success: false, message: "Reservation not found." });
    }

    if (targetRes.status !== "Active") {
      return res.status(400).json({
        success: false,
        message: `Reservation is already ${targetRes.status}.`,
      });
    }

    targetRes.status = "Released";
    targetRes.releaseNotes = notes.trim();

    stock.transactions.unshift({
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: "Adjustment",
      size: targetRes.size,
      quantity: targetRes.quantity,
      impact: targetRes.quantity,
      orderId: targetRes.orderId,
      clientName: targetRes.clientName || "",
      notes: `Released: ${notes.trim()} (Order: ${targetRes.orderId})`,
      loggedBy: (loggedBy || "Elena Rostova (Stock Room Manager)").trim(),
      createdAt: new Date(),
    });

    await stock.save();

    res.json({
      success: true,
      message: `Released reservation for ${targetRes.orderId} (${targetRes.quantity} pcs of size ${targetRes.size}).`,
      data: stock,
    });
  } catch (error) {
    console.error("Error releasing reservation:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/stock-room/reservations/order/:orderId - Fetch all reservations for a given Order ID
router.get("/reservations/order/:orderId", async (req, res) => {
  try {
    const rawOrderId = req.params.orderId.trim();
    if (!rawOrderId) {
      return res.json({ success: true, data: [] });
    }

    const stocks = await GarmentStock.find({
      "reservations.orderId": { $regex: new RegExp(`^${rawOrderId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") },
    });

    const activeReservations = [];
    stocks.forEach((st) => {
      (st.reservations || []).forEach((r) => {
        if (
          r.orderId.toLowerCase() === rawOrderId.toLowerCase() &&
          r.status === "Active"
        ) {
          activeReservations.push({
            _id: r._id,
            stockId: st._id,
            product: st.product,
            colour: st.colour,
            cut: st.cut,
            location: st.location,
            size: r.size,
            quantity: r.quantity,
            notes: r.notes,
            reservedBy: r.reservedBy,
            status: r.status,
            createdAt: r.createdAt,
          });
        }
      });
    });

    res.json({
      success: true,
      orderId: rawOrderId,
      count: activeReservations.length,
      data: activeReservations,
    });
  } catch (error) {
    console.error("Error fetching order reservations:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/stock-room/all-reservations - Fetch all garment reservations across all warehouse stocks
router.get("/all-reservations", async (req, res) => {
  try {
    const stocks = await GarmentStock.find({ "reservations.0": { $exists: true } });
    const all = [];
    const now = Date.now();
    const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

    stocks.forEach((st) => {
      (st.reservations || []).forEach((r) => {
        const createdTime = new Date(r.createdAt || st.createdAt || now).getTime();
        const daysReserved = Math.floor((now - createdTime) / (1000 * 60 * 60 * 24));
        all.push({
          _id: r._id,
          stockId: st._id,
          product: st.product,
          colour: st.colour,
          cut: st.cut,
          location: st.location,
          orderId: r.orderId,
          clientName: r.clientName || "",
          size: r.size,
          quantity: r.quantity,
          notes: r.notes || "",
          reservedBy: r.reservedBy || "Elena Rostova (Stock Room Manager)",
          status: r.status,
          createdAt: r.createdAt,
          daysReserved,
          isOverdue: r.status === "Active" && daysReserved >= 5,
        });
      });
    });

    all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      count: all.length,
      data: all,
    });
  } catch (error) {
    console.error("Error fetching all reservations:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
