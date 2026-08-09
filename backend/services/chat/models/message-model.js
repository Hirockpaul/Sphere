import mongoose from "mongoose";
const messageSchema = new mongoose.Schema({
     conversationId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Conversation",
            required: true
        },
        role:{ 
            type: String,
            enum:["user", "assistant"],
            required: true
        },
        content: {
            type: String,
            required: true,
            trim: true
        }
},{
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_document, value) => {
      value.messageId = value._id.toString();
      delete value.id;
      return value;
    }
  }
})

const Message = mongoose.model("Message",messageSchema)
export default Message
  
