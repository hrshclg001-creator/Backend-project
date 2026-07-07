// require("dotenv").config({path : './env'});
import dotenv from "dotenv";

dotenv.config({
	path : './.env'
})
import app from "./app.js";
import connectDB from "./db/index.js";


connectDB()
.then(() =>{
	app.on("Error",(error) =>{
		console.log("ERRR: ", error);
		throw error
	})

	app.listen(process.env.PORT || 8000, () =>{
		console.log(`Server is running at port : ${process.env.PORT}`)
	})
})
.catch((err) =>{
	console.log("MONGODB connection failed !!", err);
});

