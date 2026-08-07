import mongoose from "mongoose";

const connectDb = async () =>{
    try  {
       const mongoUri = process.env.MONGODB_URI;

       if (!mongoUri) {
           throw new Error("MONGODB_URI is not defined in the environment");
       }

       await mongoose.connect(mongoUri)
       console.log("db.connected")
    } catch(error) {
        console.error('Error connecting to MongoDB:', error);
        throw error;
    }
}

export default connectDb;
