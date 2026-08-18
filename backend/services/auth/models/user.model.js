import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
   firebaseId: {
       type: String,
       required: true,
       unique: true
   },
   name:String,
   email:String,
   avatar:String,
   plan:{
    type:String,
    default:"free"
   },
   credits:{
     type:Number,
     default:100
   },
   totalCredits:{
    type:Number,
    default:100
   },
   planExpiresAt:Date,
   processedPaymentSessions: {
    type: [String],
    default: [],
    select: false
   }
}, {
    timestamps: true
})

const User =mongoose.model("User",userSchema)
export default User;
