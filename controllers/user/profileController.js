const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const Address = require("../../models/addressSchema");
const bcrypt = require("bcrypt");
const Product = require("../../models/productSchema");
const Order = require("../../models/oderSchemma");
const { ObjectId } = require("mongoose").Types;
const Review=require('../../models/ReviewSchema')
const Wallet=require('../../models/WalletSchemma')

const userProfile = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);
    const addressData = await Address.findOne({ userId: userId });
    const orders = await Order.find({ userId: userId }).sort({ createdAt: -1 });
       res.render("profile", { user: userData,userAddress: addressData,orders: orders,});
  } catch (error) {
    console.error("Error in userProfile:", error);
    res.redirect("/pageNotFound");
  }
};


const getOrderDetails = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await User.findOne({ _id: user });
    const orderId = req.params.orderId;

    const order = await Order.findById(orderId).populate("address");

    if (!order) {
      return res.status(404).send("Order not found");
    }

    const canCancel = order.status !== "canceled";

    const addressData = await Address.findOne({ userId: order.userId }).select(
      "name city state"
    );
    
    if (!addressData) {
      console.log("No address found for the user:", order.userId);
      return res.status(404).send("User address not found");
    }

    const statusMessage = {
      pending: "Your order is pending and being processed.",
      shipped: "Your order has been shipped.",
      Delivered: "Your order has been delivered.",
      canceled: "Your order has been canceled.",
    }[order.status] || "Status unavailable.";


    res.render("orderDetails", { user:userData, order, address: addressData,canCancel,statusMessage});
  } catch (error) {
    console.error("Error in getOrderDetails:", error);
    res.status(500).send("Server error");
  }
};


const oderDelivered=async()=>{
  try {

    const {orderId}=req.params._id
    const oder=await Order.findById(orderId);
    if(!oder){
     return res.status(404),send('oder not found');
    }

    if(oder.status=="Delivered"){
      return res.status(400).send("oder already  delivard successfully");
    }

         oder.status='Delivered',
          await oder.save();

res.status(200),send("Order marked as delivered successfully")

  } catch (error) {
    console.error("Error in markOrderAsDelivered:", error);
    res.status(500).send("Server error");
  }
}


const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const productId = req.body.productId; 
    const size = req.body.size;
    const quantity = req.body.quantity; 
    const cancelReason = req.body.cancelReason || "No reason provided"; 

    const order = await Order.findById(orderId).populate("items.productId");

    if (!order) {
      return res.status(404).send("Order not found");
    }

   
    if (order.status === "Delivered") {
      return res.render("orderDetails", { 
        order, 
        statusMessage: "Order has already been delivered and cannot be canceled", 
        canCancel: false, 
        address: order.address 
      });
    }

    
    if (order.status === "canceled") {
      return res.render("orderDetails", { 
        order, 
        statusMessage: "Order has already been canceled", 
        canCancel: false, 
        address: order.address 
      });
    }

    
    if (!productId) {
      if (!cancelReason) {
        return res.status(400).send("Cancel reason is required for order cancellation");
      }
            
      
      if (order.paymentMethod !== "cod") {
        const wallet = await Wallet.findOne({ userId: order.userId });
        if (wallet) {
          wallet.balance += order.totalAmount; 
          wallet.transactions.push({
            type: 'credit',
            amount: order.totalAmount,
            description: `Refund for order cancellation (Order ID: ${orderId})`,
          });
          await wallet.save();
        }
      }

      order.status = "canceled"; 
      order.orderCancelReason = cancelReason; 

      
      order.items.forEach(item => {
        item.cancelReason = cancelReason;
        item.cancelStatus = "Cancelled";
      });

      
      for (const item of order.items) {
        const product = await Product.findById(item.productId._id);
        if (product) {
          const variant = product.variant.find((v) => v.size === item.size);
          if (variant) {
            variant.quantity += item.quantity; 
          } else {
            product.stock += item.quantity;
          }
          await product.save();
        }
      }

      await order.save();
      return res.redirect(`/order-details/${orderId}?statusMessage=Order canceled successfully`);
    }

    
    const itemToCancel = order.items.find(
      (item) => item.productId._id.toString() === productId && item.size === size
    );
  console.log(1111111111111111111111111111,itemToCancel);
  

    if (!itemToCancel) {
      return res.status(404).send("Product not found in order");
    }

   
    if (itemToCancel.quantity < quantity) {
      return res.status(400).send("Quantity to cancel exceeds the order quantity");
    }

 
    if (order.paymentMethod !== "cod") {
      const wallet = await Wallet.findOne({ userId: order.userId });
      console.log(222222222222222222222222222222,wallet);
      
      if (wallet) {
       
        const itemPrice = itemToCancel.price;
        const grandTotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const finalTotal = order.totalAmount; 

        const refundAmount = (itemPrice * quantity) * (finalTotal / grandTotal);

        
        wallet.balance += refundAmount;

       
        wallet.transactions.push({
          type: "credit",
          amount: refundAmount,
          description: `Refund for product cancellation (Product ID: ${itemToCancel.productId._id})`,
        });

        await wallet.save();
      } else {
        throw new Error("Wallet not found for the user");
    }
    
    }

    
    itemToCancel.quantity -= quantity;

   
    if (itemToCancel.quantity === 0) {
      itemToCancel.cancelStatus = "Cancelled";
      itemToCancel.cancelReason = cancelReason;
    }

    
    if (order.items.every((item) => item.cancelStatus === "Cancelled")) {
      order.status = "canceled";
      order.orderCancelReason = cancelReason;
    }

    await order.save();

    
    const product = await Product.findById(productId);
    if (product) {
      const variant = product.variant.find((v) => v.size === size);
      if (variant) {
        variant.quantity += quantity;
      } else {
        product.stock += quantity;
      }
      await product.save();
    }

    res.redirect(`/order-details/${orderId}?statusMessage=Product canceled successfully`);
  } catch (error) {
    console.error("Error in cancelOrder:", error);
    res.status(500).send("Server error");
  }
};











const requestReturn = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const productId = req.body.productId;
    const size = req.body.size;
    const quantity = req.body.quantity;
    const returnReason = req.body.returnReason;

    const order = await Order.findById(orderId).populate('items.productId');

    if (!order) {
      return res.status(404).send("Order not found");
    }

  
    const itemToReturn = order.items.find(item => 
      item.productId._id.toString() === productId && item.size === size
    );

    if (!itemToReturn) {
      return res.status(404).send("Product not found in the order for the specified size.");
    }

    
    if (itemToReturn.returnStatus === "Returned") {
      return res.status(400).send("This product has already been returned.");
    }

    
    if (!returnReason) {
      return res.status(400).send("Return reason is required for product return.");
    }

    
    if (quantity > itemToReturn.quantity) {
      return res.status(400).send("Quantity to return exceeds the purchased quantity.");
    }

    
    itemToReturn.returnStatus = "Requested";
    itemToReturn.returnReason = returnReason;
    itemToReturn.returnQuantity = quantity; 

   
    await order.save();


    const allItemsRequestedForReturn = order.items.every(item => item.returnStatus === "Requested");

    if (allItemsRequestedForReturn) {
      order.returnStatus = "Return Requested";  
    }

   
    await order.save();

   
    return res.redirect(`/order-details/${orderId}?statusMessage=Product return requested successfully.`);

  } catch (error) {
    console.error("Error in requestReturn:", error);
    res.status(500).send("Server error");
  }
};




















const addReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.params.userId; 
    const product = await Product.findById(productId);
    if (!product) {
        return res.status(404).send("Product not found.");
    }
    const existingReview = await Review.findOne({ product: productId, user: userId });
    if (existingReview) {
        return res.status(400).send("You have already reviewed this product.");
    }

    const newReview = new Review({product: productId,user: userId,rating,comment});
    await newReview.save();
    res.redirect('/profile')
} catch (error) {
    console.error("Error in addReview:", error);
    res.status(500).send("Server error");
}
};






const loadprofile = async (req, res) => {
  try {
    const userId = req.session.user;

    const userData = await User.findById(userId);
    const addressData = await Address.findOne({ userId: userId });

    if (!userData) {
      return res.redirect("/pageNotFound");
    }

    res.render("profiletwo", {
      user: userData,
      userAddress: addressData,
    });
  } catch (error) {
    console.error("Error retrieving profile data:", error);
    res.redirect("/pageNotFound");
  }
};

const changeEmail = async (req, res) => {
  try {
    res.render("change-email");
  } catch (error) {
    res.render("/pageNotFound");
  }
};

function generateOtp() {
  const digits = "1234567890";
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

const sendVerificationEmail = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });
    const mailOptions = {
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "your otp for email changed",
      text: `your otp is ${otp}`,
      html: `<b><h4>your otp:${otp}</h4></b>`,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

const changeEmailVaild = async (req, res) => {
  try {
    const { email } = req.body;
    const userExist = await User.findOne({ email });
    if (userExist) {
      const otp = generateOtp();
      const emailSend = await sendVerificationEmail(email, otp);
      if (emailSend) {
        req.session.userOtp = otp;
        req.session.userData = req.body;
        req.session.email = email;
        console.log("email sent", email);
        console.log("otp", otp);
        return res.render("change-email-otp");
      } else {
        return res.json("email-error");
      }
    } else {
      res.render("change-email", {
        message: "user with this email not exist",
      });
    }
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const verifyEmailOtp = async (req, res) => {
  try {
    const enteredOtp = req.body.otp;
    if (enteredOtp === req.session.userOtp) {
      req.session.userData = req.body.userData;
      res.render("new-email", {
        userData: req.session.userData,
      });
    } else {
      res.render("change-email-otp", {
        message: "otp not matching",
        userData: req.session.userData,
      });
    }
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const updateEamil = async (req, res) => {
  try {
    const newEmail = req.body.newEmail;
    const userId = req.session.user;
    await User.findByIdAndUpdate(userId, { email: newEmail });
    res.redirect("profiletwo");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const loadChangePassword = async (req, res) => {
  try {
    res.render("change-password");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const changePassword = async (req, res) => {
  const { currentPass, newPass, confirmPass } = req.body;
  console.log(req.body);
  
  try {
    const user = req.user;

    const isMatch = await bcrypt.compare(currentPass, user.password);
    if (!isMatch) {
      return res.status(400).render("change-password", {
        message: "Current password is incorrect.",
      });
    }

    if (newPass !== confirmPass) {
      return res.status(400).render("change-password", {
        message: "New passwords do not match.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPass, 10);
    user.password = hashedPassword;
    await user.save();

    res.redirect("/profile");
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).send("Internal server error");
  }
};

const loadAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    console.log("userId from session:", userId);
    if (!userId) {
      return res.redirect("/profile");
    }
    const userData = await User.findOne({ _id: req.session.user });
    const addresses = await Address.find({ userId });
    console.log("addresses:", addresses);

    res.render("address", { addresses, user: userData });
  } catch (error) {
    console.error("Error loading addresses:", error);
    res.redirect("/pageNotFound");
  }
};

const loadAddAddress = async (req, res) => {
  try {
    const userData = await User.findOne({ _id: req.session.user });
    res.render("add-address", { user: userData });
  } catch (error) {}
};

const addAddress = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      throw new Error("User ID is missing");
    }

    const address = req.body;
    const userId = req.user._id;

    const newAddress = new Address({
      userId: userId,
      address: [
        {
          addressType: address.addressType,
          name: address.name,
          city: address.city,
          landmark: address.landmark,
          state: address.state,
          pincode: String(address.pincode),
          phone: address.phone,
          altphone: address.altphone,
        },
      ],
    });

    await newAddress.save();
    return res.redirect("/address");
  } catch (error) {
    console.error("error creating address", error);
    return res.redirect("/pageNotFound");
  }
};
const loadEditAddress = async (req, res) => {
  const addressId = req.params.id;

  try {
    const userData = await User.findOne({ _id: req.session.user });
    const parentDocument = await Address.findOne({
      "address._id": addressId,
    });
    const address = parentDocument.address.find(
      (addr) => addr._id.toString() === addressId
    );
    console.log("address", address);

    if (!address) {
      return res.status(404).send("Address not found.");
    }

    res.render("edit-address", { address, user: userData });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
};

const editAddress = async (req, res) => {
  const addressId = req.query.id;
  const updatedData = req.body;

  try {
    const result = await Address.updateOne(
      { "address._id": addressId },
      {
        $set: {
          "address.$.addressType": updatedData.addressType,
          "address.$.name": updatedData.name,
          "address.$.city": updatedData.city,
          "address.$.landmark": updatedData.landmark,
          "address.$.state": updatedData.state,
          "address.$.pincode": updatedData.pincode,
          "address.$.phone": updatedData.phone,
        },
      }
    );

    console.log("Address updated successfully:", result);
    res.redirect("/address");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
};

const deleteAddress = async (req, res) => {
  const addressId = req.params.id;
  const userId = req.user.id;
  console.log("Address ID:", addressId);
  console.log("User ID:", userId);
  try {
    const result = await Address.deleteOne({
      userId: userId,
      "address._id": addressId,
    });
    console.log("Address deleted successfully:", result);
    res.redirect("/address");
  } catch (error) {
    console.error("Error deleting address:", error);
    res.status(500).send("Internal Server Error");
  }
};

const loadForgetPassword = async (req, res) => {
  try {
    res.render("forget-password");
  } catch (error) {}
};

const forgetPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.render("forget-password", {
        errorMessage: "Email not found!",
      });
    }
    const otp = generateOtp();
    const emailSent = await sendVerificationEmail(email, otp);

    if (!emailSent) {
      return res.render("login", {
        message: "Failed to send OTP. Please try again.",
      });
    }
    
    req.session.userOtp = otp;
    req.session.userEmail = email;

    res.render("forget-passwordOTP");
    console.log("OTP sent:", otp);
  } catch (error) {
    console.error(" error:", error);
    res.redirect("/pageNotFound");
  }
};
const forgetPasswordOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    console.log("Received OTP:", otp);
    console.log("Stored OTP:", req.session.userOtp);

    if (otp === req.session.userOtp) {
      
      res.status(200).json({
        success: true,
        redirectUrl: "/reset-password", 
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "An error occurred. Please try again.",
      });
  }
};

const loadResetPassword = async (req, res) => {
  try {
    res.render("reset-password");
  } catch (error) {}
};

const resetPassword = async (req, res) => {
  const { newPass, confirmPass } = req.body;

  try {
    if (!newPass || !confirmPass) {
      return res.status(400).json({
        success: false,
        message: "Both newPass and confirmPass are required",
      });
    }

    // Check if the new passwords match
    if (newPass !== confirmPass) {
      return res.status(400).render("reset-password", {
        message: "New passwords do not match.",
      });
    }

   
    const hashedPassword = await bcrypt.hash(newPass, 10);
    const user = await User.findOne({ email: req.session.userEmail });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found with the provided email",
      });
    }

    user.password = hashedPassword;
    await user.save();

    req.session.userOtp = null;
    req.session.userEmail = null;

    res.redirect("/login");
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).send("Internal server error");
    }
  }
};









module.exports = {
  userProfile,
  loadprofile,
  cancelOrder,
  getOrderDetails,
  changeEmail,
  changeEmailVaild,
  verifyEmailOtp,
  updateEamil,
  loadChangePassword,
  changePassword,
  loadAddress,
  addAddress,
  loadEditAddress,
  loadAddAddress,
  editAddress,
  deleteAddress,
  loadForgetPassword,
  forgetPassword,
  forgetPasswordOtp,
  loadResetPassword,
  resetPassword,
  oderDelivered,
  addReview,
  requestReturn
};
