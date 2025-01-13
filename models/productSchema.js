const { ref } = require('joi');
const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define the Product Schema
const ProductSchema = new Schema(
  {
    productName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    regularPrice: {
      type: Number,
      required: true,
    },
    salePrice: {
      type: Number,
      default: null,
      validate: {
        validator: function (v) {
          return v <= this.regularPrice;
        },
        message: (props) => `Sale price (${props.value}) must be less than or equal to regular price (${this.regularPrice}).`,
      },
    },
    productOffer: {
      type: Number,
      default: 0,
      validate: {
        validator: function (v) {
          return v >= 0 && v <= 100;
        },
        message: 'Product offer must be between 0 and 100.',
      },
    },
    variant: [
      {
        size: {
          type: String,
          enum: ['S', 'M', 'L', 'XL'],
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
      },
    ],
    productImage: [
      {
        type: String,
        required: true,
        
      },
    ],
    isBlocked: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['Available', 'Out of stock', 'Discontinued', 'Pre-order', 'Backordered'],
      required: true,
      default: 'Available',
    },
reviews:[{
  type:mongoose.Schema.Types.ObjectId,
  ref:"Review"
}],

    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Virtual field for total stock
ProductSchema.virtual('totalStock').get(function () {
  return this.variant.reduce((acc, curr) => acc + curr.quantity, 0);
});

// Pre-save hook to ensure salePrice defaults to regularPrice if not set
ProductSchema.pre('save', function (next) {
  if (!this.salePrice) {
    this.salePrice = this.regularPrice;
  }
  next();
});

// Query helper to exclude deleted records
ProductSchema.query.notDeleted = function () {
  return this.where({ deleted: false });
};

// Indexes for faster querying
ProductSchema.index({ productName: 1, category: 1 });
ProductSchema.index({ status: 1 });

const Product = mongoose.model('Product', ProductSchema);
module.exports = Product;
