const functions = require('firebase-functions');
const admin = require('firebase-admin');

const axios = require('axios');

const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin:true }));

admin.initializeApp();

const db = admin.firestore();
const usersRef = db.collection('users');
const marketRef = db.collection('market');

// APIs

// /createUser
// {
//      type: "buyer",
// }
app.post('/createUser', (req, res) => {
    admin.auth().verifyIdToken(req.token)
        .then((token) => {

            // Create a new user with doc name uid
            usersRef.doc(token.uid).set({
                type: req.type,     // Buyer or Seller
                outOrders: [],      // Outgoing orders (buyer)
                inOrders: [],       // Incoming orders (seller)
                market: [],         // Personal market (seller)
            })
                .then((r) => res.send(r));
        })
        .catch();
});

// /getUser
// Returns user information
// Check /createUser for details
app.post('/getUser', (req, res) => {
    admin.auth().verifyIdToken(req.token)
        .then((token) => {

            // Get user corresponding with the token
            res.send(usersRef.doc(token.uid).get().data())
        })
        .catch();
});

// /getMarketData
// Returns list of all available produce
// {
//      data: [{produce}, {produce}]
// }
// Check /addMarketItem for more details
app.get('/getMarketData', (req, res) => {

    // Get all documents in the market collection
    let data = [];
    marketRef.get().then((r) => {r.forEach(doc => {
        data.push(doc.data());
    })});
    res.send(data);
});

// /orderItem
// A user orders an item
// {
//      item: {produce},
// }
app.post('/orderItem', (req, res) => {
    admin.auth().verifyIdToken(req.token)
        .then((token) => {

            // Buyer updates
            let buyerOrders = usersRef.doc(token.uid).get().data().outOrders;
            buyerOrders.push(req.item);
            usersRef.doc(token.uid).update({
                orders: buyerOrders,
            });

            // Seller updates
            let sellerOrders = usersRef.doc(req.item.seller).get().data().inOrders;
            sellerOrders.push(req.item);

            usersRef.doc(req.item.seller).update({
                orders: buyerOrders,
            });

            // Send SMS confirmation through Autocode
            axios.post('https://mam156572025.api.stdlib.com/farm-fresh@dev/', {
                "number": "16472875887",
                "message": "An order has been received.",
            })
                .then(response => {
                    functions.logger.log(response);
                })
                .catch(error => {
                    console.log(error);
                });

        })
        .catch();
});

// /markOrderDone
// Seller marks order as fulfilled
app.post('/markOrderDone', (req, res) => {

});

// /addMarketItem
// Add an item to seller's market
// {
//     name: "apple",
//     price: "$9.93",
//     seller: uid,
// }
app.post('/addMarketItem', (req, res) => {
    admin.auth().verifyIdToken(req.token)
        .then((token) => {

            // Update market
            const currentMarket = usersRef.doc(token.uid).get().data().market;
            currentMarket.push(req.item);
            usersRef.doc(token.uid).update({
                market: currentMarket,
            }).then((r) => res.send(r))

        })
        .catch();
});

// Export as cloud function
exports.api = functions.https.onRequest(app);