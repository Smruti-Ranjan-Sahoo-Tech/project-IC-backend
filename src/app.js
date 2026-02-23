const express=require('express')
const authRouter=require('./routes/auth.routes')
const adminRouter=require('./routes/admin.routes')
const userRouter=require('./routes/user.routes')
const superadminRouter=require('./routes/superadmin.routes')
const enquiryRouter=require('./routes/enquiry.routes')
const path = require("path");
const cors=require('cors')
const methodOverride = require('method-override');
const app=express()
const cookieParser = require("cookie-parser");


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static files middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(cookieParser());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));

// Routes
app.use("/auth", authRouter);
app.use("/user",userRouter)
app.use("/admin", adminRouter);
app.use("/superadmin", superadminRouter);
app.use("/enquiry", enquiryRouter);


app.get("/", (req, res) => {
    res.send({
        message: "API Working😂"
    })
})

module.exports=app
