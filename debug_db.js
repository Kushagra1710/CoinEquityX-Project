const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://s4717901_db_user:FH91zVUuTOXVhCta@cryptocluster.kv2lssl.mongodb.net/?appName=CryptoCluster";
const client = new MongoClient(uri);

async function run() {
    try {
        await client.connect();
        const database = client.db('crypto');
        const collection = database.collection('virtual_trading');

        const cursor = collection.find({});
        const docs = await cursor.toArray();

        console.log("Found", docs.length, "documents in virtual_trading:");
        docs.forEach(doc => {
            console.log("User ID:", doc._id);
            console.log("Cash:", doc.cashBalance);
            console.log("Holdings:", JSON.stringify(doc.holdings, null, 2));
            console.log("Sample Transactions (last 2):", JSON.stringify(doc.transactions ? doc.transactions.slice(0, 2) : [], null, 2));
            console.log("---------------------------------------------------");
        });
    } finally {
        await client.close();
    }
}

run().catch(console.dir);
