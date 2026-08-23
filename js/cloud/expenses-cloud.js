/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   AUTHENTICATED EXPENSES CLOUD BRIDGE

   File:
   js/cloud/expenses-cloud.js

   Version: 701

   + Firebase Authentication aware
   + Expense create/update sync
   + Expense delete sync
   + Realtime Firebase downloads
   + Safe local/cloud merge
   + Prevents cloud sync loops
   + APK / Acode friendly
========================================== */

import {
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    serverTimestamp,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


/* ==========================================
   STORAGE KEY
========================================== */

const EXPENSES_KEY =
    "jufelix_v7_expenses";


/* ==========================================
   STATE
========================================== */

let stopExpenses =
    null;

let listenerStarted =
    false;


/* ==========================================
   AUTHENTICATED FIREBASE READY
========================================== */

async function getFirebase() {

    /*
     * Preferred helper from:
     * js/core/firebase.js
     */

    if (
        typeof window
            .waitForJufelixFirebase ===
        "function"
    ) {

        return await window
            .waitForJufelixFirebase({

                requireUser:
                    true,

                timeout:
                    20000
            });
    }


    /*
     * Compatibility fallback.
     */

    return new Promise(
        function (
            resolve,
            reject
        ) {

            const startedAt =
                Date.now();


            function check() {

                const firebase =
                    window.JufelixFirebase;


                if (
                    firebase &&
                    firebase.error
                ) {

                    reject(
                        firebase.error
                    );

                    return;
                }


                if (
                    firebase &&
                    firebase.db &&
                    firebase.auth &&
                    firebase.auth.currentUser
                ) {

                    resolve(
                        firebase
                    );

                    return;
                }


                if (
                    Date.now() -
                    startedAt >
                    20000
                ) {

                    reject(
                        new Error(
                            "Firebase Authentication is not ready."
                        )
                    );

                    return;
                }


                window.setTimeout(
                    check,
                    100
                );
            }


            check();
        }
    );
}


/* ==========================================
   CLEAN FIRESTORE DATA
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
        typeof value !==
            "object"
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


    const result =
        {};


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
   SAVE / UPDATE EXPENSE
========================================== */

async function saveExpense(
    expense
) {

    if (
        !expense ||
        !expense.id
    ) {

        throw new Error(
            "Expense ID is missing."
        );
    }


    const firebase =
        await getFirebase();


    try {

        console.log(
            "☁️ Uploading expense:",
            expense.expenseNumber ||
            expense.id
        );


        await setDoc(

            doc(
                firebase.db,
                "expenses",
                String(
                    expense.id
                )
            ),

            {

                ...cleanValue(
                    expense
                ),

                id:
                    String(
                        expense.id
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
            "✅ EXPENSE SAVED TO FIREBASE:",
            expense.expenseNumber ||
            expense.id
        );


        document.dispatchEvent(

            new CustomEvent(
                "jufelix:expense-cloud-saved",
                {
                    detail: {

                        expense:
                            expense
                    }
                }
            )
        );


        return true;


    } catch (error) {

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

    if (!expenseId) {

        throw new Error(
            "Expense ID is missing."
        );
    }


    const firebase =
        await getFirebase();


    try {

        await deleteDoc(

            doc(
                firebase.db,
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


    } catch (error) {

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

    await getFirebase();


    const expenses =
        readArray(
            EXPENSES_KEY
        );


    console.log(
        "☁️ Expenses waiting for sync:",
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


        } catch (error) {

            failed++;
        }
    }


    console.log(
        "☁️ Expense sync completed:",
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

    if (
        listenerStarted
    ) {

        return function () {};
    }


    listenerStarted =
        true;


    let cancelled =
        false;


    getFirebase()
        .then(
            function (
                firebase
            ) {

                if (cancelled) {

                    return;
                }


                stopExpenses =
                    onSnapshot(

                        collection(
                            firebase.db,
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

                                        const data =
                                            item.data() ||
                                            {};


                                        return {

                                            ...removeCloudFields(
                                                data
                                            ),

                                            id:
                                                String(
                                                    data.id ||
                                                    item.id
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
                                merged,
                                "cloud"
                            );


                            if (
                                typeof onChange ===
                                "function"
                            ) {

                                onChange(
                                    merged
                                );
                            }


                            console.log(
                                "☁️ Expense realtime records:",
                                merged.length
                            );
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

                listenerStarted =
                    false;


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
            typeof stopExpenses ===
                "function"
        ) {

            stopExpenses();
        }


        stopExpenses =
            null;

        listenerStarted =
            false;
    };
}


/* ==========================================
   SAFE MERGE
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
                        ) ||
                        {}
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
   REMOVE CLOUD FIELDS
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


    } catch (error) {

        console.error(
            "Unable to read expenses:",
            error
        );


        return [];
    }
}


function saveArray(
    key,
    value
) {

    try {

        localStorage.setItem(
            key,
            JSON.stringify(
                value
            )
        );


        return true;


    } catch (error) {

        console.error(
            "Unable to save expenses:",
            error
        );


        return false;
    }
}


/* ==========================================
   DATA EVENT
========================================== */

function dispatchDataUpdated(
    key,
    value,
    source
) {

    document.dispatchEvent(

        new CustomEvent(
            "jufelix:data-updated",
            {
                detail: {

                    key:
                        key,

                    value:
                        value,

                    source:
                        source ||
                        ""
                }
            }
        )
    );
}


/* ==========================================
   ERROR HANDLING
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


    const code =
        String(
            error &&
            error.code ||
            ""
        );


    let message =
        error &&
        error.message
            ? error.message
            : "Firebase expense sync failed.";


    if (
        code.includes(
            "permission-denied"
        )
    ) {

        message =
            "Firebase permission denied. Check that this Firebase user has an active Firestore user profile.";
    }


    if (
        code.includes(
            "unauthenticated"
        )
    ) {

        message =
            "Firebase Authentication is not signed in.";
    }


    showErrorBox(
        operation,
        message
    );
}


/* ==========================================
   VISIBLE ERROR
========================================== */

function showErrorBox(
    operation,
    message
) {

    let box =
        document.getElementById(
            "expenseFirebaseError"
        );


    if (!box) {

        box =
            document.createElement(
                "div"
            );


        box.id =
            "expenseFirebaseError";


        box.style.position =
            "fixed";

        box.style.left =
            "12px";

        box.style.right =
            "12px";

        box.style.bottom =
            "12px";

        box.style.zIndex =
            "999999";

        box.style.padding =
            "15px";

        box.style.borderRadius =
            "10px";

        box.style.background =
            "#7f1d1d";

        box.style.color =
            "#ffffff";

        box.style.fontSize =
            "13px";

        box.style.lineHeight =
            "1.5";


        document.body.appendChild(
            box
        );
    }


    box.textContent =
        operation +
        ": " +
        message;


    window.clearTimeout(
        showErrorBox.timer
    );


    showErrorBox.timer =
        window.setTimeout(
            function () {

                if (box) {

                    box.remove();
                }
            },
            10000
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
   START
========================================== */

async function startExpensesCloud() {

    try {

        const firebase =
            await getFirebase();


        console.log(
            "✅ Expenses Firebase authenticated:",
            firebase.user
                ? (
                    firebase.user.email ||
                    firebase.user.uid
                )
                : firebase.auth.currentUser.uid
        );


        const result =
            await syncLocal();


        console.log(
            "Initial expense sync:",
            result
        );


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


    } catch (error) {

        reportError(
            "EXPENSE CLOUD STARTUP",
            error
        );
    }


    document.dispatchEvent(

        new CustomEvent(
            "jufelix:expenses-cloud-ready"
        )
    );
}


startExpensesCloud();