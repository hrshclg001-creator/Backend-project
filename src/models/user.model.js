import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";


const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  fullname: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  avatar: {
    type: String, // using cloudinary services in this
    required: true,
  },
  coverImage: {
    type: String, // using cloudinary services in this
  },
  watchHistory :[
	{
		type : Schema.Types.ObjectId,
		ref : "Video"
	}
  ],
  password : {
	type : String,
	required : [true, "Password is required! "]
  },
  refreshToken : {
	type : String
  }
},
{
	timestamps:true
});
//Modern Mongoose (version 7 ya 8) mein ek naya rule aaya hai: Agar aap hook mein async function ka use karte hain, toh Mongoose khud-ba-khud uska (Promise) wait kar leta hai. Aapko manually next() likhne ya call karne ki zaroorat nahi hoti. Naye versions mein Mongoose kabhi-kabhi next ko pass hi nahi karta, isliye code bolta hai "next is not a function".
userSchema.pre(
	"save",async function () {
		if(!this.isModified("password")){
			return;
		}
		this.password = await bcrypt.hash(this.password, 10);
	}
)
//custom methods
userSchema.methods.isPasswordCorrect = async function (password) {
	return await bcrypt.compare(password,this.password);
}
userSchema.methods.generateAcessToken = function () {
	return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullname: this.fullname,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};
userSchema.methods.generateRefreshToken = function () {
return jwt.sign(
  {
    _id: this._id,
  },
  process.env.REFRESH_TOKEN_SECRET,
  {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
  }
);
};
export const User = mongoose.model("User",userSchema);