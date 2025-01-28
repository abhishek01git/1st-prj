const { default: mongoose } = require('mongoose');
const Coupon = require('../../models/couponSchema');

const loadCoupon = async (req, res) => {
    try {
       
        const findCoupons = await Coupon.find({});
        
       
        return res.render('coupon', { Coupons: findCoupons });
    } catch (error) {
        console.error(error); 
        return res.redirect("/PageError");
    }
};

     
const createCoupon = async (req, res) => {
    try {
       
        const data = {
            couponName: req.body.couponName,
            startDate: new Date(req.body.startDate + "T00:00:00"),
            endDate: new Date(req.body.endDate + "T00:00:00"), 
            offerPrice: parseFloat(req.body.offerPrice), 
            minimumPrice: parseInt(req.body.minimumPrice),
        };

        console.log("datas",data);
        
        
        const newCoupon = new Coupon({
            name: data.couponName,
            createdOn: data.startDate,
            expireOn: data.endDate,
            offerPrice: data.offerPrice,
            minimumPrice: data.minimumPrice,
        });
        
        console.log("newcoupon",newCoupon);
        

        
        await newCoupon.save();

        
        return res.redirect('/admin/coupon');
    } catch (error) {
        console.error(error);  
        res.redirect("/PageError");
    }
};



const editCoupon = async (req, res) => {
    try {
        const id = req.query.id;
        
       
        const findCoupon = await Coupon.findById(id);
        
        if (!findCoupon) {
            return res.redirect('/PageError');  
        }

        res.render('editCoupon', {
            findCoupon: findCoupon
        });
    } catch (error) {
        console.error(error); 
        res.redirect('/PageError');
    }
};

const updatecoupon = async (req, res) => {
    try {
  
      const { couponId, couponName, startDate, endDate, offerPrice, minimumPrice } = req.body;
  
      if (!couponId || !couponName || !startDate || !endDate || !offerPrice || !minimumPrice) {
        return res.status(400).send("Missing required fields");
      }
  
      const id = new mongoose.Types.ObjectId(couponId);
  
    
      const selectedCoupon = await Coupon.findOne({ _id: id });
      if (!selectedCoupon) {
        return res.status(404).send("Coupon not found");
      }
  
   
      const updateCoupon = await Coupon.findOneAndUpdate(
        { _id: id },
        {
          $set: {
            name: couponName,
            createdOn: new Date(startDate),
            endDate: new Date(endDate),
            offerPrice: parseInt(offerPrice),
            minimumPrice: parseInt(minimumPrice),
          },
        },
        { new: true } 
      );
  
      if (updateCoupon) {
        res.send("Coupon updated successfully");
      } else {
        res.status(500).send("Coupon update failed");
      }
    } catch (error) {
      console.error("Error updating coupon:", error);
      res.status(500).send("Internal Server Error");
    }
  };




  const deletecoupon = async (req, res) => {
    try {
      const id = req.query.id;
      console.log(id);
      
  
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({ success: false, message: "Invalid coupon ID" });
      }
  
     
      const result = await Coupon.deleteOne({ _id: id });
  
      if (result.deletedCount === 0) {
       
        return res.status(404).send({ success: false, message: "Coupon not found" });
      }
  
      res.status(200).send({ success: true, message: "Coupon deleted successfully" });
    } catch (error) {
      console.error("Error deleting coupon:", error);
      res.status(500).send({ success: false, message: "Failed to delete coupon" });
    }
  };
  
  

module.exports = {
    loadCoupon,
    createCoupon,
    editCoupon,
    updatecoupon,
    deletecoupon
};
