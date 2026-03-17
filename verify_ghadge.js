
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from 'fs';

const firebaseConfigContent = fs.readFileSync('./src/firebase.js', 'utf8');
const configMatch = firebaseConfigContent.match(/const firebaseConfig = ({[\s\S]+?});/);
const firebaseConfig = eval(`(${configMatch[1]})`);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function verifyGhadge() {
    console.log("--- Verifying Shrikant Ghadge in Database ---");
    const querySnapshot = await getDocs(collection(db, "supervisors"));

    let found = false;
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (doc.id.includes("ghadge") || (data.email && data.email.includes("ghadge")) || (data.name && data.name.includes("SHRIKANT"))) {
            found = true;
            console.log(`\nDocument ID: ${doc.id}`);
            console.log(`Name: ${data.name}`);
            console.log(`Email: ${data.email}`);
            console.log(`Full Data: ${JSON.stringify(data, null, 2)}`);
        }
    });

    if (!found) {
        console.log("\nNo record found for Shrikant Ghadge.");
    }
}

verifyGhadge().catch(console.error);
