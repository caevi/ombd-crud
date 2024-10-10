const { MongoClient } = require('mongodb');
const dotenv = require ('dotenv');
dotenv.config();

const url = process.env.MONGODB_URI;
const client = new MongoClient(url);
let db; 
const dbName = "ombdAssignment";

async function connectDB(){
    if (!db){
        try{
            await client.connect(); 
            console.log("Connected successfully to the server");
            const db = client.db(dbName);
            favouritesCollection = db.collection("favourites");
        } catch (error){
            console.error("Failed to connect to mongoDb", error);
        }
    }

   return db; 
}

module.exports = {connectDB};