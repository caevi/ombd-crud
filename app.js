const express =  require('express');
const axios = require('axios');
const {connectDB} = require('./movieModels');
const dotenv = require ('dotenv');
const {ObjectId} = require('mongodb');
 
dotenv.config();

const app = express();
app.use(express.json());

const OMBD_API_KEY = process.env.OMBD_API_KEY;//apikey
const COLLECTION_NAME = process.env.MONGO_DB_COLLECTION_NAME;  //collection name 
const BASE_URL = "https://www.omdbapi.com/?i=tt3896198&apikey=6ab17d5"; //url 

let db; //connect to the database
connectDB().then(database => {
    db = database;
    console.log("Connected to MongoDB");
    
});


//route 1 search using title as a query 
app.get('/movies/search', async (req, res) => {
    const { title } = req.query;  // Extract title from query parameters

    try {
        // Fetch data from the OMDb API
        const response = await axios.get(`http://www.omdbapi.com/?apikey=6ab17d5&s=${encodeURIComponent(title)}`);
        console.log('API RESPONSE',response.data); 
        // Check if response contains search results
        if (response.data.Response === "False") {
            return res.status(404).json({ message: "No movies found" });
        }

        // Extract specific fields from the response
        const movies = response.data.Search.map(movie => {
            const combinedRating = calculateCombinedRating(movie.Ratings);
            // Call the function to calculate average rating

            return {
                Title: movie.Title,
                Year: movie.Year,
                imdbID: movie.imdbID,
                Rated: movie.Rated,
                Release: movie.Release,
                Plot: movie.Plot,
                Poster: movie.Poster,
                CombinedRating: combinedRating // Include the calculated average rating
            };
        });

        // Send the response back to the client
        res.json(movies);
    } catch (error) {
        console.error('Error fetching data from OMDb:', error.message);
        res.status(500).json({ message: "An error occurred while fetching movies." });
    }
});

//route 2 search using title as a parameter 
app.get("/movies/search/:title", async (req,res)=>{
    const { title }= req.params;
   
    try {
        const response = await axios.get(`http://www.omdbapi.com/?apikey=6ab17d5&s=${encodeURIComponent(title)}`);

        console.log('API Response: ', response.data); 

        if(response.data.Search) {
            const movies = response.data.Search.map(movie => {
                const ratings = movie.Ratings || []; // Ensure ratings is an array, defaulting to empty
                const combinedRating = calculateCombinedRating(ratings); // Call the function

                return {
                    Title: movie.Title,
                    Year: movie.Year,
                    imdbID: movie.imdbID,
                    Rated: movie.Rated,
                    Release: movie.Released,
                    Plot: movie.Plot,
                    Poster: movie.Poster,
                    CombinedRating: combinedRating // Add CombinedRating to the movie object
                };
            });

            // Send the response back to the client
            res.json(movies);
        }
            else {
            res.status(404).json({ message: "No movies found" });
            
        }

    } catch(error){
        console.error("Error fetching movies", error);
        res.status(500).json({ message: "An error occurred while fetching movies." });
    }

});
//route 3 post and store a object into mongodb using parameter imbdID 
app.post("/favourites/:imdbID", async (req, res) => {
    const { imdbID } = req.params;  // Corrected variable name
    
    try {
        // Fetch movie details from OMDb API using the imdbID
        const response = await axios.get(`http://www.omdbapi.com/?apikey=6ab17d5&i=${encodeURIComponent(imdbID)}`);

        // Extract movie data from the API response
        const movie = response.data;

        // Check if the movie was found
        if (movie.Response === "False") {
            return res.status(404).json({ message: "Movie not found" });
        }

        // Movie data to be saved
        const movieData = {
            Title: movie.Title,
            Year: movie.Year,
            imdbID: movie.imdbID,
            Rated: movie.Rated,
            Released: movie.Released,
            Plot: movie.Plot,
            Poster: movie.Poster
        };

        // Insert the movie data into the MongoDB collection
        const result = await favouritesCollection.insertOne(movieData);

        // Respond with a success message and the added movie details
        res.status(201).json({ message: "Movie added to favourites", movie: movieData });
    } catch (error) {
        console.error("Error fetching movie details", error);
        res.status(500).json({ message: "An error occurred", error: error.message });
    }
});


//route 4 get all favourites 
app.get("/favourites", async (req,res) => {
try {
    const favouritesList = await favouritesCollection.find({}, {
        projection: { // Project only the required fields
            Title: 1,
            Year: 1,
            imdbID: 1,
            Rated: 1,
            Poster: 1,
            CombinedRating: 1 
        }
}).toArray();
    res.json(favouritesList);
} catch (error){
    console.error("Error fetching favourites: ", error);
    res.status(500).send("Error fetching concerts");
}
});
//route 5 Soft delete one from favourites 
app.delete("/favourites/:imdbID", async (req, res) => {
    const { imdbID } = req.params; 
   
    try {
        const result = await favouritesCollection.updateOne(
            { imdbID: imdbID }, // Assuming you are storing ObjectId as the _id
            { $set: { isDeleted: true } } // Setting the isDeleted flag to true
        );
        res.json({ message: "Movie marked as deleted", result });
    } catch (error) {
        console.error("Error deleting movie:", error);
        res.status(500).json({ error: "Failed to delete movie" });
    }
});

//calculateCombinedRating function which gets all ratings and calulates the average between them all 
function calculateCombinedRating(ratings) {
    let total = 0, count = 0;

    ratings.forEach(rating => {
        switch (rating.Source) {
            case "Internet Movie Database":
                total += parseFloat(rating.Value.split('/')[0]);
                count++;
                break;
            case "Rotten Tomatoes":
                total += parseFloat(rating.Value.replace('%', '')) / 10;
                count++;
                break;
            case "Metacritic":
                total += parseFloat(rating.Value.split('/')[0]) / 10;
                count++;
                break;
            // You can add more sources here in the future if needed
        }
    });

    return count > 0 ? (total / count).toFixed(2) : null; // Returns null if no valid ratings found
}

  
   



//connect to server on port 3000 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});