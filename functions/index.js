const functions = require('firebase-functions');
const admin = require('firebase-admin');

const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin:true }));

admin.initializeApp();

const db = admin.firestore();
const usersRef = db.collection('users');
const marketRef = db.collection('market');

// Helper Functions

// Verify ID Token
const verifyToken = (idToken) => {
    let decodedToken = false;
    admin.auth().verifyIdToken(idToken)
        .then((token) => {decodedToken = token;})
        .catch(() => {});

    console.log(decodedToken);
    if (decodedToken) {
        return decodedToken;
    } else {
        throw "Could not verify ID token";
    }
};

// APIs

// /createUser
// {
//      type: "buyer",
// }
app.post('/createUser', (req, res) => {
    admin.auth().verifyIdToken(req.token)
        .then((token) => {
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
app.post('/getUser', (req, res) => {
    admin.auth().verifyIdToken(req.token)
        .then((token) => {
            res.send(usersRef.doc(token.uid).get().data())
        })
        .catch();
});

// /getMarketData
// Returns list of all available produce
app.get('/getMarketData', (req, res) => {
    let data = [];
    marketRef.get().then((r) => {r.forEach(doc => {
        data.push(doc.data());
        res.send(data);
    })});
});

// /orderItem
// A user orders an item
app.post('/orderItem', (req, res) => {
    admin.auth().verifyIdToken(req.token)
        .then((token) => {
            usersRef.doc(token.uid).get().data();
            usersRef.doc(token.uid).update({
                orders:"",
            }).then((r) => res.send(r))
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
// }
app.post('/addMarketItem', (req, res) => {
    admin.auth().verifyIdToken(req.token)
        .then((token) => {
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