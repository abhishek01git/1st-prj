const Category = require("../../models/categotySchema");
const multer = require("../../utils/multer");
const categoryInfo = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;
    const categoryData = await Category.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const totalCategories = await Category.countDocuments();
    const totalPages = Math.ceil(totalCategories / limit);
    res.render("category", {
      cat: categoryData,
      currentPage: page,
      totalPages: totalPages,
      totalCategories: totalCategories,
    });
  } catch (error) {
    console.error(error);
    res.render("/pageError");
  }
};

const addcategory = async (req, res) => {
  const { name, description } = req.body;

  try {
    console.log(name, description);
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ error: "Category Already Exists" });
    }

    if (!req.file) {
      console.log("File not uploaded");
      return res.status(400).json({ error: "Image file is required." });
    }

    console.log("Uploaded File is here:", req.file);
    const image = req.file ? req.file.filename : "default-category.png";

    const newCategory = new Category({ name, description, image });
    await newCategory.save();

    return res.json({ message: "New Category Added Successfully" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Internal Server Error", message: error.message });
  }
};

const getListCateroty = async (req, res) => {
  try {
    const id = req.query.id;
    console.log("Category ID to list:", id);

    const result = await Category.updateOne({ _id: id }, { $set: { isListed: false } });
    console.log("Update Result for isListed:false:", result);

    res.redirect("/admin/category");
  } catch (error) {
    console.error("Error in getListCategory:", error.message);
    res.redirect("/pageError");
  }
};

const getUnlistCateroty = async (req, res) => {
  try {
    const id = req.query.id;
    console.log("Category ID to unlist:", id);

    const result = await Category.updateOne({ _id: id }, { $set: { isListed: true } });
    console.log("Update Result for isListed:true:", result);

    res.redirect("/admin/category");
  } catch (error) {
    console.error("Error in getUnlistCategory:", error.message);
    res.redirect("/pageError");
  }
};


const getEditCategory = async (req, res) => {
  try {
    const id = req.query.id;
    const category = await Category.findOne({ _id: id });
    if (category) {
      res.render("edit-category", { category });
    } else {
      res.redirect("/pageError");
    }
  } catch (error) {
    res.redirect("/pageError");
  }
};

const editCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const { categoryname, description } = req.body;
    console.log(categoryname, description);

    if (!categoryname || !description) {
      return res
        .status(400)
        .json({ error: "Category name and description are required" });
    }

    const existingCategory = await Category.findOne({
      name: categoryname,
      _id: { $ne: id },
    });
    if (existingCategory) {
      return res
        .status(400)
        .json({ error: "Category with this name already exists" });
    }

    const updatedData = {
      name: categoryname,
      description,
    };

    if (req.file) {
      updatedData.image = req.file.filename;
    }

    const updateCategory = await Category.findByIdAndUpdate(id, updatedData, {
      new: true,
    });

    if (updateCategory) {
      res.redirect("/admin/category");
    } else {
      res.status(404).json({ error: "Category not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  categoryInfo,
  addcategory,
  getListCateroty,
  getUnlistCateroty,
  getEditCategory,
  editCategory,
};
