const Cart = require("../../models/CartSchema");
const Product = require("../../models/productSchema");
const mongoose = require("mongoose");
const User = require("../../models/userSchema");

const addToCart = async (req, res) => {
  const { productId, size, quantity } = req.body;
  console.log("this is data ", req.body);
  try {
    const userId = req.user.id;
    console.log("ertyui", userId);
    if (!userId) {
      return res
        .status(401)
        .json({
          success: false,
          message: "User session not found.",
          redirectURL: "/login",
        });
    }
    const product = await Product.findById(productId).select(
      "productName salePrice productImage quantity variant"
    );

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // if (
    //   !product.productName ||
    //   !product.salePrice ||
    //   !product.productImage.length
    // ) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Incomplete product details found.",
    //   });
    // }

    if (!product.variant.some((variant) => variant.size === size)) {
      return res.status(400).json({
        success: false,
        message: `Size ${size} is not available for this product.`,
      });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId });
    }

    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId && item.size === size
    );
    if (existingItemIndex !== -1) {
      if (
        product.quantity <
        cart.items[existingItemIndex].quantity + quantity
      ) {
        return res.status(400).json({
          success: false,
          message: "Insufficient stock available for this product.",
        });
      }
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      if (product.quantity < quantity) {
        return res.status(400).json({
          success: false,
          message: "Insufficient stock available for this product.",
        });
      }
      cart.items.push({
        productId,
        size,
        quantity,
        productName: product.productName,
        price: product.salePrice,
        image: product.productImage[0],
      });
    }

    cart.totalAmount = cart.items.reduce(
      (total, item) => total + item.quantity * item.price,
      0
    );
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Item added to cart successfully",
      cart,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to add item to cart", error });
  }
};




const viewCart = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = req.session.user;
    const userData = await User.findOne({ _id: user });
    const cart = await Cart.findOne({ userId })
      .populate("items.productId", "salePrice productName productImage")
      .exec();

    if (!cart || cart.items.length === 0) {
      console.log(
        `[viewCart]: No cart found or cart is empty for user: ${userId}`
      );
      return res.render("cart", {
        user: userData,
        cartItems: [],
        totalAmount: 0,
      });
    }

    const totalAmount = cart.items.reduce((sum, item) => {
      const price = item.productId ? item.productId.salePrice : 0;
      return sum + item.quantity * price;
    }, 0);



     console.log(`[viewCart]: Total amount for user ${userId}: ${totalAmount}`);
    // console.log(`[viewCart]: Cart items for user ${userId}:`, cart.items);

    res.render("cart", { user: userData, cartItems: cart.items, totalAmount });
  } catch (error) {
    console.error(`[viewCart Error]:`, error.message, error.stack);
    res
      .status(500)
      .json({ error: "An unexpected error occurred. Please try again later." });
  }
};







const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = req.params.productId;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res
        .status(404)
        .json({ error: "Cart not found or is already empty." });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );
    if (itemIndex === -1) {
      return res.status(404).json({ error: "Item not found in cart." });
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    res.status(200).json({ message: "Item removed successfully." });
  } catch (error) {
    console.error("Error in [removeFromCart]:", error.message, error.stack);
    res
      .status(500)
      .json({ error: "An unexpected error occurred. Please try again later." });
  }
};







const updateCartQuantity = async (req, res) => {
  try {
    const { productId, quantity, size } = req.body;
    console.log("Received request data:", req.body);

    // Validation checks
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid or missing Product ID." });
    }

    if (!quantity || quantity <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid quantity." });
    }

    if (!size) {
      return res
        .status(400)
        .json({
          success: false,
          error: "Missing size for the product variant.",
        });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, error: "Product not found." });
    }

    const selectedVariant = product.variant.find((v) => v.size === size);
    if (!selectedVariant) {
      return res
        .status(404)
        .json({
          success: false,
          error: `Variant with size ${size} not found.`,
        });
    }

    if (quantity > selectedVariant.quantity) {
      return res.status(400).json({
        success: false,
        error: `Only ${selectedVariant.quantity} units are available for size ${size}.`,
        availableQuantity: selectedVariant.quantity, 
      });
    }
   
    

    let cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      return res.status(404).json({ success: false, error: "Cart not found." });
    }

    // const existingItemIndex = cart.items.findIndex(
    //   (item) => item.productId.toString() === productId && item.size === size
    // );
    const existingItem = cart.items.find(item => item.productId.toString() === productId && item.size === size);

    if (!existingItem) {
      return res
        .status(400)
        .json({ success: false, error: "Item not found in the cart." });
    }

   
    existingItem.quantity = quantity;

    
    const grandTotal = cart.items.reduce((sum, item) => {
      const price = item.price; 
      const quantity = item.quantity ? item.quantity : 0; 
      console.log('Item Price:', price, 'Quantity:', quantity); 
      return sum + (quantity * price);
    }, 0);
    const totalAmount = existingItem.price * quantity    

    console.log(grandTotal)

    await cart.save();
    res
      .status(200)
      .json({ success: true, message: "Cart updated successfully.", cart, totalAmount, grandTotal });
  } catch (error) {
    console.error("Error updating cart quantity:", error);
    res
      .status(500)
      .json({ error: "An error occurred while updating the cart." });
  }
};


module.exports = { addToCart, viewCart, updateCartQuantity, removeFromCart };