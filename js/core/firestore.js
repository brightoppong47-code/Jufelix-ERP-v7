import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const db = window.JufelixFirebase.db;

window.FirestoreService = {

    async add(collectionName, data) {

        return await addDoc(
            collection(db, collectionName),
            data
        );

    },

    async save(collectionName, id, data) {

        return await setDoc(
            doc(db, collectionName, id),
            data
        );

    },

    async update(collectionName, id, data) {

        return await updateDoc(
            doc(db, collectionName, id),
            data
        );

    },

    async delete(collectionName, id) {

        return await deleteDoc(
            doc(db, collectionName, id)
        );

    },

    async get(collectionName, id) {

        const snapshot =
            await getDoc(
                doc(db, collectionName, id)
            );

        if (!snapshot.exists()) {

            return null;

        }

        return {

            id: snapshot.id,

            ...snapshot.data()

        };

    },

    async getAll(collectionName) {

        const snapshot =
            await getDocs(
                collection(db, collectionName)
            );

        const data = [];

        snapshot.forEach(docItem => {

            data.push({

                id: docItem.id,

                ...docItem.data()

            });

        });

        return data;

    },

    async whereEqual(
        collectionName,
        field,
        value
    ) {

        const q = query(
            collection(db, collectionName),
            where(field, "==", value)
        );

        const snapshot =
            await getDocs(q);

        const results = [];

        snapshot.forEach(docItem => {

            results.push({

                id: docItem.id,

                ...docItem.data()

            });

        });

        return results;

    }

};