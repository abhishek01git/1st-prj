const mongoose = require("mongoose");
const Order = require("../../models/oderSchemma");

const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate("userId")
      .populate("address")
      .sort({ createdAt: -1 })
      .exec();
    res.render("oder", { orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("Server Error");
  }
};

const getOrderDetails = async (req, res) => {
  const orderId = req.params.orderId;

  try {
    const order = await Order.findById(orderId)
      .populate("userId")
      .populate("address")
      .exec();
    if (!order) {
      return res.status(404).send("Order not found");
    }
    res.render("oderDetails", { order });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).send("Server Error");
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.query.id;
    const status = req.body.orderStatus;
    console.log('oderid is here',orderId);
    console.log('ststus is here',status);
    
    
    
    const validStatuses = ["Pending", "Shipped", "Delivered", "canceled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid order status" });
    }
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    
    if (order.status === "Delivered" || order.status === "canceled") {
      return res.status(403).json({ success: false, message: `Order status cannot be updated to '${status}'` });
    }
    
    order.status = status;
    await order.save();

    
    
    res.status(200).json({ success: true, message: "Order status updated successfully", newStatus: order.status });
    
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


module.exports = {
  getAllOrders,
  getOrderDetails,
  updateOrderStatus,
};
