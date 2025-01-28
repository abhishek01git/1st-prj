const mongoose = require("mongoose");
const Order = require("../../models/oderSchemma");
const moment = require('moment');
const PDFDocument = require('pdfkit');
const xlsx = require('xlsx');
const fs = require('fs');
const ExcelJS = require('exceljs');



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

const approveReturn = async (req, res) => {
  try {
    const { orderId } = req.params;

   
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    
    const order = await Order.findById(orderId).populate('items.productId');
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    console.log("Order fetched: ", order);
    
    
    const hasPendingReturnRequests = order.returnStatus === "Requested" || order.items.some(item => item.returnStatus === "Requested");

    if (hasPendingReturnRequests) {
     
      order.returnStatus = "Approved";

   
      order.items.forEach(item => {
        if (item.returnStatus === "Requested") {
          item.returnStatus = "Approved"; 
        }
      });

      
      await order.save();

      console.log("Updated order: ", order);

      return res.status(200).json({
        success: true,
        message: "Return request approved successfully.",
        order,
      });
    } else {
      return res.status(400).json({
        message: "No pending return request at the order level or for individual items.",
      });
    }
  } catch (error) {
    console.error("Error in approveReturn:", error);
    res.status(500).json({ message: "Server error" });
  }
};


const loadReport = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1); 
    const limit = 6; 
    const skip = (page - 1) * limit;
    

    console.log('Requested Page:', page); 

    
    const orders = await Order.find({
      $or: [
        { status: 'Delivered' },
        { items: { $elemMatch: { cancelStatus: 'Cancelled' } } }
      ]
    })
      .populate('userId', 'name email') 
      .populate('items.productId', 'productName price') 
      .sort({ createdAt: -1 }) 
      .limit(limit)
      .skip(skip);

    console.log('Fetched Orders:', orders); 

   
    const totalOrders = await Order.countDocuments({
      $or: [
        { status: 'Delivered' },
        { items: { $elemMatch: { cancelStatus: 'Cancelled' } } }
      ]
    });

    console.log('Total Orders Count:', totalOrders); 

    const totalPages = Math.ceil(totalOrders / limit);

   
    const salesMetrics = await Order.aggregate([
      {
        $match: {
          $or: [
            { status: 'Delivered' },
            { items: { $elemMatch: { cancelStatus: 'Cancelled' } } }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    console.log('Sales Metrics:', salesMetrics); 

    const { totalRevenue, totalOrders: totalOrderCount, averageOrderValue } = salesMetrics[0] || {
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0
    };

    
    console.log('Render Data:', {
      orders,
      totalPages,
      currentPage: page,
      totalRevenue,
      totalOrderCount,
      averageOrderValue
    });

   
    res.render('reports', {
      orders,
      totalPages,
      currentPage: page,
      totalRevenue,
      totalOrderCount,
      averageOrderValue
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.redirect('/admin/pageerror'); 
  }
};



const loadPdf = async (req, res) => {
  try {
      const salesData = await Order.find({
          status: { $in: ["Delivered", "canceled"] }
      }).populate('items.productId'); 

      const doc = new PDFDocument({
          margin: 70, 
          size: 'A4'
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');

      doc.pipe(res);

      const totalSales = salesData.reduce((sum, order) => sum + order.totalAmount, 0);
      const totalOrders = salesData.length;
      const avgSale = totalOrders > 0 ? totalSales / totalOrders : 0;

      const formatCurrency = (amount) => `$${amount.toFixed(2)}`;

      doc.fontSize(24)
          .font('Helvetica-Bold')
          .text('Sales Report', {
              align: 'center'
          });

      doc.fontSize(12)
          .font('Helvetica')
          .text(new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
          }), {
              align: 'center'
          });

      doc.moveDown(2);

      const summaryBox = {
          x: 50,
          y: doc.y,
          width: doc.page.width - 100,
          height: 100,
          padding: 10
      };

      doc.rect(summaryBox.x, summaryBox.y, summaryBox.width, summaryBox.height)
          .fill('#f5f5f5');

      doc.fill('#000000')
          .font('Helvetica-Bold')
          .text('Summary', summaryBox.x + summaryBox.padding, summaryBox.y + summaryBox.padding)
          .font('Helvetica')
          .moveDown(0.5)
          .text(`Total Sales: ${formatCurrency(totalSales)}`)
          .text(`Total Orders: ${totalOrders}`)
          .text(`Average Sale: ${formatCurrency(avgSale)}`);

      doc.moveDown(2);

      const headers = ['Date', 'Order ID', 'Status', 'Items', 'Amount'];
      const columnWidths = {
          date: 100, 
          orderId: 120, 
          status: 100, 
          items: 200, 
          amount: 100 
      };

      let startX = 50;
      let startY = doc.y;

      doc.rect(startX, startY, doc.page.width - 100, 25) 
          .fill('#4CAF50');

      doc.fillColor('#FFFFFF');
      let currentX = startX + 5;
      headers.forEach((header, i) => {
          doc.text(
              header,
              currentX,
              startY + 8, 
              { width: Object.values(columnWidths)[i], align: 'left' }
          );
          currentX += Object.values(columnWidths)[i];
      });

      doc.fillColor('#000000');
      startY += 25;

      salesData.forEach((order, index) => {
          if (startY + 25 > doc.page.height - 70) { 
              doc.addPage();
              startY = 50;
          }

          if (index % 2 === 0) {
              doc.rect(startX, startY, doc.page.width - 100, 25) 
                  .fill('#f2f2f2');
          }

          const orderDate = new Date(order.createdAt).toLocaleDateString();
          const itemsSummary = order.items
              .map(item => `${item.quantity}x ${item.productId.productName}`)
              .join(', ');

          currentX = startX + 5;
          doc.fillColor('#000000')
              .fontSize(10) 
              .text(orderDate, currentX, startY + 8, { width: columnWidths.date, align: 'left' });

          currentX += columnWidths.date;
          doc.text(order._id.toString().slice(-8), currentX, startY + 8, { width: columnWidths.orderId, align: 'left' });

          currentX += columnWidths.orderId;
          doc.text(order.status, currentX, startY + 8, { width: columnWidths.status, align: 'left' });

          currentX += columnWidths.status;
          doc.text(itemsSummary, currentX, startY + 8, { width: columnWidths.items, align: 'left' });

          currentX += columnWidths.items;
          doc.text(formatCurrency(order.totalAmount), currentX, startY + 8, { width: columnWidths.amount, align: 'right' });

          startY += 25;
      });

      
      let pageNumber = 1;
      doc.on('pageAdded', function() {
          doc.fontSize(10)
              .text(
                  `Page ${pageNumber} of ${doc.bufferedPageRange().count}`,
                  0,
                  doc.page.height - 50,
                  { align: 'center' }
              );
          pageNumber++;
      });

      doc.end();

  } catch (error) {
      console.error('PDF Generation Error:', error);
      res.status(500).json({
          success: false,
          message: 'Failed to generate PDF report'
      });
  }
};



const loadExcel = async (req, res) => {
  try {
      
      const orders = await Order.find({ status: { $in: ["Delivered", "Returned"] } })
          .lean()
          .populate('userId');

   
      const data = orders.map((order) => ({
          ID: order.orderId,
          Name: order.userId?.productName || 'N/A', 
          Email: order.userId?.email || 'N/A', 
          Total: `₹${order.totalAmount.toFixed(2)}`, 
          Status: order.status,
          Date: new Date(order.createdAt).toLocaleDateString(), 
      }));

      
      const workbook = xlsx.utils.book_new();
      const worksheet = xlsx.utils.json_to_sheet(data);

     
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Orders');


      const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    
      res.setHeader('Content-Disposition', 'attachment; filename=orders.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

     
      res.send(excelBuffer);
  } catch (error) {
      console.error('Error generating Excel file:', error);
      res.status(500).send('Could not generate Excel file');
  }
};





module.exports = {
  getAllOrders,
  getOrderDetails,
  updateOrderStatus,
  approveReturn,
  loadReport,
  loadPdf,
  loadExcel
  
};
