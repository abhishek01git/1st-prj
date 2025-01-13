const Oder = require("../../models/oderSchemma");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/CartSchema");
const Order = require("../../models/oderSchemma");

const renderCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user;
    console.log("User ID:", userId);

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    console.log("Cart:", cart);


    if(!cart||cart.items.length===0){
      return res.redirect('/cart')
    }
    


  for(let item of cart.items){
    const product=item.productId;
    const size=item.size;
    const quantity=item.quantity;

    const selectedVariant= product.variant.find((v)=>v.size===size);
    if(!selectedVariant){
      return res.status(404).json({success:false,error:`Variant with size ${size} not found for product ${product.productName}.`});
    }
    if(quantity>selectedVariant.quantity){
      return res.status(400).json({
        sucess:false,error:`Only ${selectedVariant.quantity} units are available for size ${size} of product ${product.productName}`,
        availableQuantity:selectedVariant.quantity
      })
    }
  }


    
    const totalAmount = cart.items.reduce(
      (sum, item) => sum + item.quantity * item.productId.salePrice,
      0
    );



    const addresses = await Address.find({ userId });
    console.log("User Addresses:", addresses);




    res.render("checkout", { cart, addresses, totalAmount });
  } catch (error) {
    console.error("Error rendering checkout page:", error);
    res.status(500).send("An error occurred.");
  }
};

const saveNewAddress = async (req, res) => {
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
        },
      ],
    });

    await newAddress.save();
    return res.redirect("/checkout");
  } catch (error) {
    console.error("error creating address", error);
    return res.redirect("/pageNotFound");
  }
};



const updateProductStock = async (items) => {
  try {
    
    for (const item of items) {
      const productId = item.productId;
      const size = item.size;
      const quantityOrdered = item.quantity;

     
      const product = await Product.findOne({
        _id: productId,
        'variant.size': size
      });

      if (product) {
        const variantIndex = product.variant.findIndex(
          v => v.size === size
        );

        if (variantIndex !== -1) {
        
          product.variant[variantIndex].quantity -= quantityOrdered;

         
          await product.save();
        }
      }
    }
  } catch (error) {
    console.error('Error updating product stock:', error);
  }
};






const placeOrder = async (req, res) => {
  try {
    const { selectedAddressId, paymentMethod } = req.body;
    console.log(req.body)

    
    const addressDocument = await Address.findOne({
      userId: req.user._id,
      'address._id': selectedAddressId
    }).select('address');

    if (!addressDocument || !addressDocument.address || addressDocument.address.length === 0) {
      return res.json({ success: false, message: 'Address not found.' });
    }


    const selectedAddress = addressDocument.address.find(
      (addr) => addr._id.toString() === selectedAddressId);
      
    if (!selectedAddress) {
      return res.json({ success: false, message: 'Selected address not found.' });
    }


    const cart = await Cart.findOne({userId: req.user._id }).populate('items.productId');
    console.log(cart)

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.json({ success: false, message: 'Invalid or empty cart.' });
    }

   
    for (const item of cart.items) {
     
      const selectedVariant=item.productId.variant.find((v)=>v.size===item.size);
      if(!selectedVariant){
        return res.json({
          success:false,message:`Variant with size ${item.size} not found for product ${item.productId.name}.`
        })
        
      }
      console.log("select",selectedVariant);
      if (item.quantity > selectedVariant.quantity) {
        return res.json({
          success: false,
          message: `Only ${selectedVariant.quantity} units are available for size ${item.size} of ${item.productId.name}.`, // Pass the available quantity as a separate field
        });
      }
    }




   
    const order = new Order({
      userId: req.user._id,
      address: selectedAddress, 
      paymentMethod,
      cartId,
      items: cart.items,
      status: 'Pending'
    });

    await order.save();

    
    await Cart.findByIdAndUpdate(cartId, { items: [] });

    
    await updateProductStock(cart.items);

    res.redirect(`order-success?orderId=${order._id}`);
  } catch (error) {
    console.error('Error placing the order:', error);
    res.status(500).json({ success: false, message: 'Error placing the order: ' + error.message });
  }
};




const orderSuccess = async (req, res) => {
  try {
    const orderId = req.query.orderId; 

    if (!orderId) {
      return res.status(400).render('error', { message: 'Invalid order ID.' });
    }

    
    const order = await Order.findById(orderId)
      .populate('userId address items.productId') 
      .lean(); 

    if (!order) {
      return res.status(404).render('error', { message: 'Order not found' });
    }

    res.render('order-success', { order }); 
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).render('error', { message: 'Error fetching order details.' });
  }
};



const getOrderHistory= async (req, res) => {
    try {
        const userId = req.user._id;  
        const orders = await Order.find({ userId })
        .populate('items.productId') 
            .select('_id date paymentStatus fulfillmentStatus totalAmount') 
            .sort({ date: -1 }); 
        
        res.render('account/order-history', { orders });  
    } catch (error) {
        console.error('Error fetching order history:', error);
        res.status(500).render('error', { message: 'Error fetching order history.' });
    }
}




module.exports = {
  renderCheckoutPage,
  saveNewAddress,
  placeOrder,
  orderSuccess,
  getOrderHistory
};
