/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   EXPENSES CLOUD BRIDGE

   File:
   js/cloud/expenses-cloud.js
========================================== */

import {
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    serverTimestamp,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


const EXPENSES_KEY =
    "jufelix_v7_expenses";


let db = null;

let stopExpenses = null;


/* ==========================================
   FIREBASE READY
========================================== */

function waitForDb(
    timeout = 15000
) {

    return new Promise(
        function (
            resolve,
            reject
        ) {

            const startedAt =
                Date.now();


            function check() {

                if (
                    window.JufelixFirebase &&
                    window.JufelixFirebase.db
                ) {

                    db =
                        window.JufelixFirebase.db;

                    resolve(
                        db
                    );

                    return;
                }


                if (
                    Date.now() -
                    startedAt >
                    timeout
                ) {

                    reject(
                        new Error(
                            "Firebase database was not ready."
                        )
                    );

                    return;
                }


                setTimeout(
                    check,
                    100
                );
            }


            check();
        }
    );
}


/* ==========================================
   CLEAN DATA
========================================== */

function cleanValue(
    value
) {

    if (
        value === undefined
    ) {

        return null;
    }


    if (
        value === null ||
        typeof value !== "object"
    ) {

        return value;
    }


    if (
        Array.isArray(
            value
        )
    ) {

        return value.map(
            cleanValue
        );
    }


    const result = {};


    Object.keys(
        value
    ).forEach(
        function (
            key
        ) {

            if (
                value[key] !==
                undefined
            ) {

                result[key] =
                    cleanValue(
                        value[key]
                    );
            }
        }
    );


    return result;
}


/* ==========================================
   FIREBASE ERROR
========================================== */

function reportError(
    operation,
    error
) {

    console.error(
        "❌ Expenses Firebase error:",
        operation,
        error
    );


    if (
        error &&
        error.code ===
        "permission-denied"
    ) {

        console.error(
            "Firestore rules rejected the Expenses operation."
        );
    }
}


/* ==========================================
   SAVE / UPDATE EXPENSE
========================================== */

async function saveExpense(
    expense
) {

    try {

        const database =
            await waitForDb();


        if (
            !expense ||
            !expense.id
        ) {

            throw new Error(
                "Expense ID is missing."
            );
        }


        await setDoc(

            doc(
                database,
                "expenses",
                String(
                    expense.id
                )
            ),

            {
                ...cleanValue(
                    expense
                ),

                cloudUpdatedAt:
                    serverTimestamp()
            },

            {
                merge:
                    true
            }
        );


        console.log(
            "✅ Expense synced to Firebase:",
            expense.expenseNumber ||
            expense.id
        );


        return true;


    } catch (
        error
    ) {

        reportError(
            "SAVE EXPENSE",
            error
        );


        throw error;
    }
}


/* ==========================================
   DELETE EXPENSE
========================================== */

async function deleteExpense(
    expenseId
) {

    try {

        const database =
            await waitForDb();


        if (!expenseId) {

            throw new Error(
                "Expense ID is missing."
            );
        }


        await deleteDoc(
            doc(
                database,
                "expenses",
                String(
                    expenseId
                )
            )
        );


        console.log(
            "✅ Expense deleted from Firebase:",
            expenseId
        );


        return true;


    } catch (
        error
    ) {

        reportError(
            "DELETE EXPENSE",
            error
        );


        throw error;
    }
}


/* ==========================================
   SYNC EXISTING LOCAL EXPENSES
========================================== */

async function syncLocal() {

    await waitForDb();


    const expenses =
        readArray(
            EXPENSES_KEY
        );


    console.log(
        "☁️ Expenses waiting for cloud sync:",
        expenses.length
    );


    let successful =
        0;


    let failed =
        0;


    for (
        const expense of
        expenses
    ) {

        if (
            !expense ||
            !expense.id
        ) {

            continue;
        }


        try {

            await saveExpense(
                expense
            );


            successful++;


        } catch (
            error
        ) {

            failed++;
        }
    }


    console.log(
        "Expenses cloud sync finished:",
        {
            successful,
            failed
        }
    );


    return {
        successful,
        failed
    };
}


/* ==========================================
   REALTIME LISTENER
========================================== */

function listen(
    onChange
) {

    let cancelled =
        false;


    waitForDb()
        .then(
            function (
                database
            ) {

                if (cancelled) {
                    return;
                }


                stopExpenses =
                    onSnapshot(

                        collection(
                            database,
                            "expenses"
                        ),

                        function (
                            snapshot
                        ) {

                            const cloudExpenses =
                                snapshot.docs.map(
                                    function (
                                        item
                                    ) {

                                        return {

                                            id:
                                                item.id,

                                            ...removeCloudFields(
                                                item.data()
                                            )
                                        };
                                    }
                                );


                            const merged =
                                mergeRecords(
                                    readArray(
                                        EXPENSES_KEY
                                    ),
                                    cloudExpenses
                                );


                            saveArray(
                                EXPENSES_KEY,
                                merged
                            );


                            dispatchDataUpdated(
                                EXPENSES_KEY,
                                merged
                            );


                            if (
                                typeof onChange ===
                                "function"
                            ) {

                                onChange(
                                    merged
                                );
                            }
                        },


                        function (
                            error
                        ) {

                            reportError(
                                "EXPENSE LISTENER",
                                error
                            );
                        }
                    );
            }
        )
        .catch(
            function (
                error
            ) {

                reportError(
                    "START EXPENSE LISTENER",
                    error
                );
            }
        );


    return function () {

        cancelled =
            true;


        if (
            stopExpenses
        ) {

            stopExpenses();

            stopExpenses =
                null;
        }
    };
}


/* ==========================================
   MERGE
========================================== */

function mergeRecords(
    localRows,
    cloudRows
) {

    const map =
        new Map();


    (
        Array.isArray(
            localRows
        )
            ? localRows
            : []
    ).forEach(
        function (
            row
        ) {

            if (
                row &&
                row.id
            ) {

                map.set(
                    String(
                        row.id
                    ),

                    {
                        ...row
                    }
                );
            }
        }
    );


    (
        Array.isArray(
            cloudRows
        )
            ? cloudRows
            : []
    ).forEach(
        function (
            row
        ) {

            if (
                !row ||
                !row.id
            ) {

                return;
            }


            const id =
                String(
                    row.id
                );


            map.set(
                id,

                {
                    ...(
                        map.get(
                            id
                        ) || {}
                    ),

                    ...row,

                    id:
                        id
                }
            );
        }
    );


    return Array.from(
        map.values()
    );
}


/* ==========================================
   CLOUD FIELDS
========================================== */

function removeCloudFields(
    data
) {

    const result = {

        ...(
            data ||
            {}
        )
    };


    delete result.cloudUpdatedAt;


    return result;
}


/* ==========================================
   STORAGE
========================================== */

function readArray(
    key
) {

    try {

        const value =
            localStorage.getItem(
                key
            );


        const parsed =
            value
                ? JSON.parse(
                    value
                )
                : [];


        return Array.isArray(
            parsed
        )
            ? parsed
            : [];


    } catch (
        error
    ) {

        console.error(
            "Unable to read expenses storage:",
            error
        );


        return [];
    }
}


function saveArray(
    key,
    value
) {

    localStorage.setItem(
        key,
        JSON.stringify(
            value
        )
    );
}


/* ==========================================
   DATA EVENT
========================================== */

function dispatchDataUpdated(
    key,
    value
) {

    document.dispatchEvent(

        new CustomEvent(
            "jufelix:data-updated",

            {
                detail: {

                    key:
                        key,

                    value:
                        value
                }
            }
        )
    );
}


/* ==========================================
   PUBLIC API
========================================== */

window.JufelixExpensesCloud = {

    saveExpense:
        saveExpense,

    deleteExpense:
        deleteExpense,

    syncLocal:
        syncLocal,

    listen:
        listen
};


/* ==========================================
   READY
========================================== */

waitForDb()
    .then(
        async function () {

            console.log(
                "✅ Jufelix Expenses Cloud ready."
            );


            try {

                await syncLocal();

            } catch (
                error
            ) {

                reportError(
                    "INITIAL EXPENSE SYNC",
                    error
                );
            }


            listen(
                function (
                    records
                ) {

                    console.log(
                        "☁️ Expenses Firebase update:",
                        records.length
                    );
                }
            );
        }
    )
    .catch(
        function (
            error
        ) {

            reportError(
                "EXPENSE CLOUD STARTUP",
                error
            );
        }
    )
    .finally(
        function () {

            document.dispatchEvent(
                new CustomEvent(
                    "jufelix:expenses-cloud-ready"
                )
            );
        }
    );