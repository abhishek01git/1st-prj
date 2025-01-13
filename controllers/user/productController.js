const Product = require('../../models/productSchema');
const Category = require('../../models/categotySchema'); 
const User = require('../../models/userSchema');

const productDetails = async (req, res) => {
  try {
       
    const user = req.session.user;
    const userData = await User.findOne({ _id: user });
      const productId = req.query.id;

      if (!productId) {
          console.error("Product ID is missing from request.");
          return res.redirect('/pageNotFound');
      }

      
      const product = await Product.findById(productId)
          .populate('category') 
          .populate({
              path: 'reviews',
              populate: {
                  path: 'user',
                  select: 'name' 
              }
          });

      if (!product) {
          console.error(`Product with ID ${productId} not found.`);
          return res.redirect('/pageNotFound');
      }

      const variantsWithStock = product.variant.map((variant) => ({
          size: variant.size,
          stock: variant.quantity > 0 ? "In Stock" : "Out of Stock",
      }));
      console.log("varient with stock",variantsWithStock);
      

      const relatedProducts = await Product.find({
          category: product.category,
          _id: { $ne: productId },
      }).limit(4);

      res.render('product-details', {
           user: userData,
          product,
          variants: variantsWithStock,
          category: product.category,
          relatedProducts,
      });


  } catch (error) {
      console.error("Error in productDetails:", error);
      res.redirect('/pageNotFound');
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

    
    const totalProduct = await Product.countDocuments({
      isBlocked: false,
    }).populate({
      path: "category",
      match: { isListed: true }, 
    });

    const totalPages = Math.ceil(totalProduct / limit);

    const products = await Product.find({ isBlocked: false })
      .populate({
        path: "category",
        match: { isListed: true }, 
      })
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit);

   
    const filteredProducts = products.filter((product) => product.category);

    const categories = [...new Set(filteredProducts.map((product) => product.category.name))];

    res.render("shope", {
      user: userData,
      products: filteredProducts,
      category: categories,
      currentPage: page,
      totalPages,
      limit,
      sortOption,
    });
  } catch (error) {
    console.error("Error in shopLoad:", error.message);
    res.status(500).render("error", { message: "Internal server error." });
  }
};




  const searchProducts = async (req, res) => {
    const query = req.query.query || ''; 
console.log(query);

  
  try {
   
    const products = await Product.find({
      productName: { $regex: query, $options: 'i' },
    });

   
    res.json({ products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error searching products' });
  }

    
};
  
  
 const filterProduct = async (req, res) => {
  // try {
  //     const { category, price, sort } = req.query;

  //     let filterQuery = {};

   
  //     if (category) {
  //         filterQuery.category = category;
  //     }

  //     if (price) {
  //         const [minPrice, maxPrice] = price.split('-');
  //         filterQuery.price = { $gte: parseInt(minPrice), $lte: maxPrice ? parseInt(maxPrice) : Infinity };
  //     }

      
  //     let sortOption = {};
  //     if (sort === 'new') {
  //         sortOption = { createdAt: -1 }; 
  //     } else if (sort === 'asc') {
  //         sortOption = { productName: 1 }; 
  //     } else if (sort === 'desc') {
  //         sortOption = { productName: -1 }; 
  //     }

      
  //     const products = await Product.find(filterQuery).sort(sortOption);

  //     res.render('shop', { products }); 
  // } catch (error) {
  //     console.error(error);
  //     res.status(500).send('Server Error');
  // }
}



module.exports = { productDetails,shopLoad,filterProduct,searchProducts };
