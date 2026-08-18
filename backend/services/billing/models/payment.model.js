import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
    userId:{
        type:String,
        require:true
    },
    orderId:{
        type:String,
        require:true
    },
    paymentId:String,
    amount:Number,
    currency:{
        type:String,
        default:"INR"
    },
    credits:{
        type:Number
    },
    plan:{
        type:String
    },
    status:{
        type:String,
        enum:["created","paid","failed"],
        default:"created"
    }
},{timeseries:true})

const Payment = mongoose.model("Payment",paymentSchema)
export default Payment