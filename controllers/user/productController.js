const Product = require('../../models/productSchema');
const Category = require('../../models/categotySchema'); 
const User = require('../../models/userSchema');
const errorHandler = require('../../middlewares/errorMiddleware');




const productDetails = async (req, res,next) => {
  try {
    const user = req.session.user;
    const userData = await User.findOne({ _id: user });
    const productId = req.query.id;

    if (!productId) {
      console.error("Product ID is missing from request.");
      return res.redirect("/pageNotFound");
    }

    
    const product = await Product.findById(productId)
      .populate("category")
      .populate({
        path: "reviews",
        populate: {
          path: "user",
          select: "name",
        },
      });

    if (!product) {
      console.error(`Product with ID ${productId} not found.`);
      return res.redirect("/pageNotFound");
    }

    
    console.log("Product Data:", product);

    
    const categoryOffer = product.category?.categoryOffer || 0; 
    const productOffer = product.productOffer || 0; 
    const effectiveOffer = Math.max(categoryOffer, productOffer); 

    
    console.log("Category Offer:", categoryOffer);
    console.log("Product Offer:", productOffer);
    console.log("Effective Offer:", effectiveOffer);

   
    const offerPrice = (product.regularPrice * effectiveOffer) / 100; 
    const salePrice = product.regularPrice - offerPrice; 

    
    console.log("Offer Price Calculation:", product.regularPrice, "*", effectiveOffer, "/", 100, "=", offerPrice);
    console.log("Sale Price Calculation:", product.regularPrice, "-", offerPrice, "=", salePrice);

  
    const formattedSalePrice = salePrice.toFixed(2);
    const formattedOfferPrice = offerPrice.toFixed(2);

    
    const offerPercentage = `${effectiveOffer}% OFF`;

    
    console.log("Formatted Sale Price:", formattedSalePrice);
    console.log("Formatted Offer Price:", formattedOfferPrice);
    console.log("Offer Percentage:", offerPercentage);

    const variantsWithStock = product.variant.map((variant) => ({
      size: variant.size,
      stock: variant.quantity > 0 ? "In Stock" : "Out of Stock",
    }));
    console.log("Variants with stock:", variantsWithStock);

 
    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: productId },
    }).limit(4);

    res.render("product-details", {
      user: userData,
      product,
      variants: variantsWithStock,
      category: product.category,
      relatedProducts,
      effectiveOffer, 
      salePrice: formattedSalePrice, 
      offerPrice: formattedOfferPrice, 
      offerPercentage, 
    });
  } catch (error) {
    console.error("Error in productDetails:", error);
    next(error);
    
  }
};




const shopLoad = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await User.findOne({ _id: user });

    const sortOption = req.query.sort || "latest"; 
    const limit = parseInt(req.query.limit) || 12; 
    const page = parseInt(req.query.page) || 1; 
    const skip = (page - 1) * limit; 

    const searchQuery = req.query.search || ""; 
    const selectedCategory = req.query.category || ""; 

    
    let searchCriteria = {
      isBlocked: false, 
      $or: [
        { productName: { $regex: searchQuery, $options: "i" } }, 
         
      ]
    };

    
    if (selectedCategory) {
      searchCriteria.category = selectedCategory;
    }

   
    let sortCriteria = {};
    switch (sortOption) {
      case "popularity":
        sortCriteria = { popularity: -1 };
        break;
      case "lowToHigh":
        sortCriteria = { salePrice: 1 };
        break;
      case "highToLow":
        sortCriteria = { salePrice: -1 };
        break;
      case "newArrivals":
        sortCriteria = { createdAt: -1 };
        break;
      case "aToZ":
        sortCriteria = { productName: 1 };
        break;
      case "zToA":
        sortCriteria = { productName: -1 };
        break;
      default:
        sortCriteria = { createdAt: -1 }; 
    }

   
    const totalProduct = await Product.countDocuments(searchCriteria).populate({
      path: "category",
      match: { isListed: true },
    });

    const totalPages = Math.ceil(totalProduct / limit); 

    
    const products = await Product.find(searchCriteria)
      .populate({
        path: "category",
        match: { isListed: true }, 
      })
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit);

   
    const filteredProducts = products.filter((product) => product.category);

    
    const processedProducts = filteredProducts.map((product) => {
      const categoryOffer = product.category?.categoryOffer || 0; 
      const productOffer = product.productOffer || 0; 
      const effectiveOffer = Math.max(categoryOffer, productOffer); 
      const salePrice = product.regularPrice - (product.regularPrice * effectiveOffer) / 100; 

      return {
        ...product._doc, 
        effectiveOffer,
        salePrice: salePrice.toFixed(2), 
        displayOffer: `${effectiveOffer}% OFF`, 
      };
    });

    
    const categories = await Category.find({ isListed: true });

   
    res.render("shope", {
      user: userData,
      products: processedProducts, 
      categories: categories, 
      currentPage: page,
      totalPages,
      limit,
      sortOption,
      searchQuery, 
      selectedCategory, 
    });
  } catch (error) {
    console.error("Error in shopLoad:", error.message);
    res.status(500).render("error", { message: "Internal server error." });
  }
};





  
  
  











module.exports = { productDetails,shopLoad, };
