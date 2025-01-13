const express=require('express');
const env=require("dotenv").config();
const connectDB = require('./config/db');
const path=require("path");
const userRoute=require('./routes/userRouter')
const session=require('express-session')
const passport=require('./config/passport')
const adminRouter=require('./routes/adminRouter')
const orderRoutes = require('./routes/userRouter');


const app=express();

app.use(express.json());

app.use(express.urlencoded({extended:true}));

app.use(session({
  secret:process.env.SESSION_SECRET,
  resave:false,
  saveUninitialized:true,
  cookie:{
    secure:false,
    httpOnly:true,
    maxAge:72*60*60*1000
  }
}))

app.use(passport.initialize());
app.use(passport.session());

app.use('/uploads', express.static('uploads'));
app.use('/api', userRoute);



app.use((req,res,next)=>{
  res.set('cache-controller','no-store')
  next();
});



app.set("view engine","ejs");
app.set("views", [path.join(__dirname,'views/user'), path.join(__dirname, "views/admin")])
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.static(path.join(__dirname,"public")));


app.use('/',userRoute);
app.use('/admin',adminRouter);


connectDB();
const PORT=process.env.PORT||3000;

app.listen(PORT,()=>{
  console.log("server is running");
  
})

module.exports=app