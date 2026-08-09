import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
   title: {
       type: String,
       default: "New Conversation",
       required: true,
       trim: true,
       maxlength: 120
   },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
},{
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_document, value) => {
      value.conversationId = value._id.toString();
      delete value.id;
      return value;
    }
  }
})

const Conversation = mongoose.model("Conversation",conversationSchema)
export default Conversation
