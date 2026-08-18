import mongoose from "mongoose";

const artifactFileSchema = new mongoose.Schema({
  path: { type: String, required: true, trim: true, maxlength: 240 },
  language: { type: String, default: "text", trim: true, maxlength: 50 },
  content: { type: String, required: true },
}, { _id: false });

const artifactSchema = new mongoose.Schema({
  responseType: { type: String, enum: ["code", "files"], required: true },
  summary: { type: String, required: true, trim: true, maxlength: 160 },
  files: { type: [artifactFileSchema], default: [] },
}, { _id: false });

const pdfSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true, maxlength: 1024 },
  filename: { type: String, required: true, trim: true, maxlength: 240 },
  title: { type: String, required: true, trim: true, maxlength: 240 },
}, { _id: false });

const presentationSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true, maxlength: 1024 },
  filename: { type: String, required: true, trim: true, maxlength: 240 },
  title: { type: String, required: true, trim: true, maxlength: 240 },
  slides: { type: [mongoose.Schema.Types.Mixed], default: undefined },
}, { _id: false });

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
        },
        images: { type: [String], default: [] },
        artifact: {
            type: artifactSchema,
            default: undefined,
        },
        pdf: {
            type: pdfSchema,
            default: undefined,
        },
        presentation: {
            type: presentationSchema,
            default: undefined,
        },
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
  
